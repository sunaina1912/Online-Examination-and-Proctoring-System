import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { saveEvidenceDataUrl } from '@/lib/evidence'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submissionId, dataUrl, kind } = await req.json()
    if (!submissionId || !dataUrl || !kind) {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }
    if (kind !== 'snapshot' && kind !== 'clip') {
      return NextResponse.json({ error: 'Invalid evidence kind' }, { status: 400 })
    }

    await dbConnect()
    const submission = await Submission.findById(submissionId).select('studentId')
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    const role = (session.user as any).role
    const userId = (session.user as any).id
    if (role === 'student' && submission.studentId?.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const saved = await saveEvidenceDataUrl({
      dataUrl,
      submissionId,
      prefix: kind,
    })

    return NextResponse.json({
      evidenceId: saved.evidenceId,
      url: saved.relativeUrl,
      mimeType: saved.mimeType,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
