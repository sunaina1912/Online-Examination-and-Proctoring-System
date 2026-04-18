import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'

let serviceDownUntil = 0
let lastFailureReason = 'uninitialized'
let healthCache: { checkedAt: number; healthy: boolean; reachable: boolean; status: string; modelStatus: string; reason?: string } = {
  checkedAt: 0,
  healthy: false,
  reachable: false,
  status: 'unknown',
  modelStatus: 'unknown',
  reason: 'boot',
}

const HEALTH_CACHE_MS = 8000
const COOLDOWN_MS = 30000

async function checkPythonHealth(serviceUrl: string) {
  const now = Date.now()
  if (now - healthCache.checkedAt < HEALTH_CACHE_MS) return healthCache

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/health`, { method: 'GET' })
    if (!response.ok) {
      healthCache = {
        checkedAt: now,
        healthy: false,
        reachable: false,
        status: 'unavailable',
        modelStatus: 'unknown',
        reason: `health_http_${response.status}`,
      }
      return healthCache
    }
    const payload = await response.json()
    const serviceStatus = String(payload?.service_status ?? payload?.status ?? 'unknown')
    const modelStatus = String(payload?.model_status ?? 'unknown')
    const healthy = serviceStatus === 'healthy'
    const reachable = serviceStatus !== 'unavailable'
    healthCache = {
      checkedAt: now,
      healthy,
      reachable,
      status: serviceStatus,
      modelStatus,
      reason: reachable ? (healthy ? undefined : 'python_health_degraded') : 'python_health_unavailable',
    }
    return healthCache
  } catch (error) {
    healthCache = {
      checkedAt: now,
      healthy: false,
      reachable: false,
      status: 'unavailable',
      modelStatus: 'unknown',
      reason: error instanceof Error ? error.name : 'health_network_error',
    }
    return healthCache
  }
}

function fallback(reason: string, status = 200) {
  return NextResponse.json(
    {
      fallbackRequired: true,
      analysis_ok: false,
      reason,
      model_status: 'unavailable',
      service_status: 'unavailable',
      last_failure_reason: reason,
      checked_at_ms: Date.now(),
      analysis_debug: {
        requestAccepted: true,
        pythonFetchAttempted: false,
        reason,
      },
    },
    { status }
  )
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceUrl = process.env.PYTHON_PROCTORING_URL?.trim()
    if (!serviceUrl) {
      return NextResponse.json({
        reachable: false,
        healthy: false,
        service_status: 'unavailable',
        model_status: 'unavailable',
        reason: 'python_url_not_configured',
      })
    }

    const health = await checkPythonHealth(serviceUrl)
    return NextResponse.json({
      reachable: health.reachable,
      healthy: health.healthy,
      service_status: health.status,
      model_status: health.modelStatus,
      reason: health.reason,
      checked_at_ms: health.checkedAt,
      last_failure_reason: lastFailureReason,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    const userId = (session.user as any).id
    const { submissionId, imageDataUrl, baselineEmbedding } = await req.json()
    const startedAt = Date.now()
    console.info('proctoring.analyze_request', { submissionId, hasImage: Boolean(imageDataUrl) })

    if (!submissionId || !imageDataUrl) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return NextResponse.json({ error: 'Invalid submissionId' }, { status: 400 })
    }

    await dbConnect()
    const submission = await Submission.findById(submissionId).select('studentId identityBaselineEmbedding')
    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    if (role === 'student' && submission.studentId?.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const serviceUrl = process.env.PYTHON_PROCTORING_URL?.trim()
    if (!serviceUrl) {
      return fallback('python_url_not_configured')
    }

    const now = Date.now()
    if (now < serviceDownUntil) {
      const cooldownHealth = await checkPythonHealth(serviceUrl)
      if (!cooldownHealth.reachable) {
        lastFailureReason = cooldownHealth.reason ?? lastFailureReason
        return fallback(lastFailureReason)
      }

      // The service recovered before the cooldown elapsed, so resume Python analysis immediately.
      serviceDownUntil = 0
      lastFailureReason = 'recovered'
    }

    const health = await checkPythonHealth(serviceUrl)
    if (!health.reachable) {
      serviceDownUntil = Date.now() + COOLDOWN_MS
      lastFailureReason = health.reason ?? 'python_health_unavailable'
      return NextResponse.json({
        fallbackRequired: true,
        analysis_ok: false,
        reason: lastFailureReason,
        model_status: health.modelStatus,
        service_status: health.status,
        analysis_debug: {
          requestAccepted: true,
          pythonFetchAttempted: false,
          healthStatus: health.status,
          elapsedMs: Date.now() - startedAt,
        },
      })
    }

    const timeoutMs = Number(process.env.PYTHON_PROCTORING_TIMEOUT_MS ?? 15000)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 2500)

    try {
      const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          image_data_url: imageDataUrl,
          baseline_embedding:
            (Array.isArray(baselineEmbedding) && baselineEmbedding.length > 0
              ? baselineEmbedding
              : submission.identityBaselineEmbedding) ?? null,
        }),
      })

      if (!response.ok) {
        serviceDownUntil = Date.now() + COOLDOWN_MS
        lastFailureReason = `python_http_${response.status}`
        return fallback(lastFailureReason)
      }

      const payload = await response.json()
      console.info('proctoring.analyze_response', {
        submissionId,
        pythonStatus: response.status,
        analysisOk: payload?.analysis_ok,
        elapsedMs: Date.now() - startedAt,
      })
      const serviceStatus = String(payload?.service_status ?? health.status ?? 'healthy')
      const modelStatus = String(payload?.model_status ?? health.modelStatus)
      const fallbackRequired = serviceStatus === 'unavailable'
      if (!fallbackRequired && Array.isArray(payload?.embedding) && payload.embedding.length > 0 && !(submission.identityBaselineEmbedding?.length ?? 0)) {
        await Submission.updateOne(
          { _id: submissionId },
          {
            $set: {
              identityBaselineEmbedding: payload.embedding,
              identityBaselineCapturedAt: new Date(),
            },
          }
        )
      }
      if (fallbackRequired) {
        serviceDownUntil = Date.now() + COOLDOWN_MS
        lastFailureReason = 'python_analyze_unavailable'
      } else {
        serviceDownUntil = 0
        lastFailureReason = 'healthy'
      }
      return NextResponse.json({
        fallbackRequired,
        reason: fallbackRequired ? lastFailureReason : undefined,
        ...payload,
        analysis_ok: Boolean(payload?.analysis_ok ?? true),
        service_status: serviceStatus,
        model_status: modelStatus,
        last_failure_reason: fallbackRequired ? lastFailureReason : undefined,
        checked_at_ms: Date.now(),
        analysis_debug: {
          requestAccepted: true,
          pythonFetchAttempted: true,
          pythonResponseOk: response.ok,
          healthStatus: health.status,
          elapsedMs: Date.now() - startedAt,
        },
      })
    } catch (error) {
      serviceDownUntil = Date.now() + COOLDOWN_MS
      lastFailureReason = error instanceof Error ? error.name : 'python_request_failed'
      return fallback(lastFailureReason)
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
