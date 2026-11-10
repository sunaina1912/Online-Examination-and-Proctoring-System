'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { AlertTriangle, Camera, CheckCircle2, FileSearch, ScanFace, ShieldCheck, Upload } from 'lucide-react'

type VerificationResponse = {
  verification_status: string
  confidence: number
  face_match_distance?: number | null
  live_face_detected: boolean
  license_face_detected: boolean
  extracted_license_data: Record<string, string | null>
  raw_ocr_text: string
  liveness_score: number
  liveness_status: string
  module_outputs: Record<string, any>
  latency_ms: number
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function statusTone(status: string) {
  if (status === 'verified' || status === 'matched' || status === 'ok' || status === 'live') {
    return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
  }
  if (status === 'failed' || status === 'mismatch' || status === 'spoof_suspected') {
    return 'border-rose-400/30 bg-rose-500/10 text-rose-200'
  }
  return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
}

export default function LicenseAuthenticationPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [facePreview, setFacePreview] = useState<string | null>(null)
  const [licensePreview, setLicensePreview] = useState<string | null>(null)
  const [result, setResult] = useState<VerificationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setCameraOn(true)
      setFacePreview(null)
    } catch (cameraError) {
      setError(cameraError instanceof Error ? cameraError.message : 'Unable to access camera.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  const captureFace = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera feed is not ready yet.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Unable to capture the live face image.')
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    setFacePreview(canvas.toDataURL('image/jpeg', 0.92))
  }

  const handleFaceUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFacePreview(await fileToDataUrl(file))
  }

  const handleLicenseUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setLicensePreview(await fileToDataUrl(file))
  }

  const runVerification = async () => {
    if (!facePreview || !licensePreview) {
      setError('Please provide both the live face image and the driving license image.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/license-auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceImageDataUrl: facePreview,
          licenseImageDataUrl: licensePreview,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload?.error || 'Verification failed.')
        return
      }
      setResult(payload as VerificationResponse)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  const modules = result?.module_outputs
    ? [
        ['Input Module', result.module_outputs.input_module],
        ['Preprocessing Module', result.module_outputs.preprocessing_module],
        ['Face Recognition Module', result.module_outputs.face_recognition_module],
        ['OCR Module', result.module_outputs.ocr_module],
        ['Liveness Module', result.module_outputs.liveness_module],
      ]
    : []

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#14213d_0%,#0a0f1f_45%,#05070d_100%)] text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Deep Learning Driver License Authentication
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              Hybrid facial verification with OCR and liveness analysis
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              This flow implements the requested project modules: input capture, preprocessing, face recognition,
              OCR-based data extraction, and liveness detection in one pipeline.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
          >
            Back to Home
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <Camera className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold">Input Module</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-100">Live Face Input</p>
                  <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                    {facePreview ? (
                      <img src={facePreview} alt="Captured face" className="h-full w-full object-cover" />
                    ) : (
                      <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {!cameraOn ? (
                      <button
                        onClick={startCamera}
                        className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                      >
                        Start Camera
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={captureFace}
                          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                        >
                          Capture Face
                        </button>
                        <button
                          onClick={stopCamera}
                          className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:border-white/30"
                        >
                          Stop Camera
                        </button>
                      </>
                    )}
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:border-white/30">
                      <Upload className="h-4 w-4" />
                      Upload Face
                      <input type="file" accept="image/*" className="hidden" onChange={handleFaceUpload} />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-100">Driving License Input</p>
                  <div className="aspect-video overflow-hidden rounded-2xl border border-dashed border-white/15 bg-slate-900">
                    {licensePreview ? (
                      <img src={licensePreview} alt="Driving license preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                        Upload the front side of the driving license for OCR and face comparison.
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-orange-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-200">
                      <Upload className="h-4 w-4" />
                      Upload License
                      <input type="file" accept="image/*" className="hidden" onChange={handleLicenseUpload} />
                    </label>
                    <button
                      onClick={runVerification}
                      disabled={loading}
                      className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Running Modules...' : 'Verify License'}
                    </button>
                  </div>
                  {error ? (
                    <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: ScanFace,
                  title: 'Face Recognition',
                  text: 'Compares live face embeddings with the portrait detected on the license.',
                },
                {
                  icon: FileSearch,
                  title: 'OCR Extraction',
                  text: 'Extracts license number, holder name, date of birth, address, and validity.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Liveness Detection',
                  text: 'Scores blur, facial texture, eye openness, and landmark consistency signals.',
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                  <Icon className="mb-3 h-5 w-5 text-cyan-300" />
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <p className="mb-3 text-sm uppercase tracking-[0.22em] text-slate-400">Verification Summary</p>
              {result ? (
                <>
                  <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${statusTone(result.verification_status)}`}>
                    {result.verification_status.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Confidence</p>
                      <p className="mt-2 text-3xl font-semibold">{Math.round(result.confidence * 100)}%</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Latency</p>
                      <p className="mt-2 text-3xl font-semibold">{result.latency_ms} ms</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Face Distance</p>
                      <p className="mt-2 text-3xl font-semibold">
                        {typeof result.face_match_distance === 'number' ? result.face_match_distance.toFixed(3) : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Liveness</p>
                      <p className="mt-2 text-3xl font-semibold">{Math.round(result.liveness_score * 100)}%</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/35 p-6 text-sm leading-6 text-slate-300">
                  Run the verification flow to see each module’s output and the final authentication decision.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
              <p className="mb-4 text-sm uppercase tracking-[0.22em] text-slate-400">Extracted License Data</p>
              {result ? (
                <div className="space-y-3">
                  {Object.entries(result.extracted_license_data).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                      <span className="text-sm capitalize text-slate-400">{key.replace(/_/g, ' ')}</span>
                      <span className="max-w-[60%] text-right text-sm text-slate-100">{value || 'Not detected'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-300">OCR output will appear here after verification.</p>
              )}
            </div>
          </div>
        </div>

        {result ? (
          <section className="mt-8 space-y-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-semibold">Module-by-Module Output</h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {modules.map(([label, data]) => (
                <div key={label} className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{label}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(String(data?.status ?? 'review_required'))}`}>
                      {String(data?.status ?? 'review_required')}
                    </span>
                  </div>
                  <pre className="overflow-auto rounded-2xl bg-slate-950/55 p-4 text-xs leading-6 text-slate-200">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                OCR Raw Text
              </div>
              <pre className="overflow-auto rounded-2xl bg-slate-950/55 p-4 text-xs leading-6 text-slate-200">
                {result.raw_ocr_text || 'OCR engine did not return text. Install Tesseract in the Python environment to enable full text extraction.'}
              </pre>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  )
}
