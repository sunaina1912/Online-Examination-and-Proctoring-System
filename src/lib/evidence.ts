import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const EVIDENCE_DIR = path.join(PUBLIC_DIR, 'evidence')

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

function safeSegment(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
}

export async function saveEvidenceDataUrl(options: {
  dataUrl: string
  submissionId: string
  prefix: 'snapshot' | 'clip'
}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.CLOUDINARY_UNSIGNED_UPLOAD_PRESET
  const folder = `proctorx/${safeSegment(options.submissionId)}`

  if (cloudName && uploadPreset) {
    const formData = new FormData()
    formData.append('file', options.dataUrl)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', folder)

    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const payload = await response.json()
      return {
        mimeType: payload.resource_type === 'video' ? payload.format ? `video/${payload.format}` : 'video/webm' : payload.format ? `image/${payload.format}` : 'image/jpeg',
        relativeUrl: payload.secure_url as string,
      }
    }
  }

  const { mimeType, extension, buffer } = parseDataUrl(options.dataUrl)
  const localFolder = path.join(EVIDENCE_DIR, safeSegment(options.submissionId))
  await mkdir(localFolder, { recursive: true })

  const filename = `${options.prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const outputPath = path.join(localFolder, filename)
  await writeFile(outputPath, buffer)

  return {
    mimeType,
    relativeUrl: `/evidence/${safeSegment(options.submissionId)}/${filename}`,
  }
}
