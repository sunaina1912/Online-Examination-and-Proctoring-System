import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const MODEL_BASE = 'https://justadudewhohacks.github.io/face-api.js/models'
const TARGET_DIR = path.join(process.cwd(), 'public', 'models')

const MODEL_FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_tiny_model-weights_manifest.json',
  'face_landmark_68_tiny_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
]

async function downloadFile(filename) {
  const url = `${MODEL_BASE}/${filename}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed downloading ${filename}: ${response.status} ${response.statusText}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(path.join(TARGET_DIR, filename), buffer)
  console.log(`Saved ${filename}`)
}

async function main() {
  await mkdir(TARGET_DIR, { recursive: true })
  for (const file of MODEL_FILES) {
    await downloadFile(file)
  }
  console.log(`Face models ready at ${TARGET_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
