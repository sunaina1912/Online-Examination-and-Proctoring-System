import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import EvidenceBlob from '@/models/EvidenceBlob'
import Submission from '@/models/Submission'

function toArrayBuffer(buffer: Buffer) {
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(buffer)
  return copy.buffer
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await dbConnect()
    const blob = await EvidenceBlob.findById(params.id).select('+data submissionId mimeType sizeBytes')
    if (!blob) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const role = (session.user as any).role
    const userId = (session.user as any).id

    if (role === 'student') {
      const submission = await Submission.findById(blob.submissionId).select('studentId')
      if (!submission || submission.studentId.toString() !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const totalSize = blob.sizeBytes || blob.data.length
    const rangeHeader = req.headers.get('range')

    if (rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader)
      if (!match) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${totalSize}` },
        })
      }

      const start = match[1] ? Number(match[1]) : 0
      const end = match[2] ? Number(match[2]) : totalSize - 1
      if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end >= totalSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${totalSize}` },
        })
      }

      const chunk = blob.data.subarray(start, end + 1)
      return new NextResponse(toArrayBuffer(chunk), {
        status: 206,
        headers: {
          'Content-Type': blob.mimeType,
          'Content-Length': String(chunk.length),
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'private, max-age=60',
        },
      })
    }

    return new NextResponse(toArrayBuffer(blob.data), {
      status: 200,
      headers: {
        'Content-Type': blob.mimeType,
        'Content-Length': String(totalSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=60',
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
