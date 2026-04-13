import mongoose from 'mongoose'
import dbConnect from '@/lib/db'
import EvidenceBlob from '@/models/EvidenceBlob'

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid data URL')
  }

  const mimeType = match[1]
  const base64 = match[2]
  const extension = mimeType.split('/')[1]?.split(';')[0] ?? 'bin'
  return {
    mimeType,
    extension,
    buffer: Buffer.from(base64, 'base64'),
  }
}

export async function saveEvidenceDataUrl(options: {
  dataUrl: string
  submissionId: string
  prefix: 'snapshot' | 'clip'
}) {
  await dbConnect()
  const { mimeType, buffer } = parseDataUrl(options.dataUrl)

  const doc = await EvidenceBlob.create({
    submissionId: new mongoose.Types.ObjectId(options.submissionId),
    kind: options.prefix,
    mimeType,
    sizeBytes: buffer.length,
    data: buffer,
  })

  return {
    evidenceId: doc._id.toString(),
    mimeType,
    relativeUrl: `/api/evidence/${doc._id.toString()}`,
  }
}
