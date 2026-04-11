import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'

const RISK_WEIGHTS: Record<string, number> = {
  face_missing:    10,
  multiple_faces:  20,
  tab_switch:      15,
  audio_detected:  8,
  eye_gaze:        5,
  mobile_detected: 25,
  print_screen: 20,
  devtools_shortcut: 12,
  network_change: 8,
  identity_unverified: 25,
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { submissionId, event, sessionMetrics, snapshot, recordingClip } = await req.json()
    await dbConnect()

    const submission = await Submission.findById(submissionId).select('proctoringEvents')
    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    const nextEvents = [
      ...(submission.proctoringEvents ?? []),
      ...(event?.type ? [{ ...event, timestamp: new Date() }] : []),
    ]

    const totalRisk = nextEvents.reduce((acc: number, currentEvent: any) => {
      return acc + (RISK_WEIGHTS[currentEvent.type] ?? 5)
    }, 0)
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

    if (sessionMetrics) {
      update.$set = {
        ...update.$set,
        ...Object.fromEntries(
          Object.entries(sessionMetrics).map(([key, value]) => [`sessionMetrics.${key}`, value])
        ),
      }
    }

    if (event?.type) {
      update.$push = {
        ...(update.$push ?? {}),
        proctoringEvents: {
          $each: [{ ...event, timestamp: new Date() }],
        },
      }
    }

    const snapshotPushes = []
    if (event?.evidenceImage) {
      snapshotPushes.push({
        type: 'incident',
        timestamp: new Date(),
        imageUrl: event.evidenceImage,
        details: event.details ?? event.type,
      })
    }
    if (snapshot?.imageUrl) {
      snapshotPushes.push({
        type: snapshot.type ?? 'interval',
        timestamp: new Date(),
        imageUrl: snapshot.imageUrl,
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

    if (recordingClip?.clipUrl) {
      update.$push = {
        ...(update.$push ?? {}),
        recordingClips: {
          $each: [{
            timestamp: new Date(),
            mimeType: recordingClip.mimeType ?? 'video/webm',
            clipUrl: recordingClip.clipUrl,
            durationMs: recordingClip.durationMs ?? 0,
          }],
          $slice: -5,
        },
      }
    }

    await Submission.updateOne({ _id: submissionId }, update)

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
