import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (role !== 'admin' && role !== 'examiner') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await dbConnect()

    const activeSubmissions = await Submission.find({ status: 'in_progress' })
      .populate('studentId', 'name email')
      .populate('examId', 'title duration')
      .sort({ startedAt: -1 })
      .limit(12)

    return NextResponse.json({
      sessions: activeSubmissions.map((submission: any) => ({
        id: submission._id,
        startedAt: submission.startedAt,
        riskScore: submission.riskScore ?? 0,
        student: submission.studentId,
        exam: submission.examId,
        latestEvent: submission.proctoringEvents?.[submission.proctoringEvents.length - 1] ?? null,
        pythonServiceStatus: submission.sessionMetrics?.pythonServiceStatus ?? 'unknown',
        pythonAnalyzeStatus: submission.sessionMetrics?.pythonAnalyzeStatus ?? 'unknown',
        detectorMode: submission.sessionMetrics?.detectorMode ?? 'browser_fallback',
        lastAnalyzeAt: submission.sessionMetrics?.pythonLastAnalyzeAt ?? null,
        lastAnalyzeSuccessAt: submission.sessionMetrics?.pythonLastAnalyzeSuccessAt ?? null,
        lastAnalyzeFailureReason: submission.sessionMetrics?.pythonLastAnalyzeFailureReason ?? '',
        lastSnapshotCapturedAt: submission.sessionMetrics?.lastSnapshotCapturedAt ?? null,
        evidenceCount: submission.evidenceSnapshots?.length ?? 0,
        recordingClipCount: submission.recordingClips?.length ?? 0,
      })),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
