import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'

const RISK_WEIGHTS: Record<string, number> = {
  face_missing:    12,
  multiple_faces:  24,
  tab_switch:      15,
  audio_detected:  10,
  eye_gaze:        7,
  mobile_detected: 28,
  print_screen: 22,
  devtools_shortcut: 12,
  network_change: 6,
  identity_unverified: 30,
}

const SESSION_METRIC_KEYS = new Set([
  'fullscreenViolations',
  'deviceChanges',
  'networkDisconnects',
  'recordingSupported',
  'audioMonitoringActive',
  'pythonServiceStatus',
  'pythonAnalyzeStatus',
  'pythonModelStatus',
  'pythonLastLatencyMs',
  'pythonFallbackActive',
  'invalidClipsDropped',
  'pythonLastSuccessAt',
  'pythonLastFailureReason',
  'pythonLastAnalyzeAt',
  'pythonLastAnalyzeSuccessAt',
  'pythonLastAnalyzeFailureReason',
  'pythonAnalyzeAttempts',
  'pythonAnalyzeSuccessCount',
  'pythonAnalyzeFailureCount',
  'lastSnapshotCapturedAt',
  'lastSnapshotCaptureFailedReason',
  'secureBrowserMode',
  'secureBrowserTrust',
  'detectorMode',
])

const PYTHON_STATUS_VALUES = new Set(['healthy', 'degraded', 'unavailable'])
const SECURE_BROWSER_MODE_VALUES = new Set(['seb', 'standard'])
const SECURE_BROWSER_TRUST_VALUES = new Set(['high', 'reduced'])
const DETECTOR_MODE_VALUES = new Set(['python_primary', 'browser_fallback'])

let pythonEventForwardDownUntil = 0
let pythonEventForwardLastError = ''
const eventCooldowns = new Map<string, number>()

function scoreEvent(event: any) {
  const base = RISK_WEIGHTS[event?.type] ?? 5
  const confidence = typeof event?.confidence === 'number' ? Math.max(0, Math.min(1, event.confidence)) : null
  if (confidence === null) return base
  // Hysteresis: low-confidence detections contribute less to cumulative risk.
  if (confidence < 0.45) return Math.round(base * 0.5)
  if (confidence < 0.7) return Math.round(base * 0.8)
  return base
}

function normalizeEvent(event: any) {
  if (!event?.type) return null
  return {
    type: event.type,
    severity: ['low', 'medium', 'high'].includes(event.severity) ? event.severity : 'medium',
    details: typeof event.details === 'string' ? event.details : '',
    timestamp: new Date(),
    evidenceImage: event.evidenceImage,
    evidenceId: event.evidenceId,
    source: event.source === 'python' ? 'python' : 'browser',
    confidence:
      typeof event.confidence === 'number'
        ? Math.max(0, Math.min(1, event.confidence))
        : undefined,
    detectorDetails: event.detectorDetails
      ? {
          sourceMode:
            event.detectorDetails.sourceMode === 'python_primary' ? 'python_primary' : 'browser_fallback',
          mobileConfidence:
            typeof event.detectorDetails.mobileConfidence === 'number' ? event.detectorDetails.mobileConfidence : undefined,
          faceCount: typeof event.detectorDetails.faceCount === 'number' ? event.detectorDetails.faceCount : undefined,
          gazeScore: typeof event.detectorDetails.gazeScore === 'number' ? event.detectorDetails.gazeScore : undefined,
          identityDistance:
            typeof event.detectorDetails.identityDistance === 'number' ? event.detectorDetails.identityDistance : undefined,
          detector: typeof event.detectorDetails.detector === 'string' ? event.detectorDetails.detector : undefined,
          reason: typeof event.detectorDetails.reason === 'string' ? event.detectorDetails.reason : undefined,
        }
      : undefined,
  }
}

function normalizeSessionMetrics(sessionMetrics: any) {
  if (!sessionMetrics || typeof sessionMetrics !== 'object') return {}

  return Object.fromEntries(
    Object.entries(sessionMetrics)
      .filter(([key]) => SESSION_METRIC_KEYS.has(key))
      .map(([key, value]) => {
        if (key === 'pythonServiceStatus' || key === 'pythonAnalyzeStatus') {
          return [key, PYTHON_STATUS_VALUES.has(String(value)) ? value : 'unavailable']
        }
        if (key === 'secureBrowserMode') {
          return [key, SECURE_BROWSER_MODE_VALUES.has(String(value)) ? value : 'standard']
        }
        if (key === 'secureBrowserTrust') {
          return [key, SECURE_BROWSER_TRUST_VALUES.has(String(value)) ? value : 'reduced']
        }
        if (key === 'detectorMode') {
          return [key, DETECTOR_MODE_VALUES.has(String(value)) ? value : 'browser_fallback']
        }
        return [key, value]
      })
  )
}

function shouldAcceptEvent(submissionId: string, event: any) {
  if (!event?.type) return false
  const cooldownMs =
    event.type === 'audio_detected'
      ? 12000
      : event.type === 'eye_gaze'
      ? 8000
      : 5000
  const key = `${submissionId}:${event.type}`
  const now = Date.now()
  const previous = eventCooldowns.get(key) ?? 0
  if (now - previous < cooldownMs) return false
  eventCooldowns.set(key, now)
  return true
}

async function forwardPayloadToPython(payload: {
  submissionId: string
  event?: any
  sessionMetrics?: any
  snapshot?: any
  recordingClip?: any
}) {
  if (!payload.event?.type) return

  const serviceUrl = process.env.PYTHON_PROCTORING_URL?.trim()
  if (!serviceUrl) return
  if (Date.now() < pythonEventForwardDownUntil) return

  const timeoutMs = Number(process.env.PYTHON_PROCTORING_TIMEOUT_MS ?? 2500)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? Math.min(timeoutMs, 1500) : 1500)

  try {
    await fetch(`${serviceUrl.replace(/\/$/, '')}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...payload,
        forwardedAt: new Date().toISOString(),
      }),
    })
    pythonEventForwardDownUntil = 0
    pythonEventForwardLastError = ''
  } catch (error) {
    pythonEventForwardDownUntil = Date.now() + 30000
    pythonEventForwardLastError = error instanceof Error ? error.message : 'unknown_error'
    console.warn(`Python event forwarding unavailable for 30s: ${pythonEventForwardLastError}`)
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { submissionId, event, sessionMetrics, snapshot, recordingClip } = await req.json()
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return NextResponse.json({ error: 'Invalid submissionId' }, { status: 400 })
    }

    await dbConnect()

    const submission = await Submission.findById(submissionId).select('proctoringEvents studentId')
    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    const role = (session.user as any).role
    const userId = (session.user as any).id
    if (role === 'student' && submission.studentId?.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const normalizedEvent = normalizeEvent(event)
    const acceptedEvent = normalizedEvent && shouldAcceptEvent(submissionId, normalizedEvent) ? normalizedEvent : null

    const nextEvents = [
      ...(submission.proctoringEvents ?? []),
      ...(acceptedEvent ? [acceptedEvent] : []),
    ]

    const totalRisk = nextEvents.reduce((acc: number, currentEvent: any) => acc + scoreEvent(currentEvent), 0)
    const riskScore = Math.min(100, totalRisk)
    const status = riskScore >= 80 ? 'flagged' : undefined

    const update: Record<string, any> = {
      $set: {
        riskScore,
      },
    }

    if (status) {
      update.$set.status = status
    }

    const normalizedSessionMetrics = normalizeSessionMetrics(sessionMetrics)

    if (Object.keys(normalizedSessionMetrics).length > 0) {
      update.$set = {
        ...update.$set,
        ...Object.fromEntries(
          Object.entries(normalizedSessionMetrics).map(([key, value]) => [`sessionMetrics.${key}`, value])
        ),
      }
    }

    if (acceptedEvent) {
      update.$push = {
        ...(update.$push ?? {}),
        proctoringEvents: {
          $each: [acceptedEvent],
        },
      }
    }

    const snapshotPushes = []
    if (acceptedEvent?.evidenceImage) {
      snapshotPushes.push({
        type: 'incident',
        timestamp: new Date(),
        imageUrl: acceptedEvent.evidenceImage,
        evidenceId: acceptedEvent.evidenceId,
        details: acceptedEvent.details ?? acceptedEvent.type,
      })
    }
    if (snapshot?.imageUrl) {
      snapshotPushes.push({
        type: snapshot.type ?? 'interval',
        timestamp: new Date(),
        imageUrl: snapshot.imageUrl,
        evidenceId: snapshot.evidenceId,
        details: snapshot.details ?? 'Snapshot captured',
      })
    }
    if (snapshotPushes.length > 0) {
      update.$push = {
        ...(update.$push ?? {}),
        evidenceSnapshots: {
          $each: snapshotPushes,
          $slice: -30,
        },
      }
    }
    if (snapshot?.type === 'identity' && snapshot?.evidenceId) {
      update.$set = {
        ...update.$set,
        identityBaselineEvidenceId: snapshot.evidenceId,
      }
    }

    const hasValidRecordingClip =
      Boolean(recordingClip?.clipUrl) &&
      Boolean(recordingClip?.evidenceId) &&
      typeof recordingClip?.mimeType === 'string' &&
      recordingClip.mimeType.length > 0 &&
      (recordingClip.durationMs ?? 0) >= 1000

    if (hasValidRecordingClip) {
      update.$push = {
        ...(update.$push ?? {}),
        recordingClips: {
          $each: [{
            timestamp: new Date(),
            mimeType: recordingClip.mimeType ?? 'video/webm',
            clipUrl: recordingClip.clipUrl,
            evidenceId: recordingClip.evidenceId,
            durationMs: recordingClip.durationMs ?? 0,
          }],
          $slice: -5,
        },
      }
    }

    await Submission.updateOne({ _id: submissionId }, update)

    await forwardPayloadToPython({
      submissionId,
      event: acceptedEvent,
      sessionMetrics: normalizedSessionMetrics,
      snapshot,
      recordingClip,
    })

    return NextResponse.json({
      riskScore,
      status: status ?? 'submitted',
      evidenceCount: snapshotPushes.length,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
