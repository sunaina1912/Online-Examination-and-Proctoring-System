import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { saveEvidenceDataUrl } from '@/lib/evidence'

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

    const saved = await saveEvidenceDataUrl({
      dataUrl,
      submissionId,
      prefix: kind === 'clip' ? 'clip' : 'snapshot',
    })

    return NextResponse.json({
      url: saved.relativeUrl,
      mimeType: saved.mimeType,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
