'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

export type ProctoringEventType =
  | 'face_missing'
  | 'multiple_faces'
  | 'tab_switch'
  | 'audio_detected'
  | 'eye_gaze'
  | 'mobile_detected'
  | 'print_screen'
  | 'devtools_shortcut'
  | 'network_change'
  | 'identity_unverified'

export interface ProctoringEvent {
  type: ProctoringEventType
  severity: 'low' | 'medium' | 'high'
  details: string
  timestamp: Date
  evidenceImage?: string
  evidenceId?: string
  source?: 'python' | 'browser'
  confidence?: number
  detectorDetails?: {
    sourceMode?: 'python_primary' | 'browser_fallback'
    mobileConfidence?: number
    faceCount?: number
    gazeScore?: number
    identityDistance?: number
    analysisTickId?: string
    snapshotCaptured?: boolean
    pythonAnalyzeStatus?: 'healthy' | 'degraded' | 'unavailable'
    detector?: string
    reason?: string
  }
}

interface SessionMetrics {
  fullscreenViolations: number
  deviceChanges: number
  networkDisconnects: number
  recordingSupported: boolean
  audioMonitoringActive: boolean
  pythonServiceStatus: 'healthy' | 'degraded' | 'unavailable'
  pythonAnalyzeStatus: 'idle' | 'healthy' | 'degraded' | 'unavailable'
  pythonModelStatus: string
  pythonLastLatencyMs: number
  pythonFallbackActive: boolean
  invalidClipsDropped: number
  pythonLastSuccessAt?: string
  pythonLastFailureReason?: string
  pythonLastAnalyzeAt?: string
  pythonLastAnalyzeSuccessAt?: string
  pythonLastAnalyzeFailureReason?: string
  pythonAnalyzeAttempts: number
  pythonAnalyzeSuccessCount: number
  pythonAnalyzeFailureCount: number
  lastSnapshotCapturedAt?: string
  lastSnapshotCaptureFailedReason?: string
  secureBrowserMode: 'seb' | 'standard'
  secureBrowserTrust: 'high' | 'reduced'
  detectorMode: 'python_primary' | 'browser_fallback'
}

interface StoredSnapshotPayload {
  type: 'identity' | 'incident' | 'interval'
  imageUrl: string
  evidenceId?: string
  details: string
}

interface PythonAnalysisPayload {
  fallbackRequired: boolean
  analysis_ok?: boolean
  reason?: string
  model_status?: string
  service_status?: 'healthy' | 'degraded' | 'unavailable' | string
  latency_ms?: number
  faces_count?: number
  identity_distance?: number | null
  gaze_offscreen_score?: number
  mobile_detected?: boolean
  mobile_confidence?: number
  embedding?: number[] | null
  detector_details?: Record<string, string | number | boolean | null | undefined>
  checked_at_ms?: number
  last_failure_reason?: string
}

interface PythonHealthPayload {
  reachable?: boolean
  healthy?: boolean
  reason?: string
  model_status?: string
  service_status?: 'healthy' | 'degraded' | 'unavailable' | string
  checked_at_ms?: number
  last_failure_reason?: string
}

interface UseProctoringOptions {
  submissionId: string
  onEvent?: (event: ProctoringEvent) => void
  onFlagged?: () => void
  enabled?: boolean
}

const INITIAL_METRICS: SessionMetrics = {
  fullscreenViolations: 0,
  deviceChanges: 0,
  networkDisconnects: 0,
  recordingSupported: false,
  audioMonitoringActive: false,
  pythonServiceStatus: 'unavailable',
  pythonAnalyzeStatus: 'idle',
  pythonModelStatus: '',
  pythonLastLatencyMs: 0,
  pythonFallbackActive: false,
  invalidClipsDropped: 0,
  pythonLastSuccessAt: '',
  pythonLastFailureReason: '',
  pythonLastAnalyzeAt: '',
  pythonLastAnalyzeSuccessAt: '',
  pythonLastAnalyzeFailureReason: '',
  pythonAnalyzeAttempts: 0,
  pythonAnalyzeSuccessCount: 0,
  pythonAnalyzeFailureCount: 0,
  lastSnapshotCapturedAt: '',
  lastSnapshotCaptureFailedReason: '',
  secureBrowserMode: 'standard',
  secureBrowserTrust: 'reduced',
  detectorMode: 'browser_fallback',
}
const MIN_CLIP_DURATION_MS = 1200
const MIN_CLIP_SIZE_BYTES = 24 * 1024
const CLIP_SEGMENT_MS = 15000
const ANALYZE_INTERVAL_MS = 2500
const SNAPSHOT_FAILURE_THRESHOLD = 5
const PYTHON_ANALYZE_FAILURE_THRESHOLD = 3

export function useProctoring({
  submissionId,
  onEvent,
  onFlagged,
  enabled = true,
}: UseProctoringOptions) {
  const [riskScore, setRiskScore] = useState(0)
  const [status, setStatus] = useState<'clean' | 'warning' | 'flagged'>('clean')
  const [events, setEvents] = useState<ProctoringEvent[]>([])
  const [camActive, setCamActive] = useState(false)
  const [recorderSupported, setRecorderSupported] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() =>
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : true
  )
  const [sessionMetrics, setSessionMetrics] = useState(INITIAL_METRICS)
  const [identitySnapshot, setIdentitySnapshot] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const initialDevicesRef = useRef<string>('')
  const detectorRef = useRef<any>(null)
  const objectDetectorRef = useRef<any>(null)
  const objectDetectorLoadingRef = useRef(false)
  const faceApiRef = useRef<any>(null)
  const baselineEmbeddingRef = useRef<number[] | null>(null)
  const baselineDescriptorRef = useRef<Float32Array | null>(null)
  const faceDetectionUnavailableLoggedRef = useRef(false)
  const objectDetectionUnavailableLoggedRef = useRef(false)
  const backendOutageLoggedRef = useRef(false)
  const pythonFallbackActiveRef = useRef(false)
  const pythonFallbackReasonRef = useRef<string>('unknown')
  const hysteresisRef = useRef<Record<string, number>>({})
  const faceModelsReadyRef = useRef(false)
  const recordingRef = useRef<MediaRecorder | null>(null)
  const recordingRotateRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingCycleStartedAtRef = useRef<number>(0)
  const recordingEnabledRef = useRef(false)
  const identityLoggedRef = useRef(false)
  const clipStartedAtRef = useRef<number | null>(null)
  const lastEventAtRef = useRef<Record<string, number>>({})
  const audioSpeechStreakRef = useRef(0)
  const speechRecognitionRef = useRef<any>(null)
  const speechRecognitionActiveRef = useRef(false)
  const snapshotFailureCountRef = useRef(0)
  const pythonAnalyzeFailureStreakRef = useRef(0)
  const analyzeRequestInFlightRef = useRef(false)
  const sessionMetricsRef = useRef(INITIAL_METRICS)
  const recorderShouldFinalizeRef = useRef(true)

  useEffect(() => {
    sessionMetricsRef.current = sessionMetrics
  }, [sessionMetrics])

  const updateMetrics = useCallback((patch: Partial<SessionMetrics> | ((prev: SessionMetrics) => Partial<SessionMetrics>)) => {
    setSessionMetrics((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }))
  }, [])

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current
    if (!video) return null
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null

    const canvas = document.createElement('canvas')
    const targetWidth = Math.min(720, video.videoWidth || 720)
    canvas.width = targetWidth
    canvas.height = Math.round((video.videoHeight / Math.max(video.videoWidth, 1)) * targetWidth)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.78)
  }, [])

  const waitForVideoReady = useCallback(async () => {
    const video = videoRef.current
    if (!video) return false
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true

    return new Promise<boolean>((resolve) => {
      const timeout = window.setTimeout(() => resolve(false), 2500)
      const onReady = () => {
        window.clearTimeout(timeout)
        resolve(true)
      }
        video.addEventListener('loadeddata', onReady, { once: true })
      })
  }, [])

  const attachStreamToVideo = useCallback(async (stream: MediaStream) => {
    const startedAt = Date.now()

    while (Date.now() - startedAt < 4000) {
      const video = videoRef.current
      if (!video) {
        await new Promise((resolve) => window.setTimeout(resolve, 120))
        continue
      }

      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      await video.play().catch(() => undefined)
      const ready = await waitForVideoReady()
      if (ready && video.videoWidth > 0 && video.videoHeight > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 150))
        return true
      }

      await new Promise((resolve) => window.setTimeout(resolve, 120))
    }

    return false
  }, [waitForVideoReady])

  const blobToDataUrl = useCallback((blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  }), [])

  const getBlobDurationMs = useCallback((blob: Blob) => new Promise<number>((resolve) => {
    const objectUrl = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const clear = () => {
      URL.revokeObjectURL(objectUrl)
      video.src = ''
    }
    const timeout = window.setTimeout(() => {
      clear()
      resolve(0)
    }, 5000)
    video.onloadedmetadata = () => {
      window.clearTimeout(timeout)
      const durationSec = Number.isFinite(video.duration) ? video.duration : 0
      clear()
      resolve(Math.max(0, Math.round(durationSec * 1000)))
    }
    video.onerror = () => {
      window.clearTimeout(timeout)
      clear()
      resolve(0)
    }
    video.src = objectUrl
  }), [])

  const persistDataUrl = useCallback(async (dataUrl: string, kind: 'snapshot' | 'clip') => {
    if (!submissionId) return null
    try {
      const response = await fetch('/api/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, dataUrl, kind }),
      })
      const data = await response.json()
      if (!response.ok) return null
      return data as { evidenceId?: string; url: string; mimeType: string }
    } catch {
      return null
    }
  }, [submissionId])

  const loadFaceApi = useCallback(async () => {
    if (faceModelsReadyRef.current) return faceApiRef.current

    try {
      const faceapi = await import('face-api.js/dist/face-api.js')
      const configuredModelUrl = process.env.NEXT_PUBLIC_FACE_API_MODEL_URL?.trim()
      const modelSources = [
        configuredModelUrl,
        '/models',
        'https://justadudewhohacks.github.io/face-api.js/models',
      ].filter((value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index)

      for (const modelBaseUrl of modelSources) {
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelBaseUrl),
            faceapi.nets.faceRecognitionNet.loadFromUri(modelBaseUrl),
          ])
          faceApiRef.current = faceapi
          faceModelsReadyRef.current = true
          return faceapi
        } catch {
          // try next source
        }
      }

      return null
    } catch {
      return null
    }
  }, [])

  const loadObjectDetector = useCallback(async () => {
    if (objectDetectorRef.current) return objectDetectorRef.current
    if (objectDetectorLoadingRef.current) return null
    objectDetectorLoadingRef.current = true

    try {
      const tf = await import('@tensorflow/tfjs')
      await import('@tensorflow/tfjs-backend-webgl')
      try {
        await tf.setBackend('webgl')
      } catch {
        // fallback backend chosen by tfjs
      }
      await tf.ready()

      const cocoSsd = await import('@tensorflow-models/coco-ssd')
      objectDetectorRef.current = await cocoSsd.load({
        base: 'mobilenet_v2',
      })
      return objectDetectorRef.current
    } catch {
      return null
    } finally {
      objectDetectorLoadingRef.current = false
    }
  }, [])

  const getFaceApiDetections = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null
    try {
      const faceapi = await loadFaceApi()
      if (!faceapi) return null
      return await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors()
    } catch {
      return null
    }
  }, [loadFaceApi])

  const getNativeFaceDetections = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0 || !detectorRef.current) return null
    try {
      return await detectorRef.current.detect(video)
    } catch {
      return null
    }
  }, [])

  const emitWithHysteresis = useCallback((key: string, confidence: number, threshold = 2) => {
    if (confidence >= 0.75) {
      hysteresisRef.current[key] = 0
      return true
    }
    const next = (hysteresisRef.current[key] ?? 0) + 1
    hysteresisRef.current[key] = next
    if (next >= threshold) {
      hysteresisRef.current[key] = 0
      return true
    }
    return false
  }, [])

  const analyzeFrameWithBackend = useCallback(async (imageDataUrl: string): Promise<PythonAnalysisPayload | null> => {
    if (!submissionId) return null
    if (analyzeRequestInFlightRef.current) {
      return null
    }

    analyzeRequestInFlightRef.current = true
    try {
      const response = await fetch('/api/proctoring/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          imageDataUrl,
          baselineEmbedding: baselineEmbeddingRef.current,
        }),
      })
      if (!response.ok) {
        pythonAnalyzeFailureStreakRef.current += 1
        pythonFallbackReasonRef.current = `http_${response.status}`
        const shouldFallback = pythonAnalyzeFailureStreakRef.current >= PYTHON_ANALYZE_FAILURE_THRESHOLD
        pythonFallbackActiveRef.current = shouldFallback
        updateMetrics({
          pythonServiceStatus: shouldFallback ? 'unavailable' : 'degraded',
          pythonFallbackActive: shouldFallback,
          pythonLastFailureReason: pythonFallbackReasonRef.current,
          detectorMode: shouldFallback ? 'browser_fallback' : 'python_primary',
          pythonAnalyzeStatus: shouldFallback ? 'unavailable' : 'degraded',
        })
        return null
      }
      const payload = (await response.json()) as PythonAnalysisPayload
      console.info('proctoring.analyze_result', {
        analysisOk: payload.analysis_ok,
        serviceStatus: payload.service_status,
        facesCount: payload.faces_count,
        mobileDetected: payload.mobile_detected,
        mobileConfidence: payload.mobile_confidence,
      })
      if (payload.fallbackRequired) {
        pythonFallbackReasonRef.current = payload.reason ?? 'fallback'
        pythonAnalyzeFailureStreakRef.current += 1
        const shouldFallback = pythonAnalyzeFailureStreakRef.current >= PYTHON_ANALYZE_FAILURE_THRESHOLD
        pythonFallbackActiveRef.current = shouldFallback
        updateMetrics({
          pythonServiceStatus: shouldFallback
            ? ((payload.service_status as SessionMetrics['pythonServiceStatus']) || 'unavailable')
            : 'degraded',
          pythonAnalyzeStatus: shouldFallback ? 'unavailable' : 'degraded',
          pythonModelStatus: payload.model_status ?? '',
          pythonFallbackActive: shouldFallback,
          pythonLastFailureReason: payload.last_failure_reason ?? pythonFallbackReasonRef.current,
          pythonLastAnalyzeFailureReason: payload.last_failure_reason ?? pythonFallbackReasonRef.current,
          pythonAnalyzeFailureCount: sessionMetricsRef.current.pythonAnalyzeFailureCount + 1,
          detectorMode: shouldFallback ? 'browser_fallback' : 'python_primary',
        })
        return null
      }

      pythonFallbackActiveRef.current = false
      backendOutageLoggedRef.current = false
      pythonAnalyzeFailureStreakRef.current = 0
      updateMetrics({
        pythonServiceStatus: (payload.service_status as SessionMetrics['pythonServiceStatus']) || 'healthy',
        pythonAnalyzeStatus: payload.analysis_ok === false ? 'degraded' : 'healthy',
        pythonModelStatus: payload.model_status ?? '',
        pythonLastLatencyMs: payload.latency_ms ?? 0,
        pythonFallbackActive: false,
        pythonLastSuccessAt: new Date(payload.checked_at_ms ?? Date.now()).toISOString(),
        pythonLastFailureReason: '',
        pythonLastAnalyzeSuccessAt: new Date(payload.checked_at_ms ?? Date.now()).toISOString(),
        pythonLastAnalyzeFailureReason: '',
        pythonAnalyzeSuccessCount: sessionMetricsRef.current.pythonAnalyzeSuccessCount + 1,
        detectorMode: 'python_primary',
      })
      return payload
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'analyze_error'
      console.error('proctoring.analyze_error', reason)
      pythonFallbackReasonRef.current = reason
      pythonAnalyzeFailureStreakRef.current += 1
      const shouldFallback = pythonAnalyzeFailureStreakRef.current >= PYTHON_ANALYZE_FAILURE_THRESHOLD
      pythonFallbackActiveRef.current = shouldFallback
      updateMetrics({
        pythonServiceStatus: shouldFallback ? 'unavailable' : 'degraded',
        pythonAnalyzeStatus: shouldFallback ? 'unavailable' : 'degraded',
        pythonFallbackActive: shouldFallback,
        pythonLastFailureReason: pythonFallbackReasonRef.current,
        pythonLastAnalyzeFailureReason: pythonFallbackReasonRef.current,
        pythonAnalyzeFailureCount: sessionMetricsRef.current.pythonAnalyzeFailureCount + 1,
        detectorMode: shouldFallback ? 'browser_fallback' : 'python_primary',
      })
      return null
    } finally {
      analyzeRequestInFlightRef.current = false
    }
  }, [submissionId, updateMetrics])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    void fetch('/api/proctoring/analyze', { method: 'GET' })
      .then(async (response) => {
        if (!response.ok) {
          if (cancelled) return
          updateMetrics({
            pythonServiceStatus: 'unavailable',
            pythonAnalyzeStatus: 'unavailable',
            pythonModelStatus: '',
            pythonFallbackActive: true,
          })
          return
        }

        const payload = (await response.json()) as PythonHealthPayload
        if (cancelled) return

        const serviceStatus = (payload.service_status as SessionMetrics['pythonServiceStatus']) || 'unavailable'
        const fallbackActive = serviceStatus === 'unavailable'
        if (fallbackActive) {
          pythonFallbackActiveRef.current = true
          pythonFallbackReasonRef.current = payload.reason ?? 'health_probe_failed'
        }

        updateMetrics({
          pythonServiceStatus: serviceStatus,
          pythonAnalyzeStatus: fallbackActive ? 'unavailable' : 'healthy',
          pythonModelStatus: payload.model_status ?? '',
          pythonFallbackActive: fallbackActive,
          pythonLastSuccessAt:
            !fallbackActive && payload.checked_at_ms ? new Date(payload.checked_at_ms).toISOString() : '',
          pythonLastFailureReason: fallbackActive ? (payload.last_failure_reason ?? pythonFallbackReasonRef.current) : '',
          detectorMode: fallbackActive ? 'browser_fallback' : 'python_primary',
        })
      })
      .catch(() => {
        if (cancelled) return
        pythonFallbackActiveRef.current = true
        pythonFallbackReasonRef.current = 'health_probe_network_error'
        updateMetrics({
          pythonServiceStatus: 'unavailable',
          pythonAnalyzeStatus: 'unavailable',
          pythonModelStatus: '',
          pythonFallbackActive: true,
          pythonLastFailureReason: pythonFallbackReasonRef.current,
          detectorMode: 'browser_fallback',
        })
      })

    return () => {
      cancelled = true
    }
  }, [enabled, updateMetrics])

  const uploadEvidence = useCallback(async (payload: { snapshot?: StoredSnapshotPayload; recordingClip?: { clipUrl: string; evidenceId?: string; mimeType: string; durationMs: number } }) => {
    if (!submissionId) return false
    try {
      let snapshot = payload.snapshot
      if (snapshot?.imageUrl.startsWith('data:')) {
        const stored = await persistDataUrl(snapshot.imageUrl, 'snapshot')
        if (stored?.url) {
          snapshot = { ...snapshot, imageUrl: stored.url, evidenceId: stored.evidenceId }
          console.info('proctoring.evidence_saved', { kind: 'snapshot', evidenceId: stored.evidenceId })
        }
      }

      let recordingClip = payload.recordingClip
      if (recordingClip?.clipUrl.startsWith('data:')) {
        const stored = await persistDataUrl(recordingClip.clipUrl, 'clip')
        if (!stored?.url) return false
        recordingClip = {
          ...recordingClip,
          clipUrl: stored.url,
          evidenceId: stored.evidenceId,
          mimeType: stored.mimeType || recordingClip.mimeType,
        }
        console.info('proctoring.evidence_saved', { kind: 'clip', evidenceId: stored.evidenceId })
      }

      const response = await fetch('/api/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, snapshot, recordingClip, sessionMetrics: sessionMetricsRef.current }),
      })
      if (response.ok && recordingClip?.evidenceId) {
        console.info('proctoring.clip_linked_to_submission', { evidenceId: recordingClip.evidenceId })
      }
      return response.ok
    } catch {
      // offline
      return false
    }
  }, [persistDataUrl, submissionId])

  const shouldThrottleEvent = useCallback((type: ProctoringEventType, windowMs: number) => {
    const now = Date.now()
    const previous = lastEventAtRef.current[type] ?? 0
    if (now - previous < windowMs) return true
    lastEventAtRef.current[type] = now
    return false
  }, [])

  const logEvent = useCallback(async (event: ProctoringEvent) => {
    if (shouldThrottleEvent(event.type, event.type === 'audio_detected' ? 10000 : 5000)) return
    const enrichedEvent = {
      ...event,
      evidenceImage: event.evidenceImage ?? captureSnapshot() ?? undefined,
    }

    let persistedImage = enrichedEvent.evidenceImage
    let evidenceId = enrichedEvent.evidenceId
    if (persistedImage?.startsWith('data:')) {
      const stored = await persistDataUrl(persistedImage, 'snapshot')
      if (stored?.url) {
        persistedImage = stored.url
        evidenceId = stored.evidenceId
      }
    }

    const eventForServer = {
      ...enrichedEvent,
      evidenceImage: persistedImage,
      evidenceId,
    }

    setEvents((prev) => [eventForServer, ...prev].slice(0, 50))
    onEvent?.(eventForServer)

    try {
      const res = await fetch('/api/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, event: eventForServer, sessionMetrics: sessionMetricsRef.current }),
      })
      const data = await res.json()
      setRiskScore(data.riskScore ?? 0)
      if (data.status === 'flagged') {
        setStatus('flagged')
        onFlagged?.()
      } else if ((data.riskScore ?? 0) >= 40) {
        setStatus('warning')
      } else {
        setStatus('clean')
      }
    } catch {
      // offline
    }
  }, [captureSnapshot, onEvent, onFlagged, persistDataUrl, shouldThrottleEvent, submissionId])

  const enterFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return false
    if (document.fullscreenElement) {
      setIsFullscreen(true)
      return true
    }

    const target = document.documentElement
    if (!target.requestFullscreen) return false

    try {
      await target.requestFullscreen()
      setIsFullscreen(true)
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
      audio: true,
    })
      .then(async (stream) => {
        const secureBrowserDetected =
          typeof navigator !== 'undefined' && /safe exam browser|seb/i.test(navigator.userAgent)
        streamRef.current = stream
        setRecorderSupported(typeof MediaRecorder !== 'undefined')
        updateMetrics({
          audioMonitoringActive: stream.getAudioTracks().length > 0,
          recordingSupported: typeof MediaRecorder !== 'undefined',
          secureBrowserMode: secureBrowserDetected ? 'seb' : 'standard',
          secureBrowserTrust: secureBrowserDetected ? 'high' : 'reduced',
        })

        const videoReady = await attachStreamToVideo(stream)
        setCamActive(videoReady)

        if (!videoReady) {
          updateMetrics({
            pythonAnalyzeStatus: 'degraded',
            lastSnapshotCaptureFailedReason: 'video_attach_failed',
          })
          console.warn('proctoring.video_attach_failed')
        }

        if (videoReady) {
          window.setTimeout(async () => {
            const snapshot = captureSnapshot()
            if (snapshot) {
              setIdentitySnapshot(snapshot)
              if (!identityLoggedRef.current) {
                identityLoggedRef.current = true
                void uploadEvidence({
                  snapshot: {
                    type: 'identity',
                    imageUrl: snapshot,
                    details: 'Initial candidate identity snapshot',
                  },
                })
              }
            }

            const initialDetections = await getFaceApiDetections()
            if (initialDetections?.[0]?.descriptor) {
              baselineDescriptorRef.current = initialDetections[0].descriptor
            }
          }, 250)
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        initialDevicesRef.current = devices.map((item) => `${item.kind}:${item.label}`).sort().join('|')

        if (typeof MediaRecorder !== 'undefined') {
          try {
            const mimeCandidates = [
              'video/webm;codecs=vp9,opus',
              'video/webm;codecs=vp8,opus',
              'video/webm',
            ]
            const selectedMimeType =
              mimeCandidates.find((candidate) => MediaRecorder.isTypeSupported?.(candidate)) ?? ''
            const recorderOptions = selectedMimeType
              ? { mimeType: selectedMimeType, videoBitsPerSecond: 600000, audioBitsPerSecond: 64000 }
              : { videoBitsPerSecond: 600000, audioBitsPerSecond: 64000 }

            const startRecorderSegment = () => {
              if (!recordingEnabledRef.current) return
              const recorder = new MediaRecorder(stream, recorderOptions)
              recordingChunksRef.current = []
              recordingCycleStartedAtRef.current = Date.now()
              clipStartedAtRef.current = recordingCycleStartedAtRef.current

              recorder.ondataavailable = (mediaEvent) => {
                if (mediaEvent.data && mediaEvent.data.size > 0) {
                  recordingChunksRef.current.push(mediaEvent.data)
                }
              }

              recorder.onerror = () => {
                setRecorderSupported(false)
                updateMetrics({ recordingSupported: false })
              }

              recorder.onstop = () => {
                const startedAt = recordingCycleStartedAtRef.current || Date.now()
                const wallDurationMs = Math.max(0, Date.now() - startedAt)
                const chunks = recordingChunksRef.current
                recordingChunksRef.current = []
                if (chunks.length > 0 && recorderShouldFinalizeRef.current) {
                  const clipBlob = new Blob(chunks, { type: selectedMimeType || 'video/webm' })
                  void (async () => {
                    const mediaDurationMs = await getBlobDurationMs(clipBlob)
                    const durationMs = Math.max(wallDurationMs, mediaDurationMs)
                    const validClip =
                      mediaDurationMs >= MIN_CLIP_DURATION_MS &&
                      durationMs >= MIN_CLIP_DURATION_MS &&
                      !(clipBlob.size < MIN_CLIP_SIZE_BYTES && durationMs < 4000)

                    if (!validClip) {
                      updateMetrics((prev) => ({ invalidClipsDropped: prev.invalidClipsDropped + 1 }))
                      console.info('proctoring.recorder_segment_dropped', {
                        sizeBytes: clipBlob.size,
                        mediaDurationMs,
                        wallDurationMs,
                      })
                      return
                    }

                    const clipUrl = await blobToDataUrl(clipBlob)
                    console.info('proctoring.clip_validated', {
                      sizeBytes: clipBlob.size,
                      mediaDurationMs,
                      wallDurationMs,
                    })
                    console.info('proctoring.recorder_segment_created', {
                      sizeBytes: clipBlob.size,
                      durationMs,
                    })

                    let linked = false
                    for (let attempt = 1; attempt <= 3 && !linked; attempt += 1) {
                      linked = await uploadEvidence({
                        recordingClip: {
                          clipUrl,
                          mimeType: clipBlob.type || 'video/webm',
                          durationMs,
                        },
                      })
                      if (!linked && attempt < 3) {
                        await new Promise((resolve) => setTimeout(resolve, attempt * 400))
                      }
                    }

                    console.info(linked ? 'proctoring.clip_linked_to_submission' : 'proctoring.clip_link_failed', {
                      durationMs,
                    })
                  })()
                }

                if (recordingEnabledRef.current && stream.active) {
                  startRecorderSegment()
                }
              }

              recorder.start()
              recordingRef.current = recorder
            }

            window.setTimeout(() => {
              if (!stream.active) return
              recorderShouldFinalizeRef.current = true
              recordingEnabledRef.current = true
              startRecorderSegment()
              recordingRotateRef.current = setInterval(() => {
                const activeRecorder = recordingRef.current
                if (activeRecorder && activeRecorder.state === 'recording') {
                  activeRecorder.stop()
                }
              }, CLIP_SEGMENT_MS)
            }, 300)
          } catch {
            setRecorderSupported(false)
            updateMetrics({ recordingSupported: false })
          }
        }

        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AudioCtx && stream.getAudioTracks().length > 0) {
          const audioContext = new AudioCtx()
          audioContextRef.current = audioContext
          const analyser = audioContext.createAnalyser()
          analyser.fftSize = 1024
          analyser.smoothingTimeConstant = 0.72
          const source = audioContext.createMediaStreamSource(stream)
          source.connect(analyser)
          analyserRef.current = analyser

          const SpeechRecognitionCtor =
            (window as typeof window & {
              SpeechRecognition?: new () => any
              webkitSpeechRecognition?: new () => any
            }).SpeechRecognition ||
            (window as typeof window & {
              SpeechRecognition?: new () => any
              webkitSpeechRecognition?: new () => any
            }).webkitSpeechRecognition

          if (SpeechRecognitionCtor && !speechRecognitionRef.current) {
            try {
              const recognition = new SpeechRecognitionCtor()
              recognition.continuous = true
              recognition.interimResults = true
              recognition.lang = 'en-US'

              recognition.onstart = () => {
                speechRecognitionActiveRef.current = true
              }

              recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results ?? [])
                  .map((result: any) => String(result?.[0]?.transcript ?? '').trim())
                  .join(' ')
                  .trim()

                if (!transcript) return
                const normalizedTranscript = transcript.toLowerCase()
                const words = normalizedTranscript
                  .replace(/[^a-z0-9\s]/g, ' ')
                  .split(/\s+/)
                  .filter(Boolean)
                const wordCount = words.length
                const singleLetterTokens = words.filter((word) => /^[a-z]$/.test(word))
                const hasSpelledLetters = singleLetterTokens.length >= 3
                const hasRecognizableWord = words.some((word) => /^[a-z]{4,}$/.test(word))
                const hasNumericAnswer = words.some((word) => /^\d{2,}$/.test(word))
                const shouldFlagSpeech =
                  wordCount >= 2 ||
                  hasSpelledLetters ||
                  hasRecognizableWord ||
                  hasNumericAnswer

                if (!shouldFlagSpeech) return

                const speechReason = hasSpelledLetters
                  ? 'spelled_letters_detected'
                  : hasNumericAnswer
                  ? 'numeric_answer_detected'
                  : 'spoken_phrase_detected'

                void logEvent({
                  type: 'audio_detected',
                  severity: 'high',
                  details: `Detected spoken words near the exam device: "${transcript.slice(0, 80)}"`,
                  timestamp: new Date(),
                  detectorDetails: {
                    sourceMode: pythonFallbackActiveRef.current ? 'browser_fallback' : 'python_primary',
                    detector: 'speech-recognition',
                    reason: speechReason,
                  },
                })
              }

              recognition.onerror = () => {
                speechRecognitionActiveRef.current = false
              }

              recognition.onend = () => {
                speechRecognitionActiveRef.current = false
                if (!recordingEnabledRef.current && !enabled) return
                window.setTimeout(() => {
                  try {
                    recognition.start()
                  } catch {
                    // best-effort restart
                  }
                }, 800)
              }

              speechRecognitionRef.current = recognition
              recognition.start()
            } catch {
              speechRecognitionRef.current = null
              speechRecognitionActiveRef.current = false
            }
          }
        }

        const NativeFaceDetector = (window as typeof window & { FaceDetector?: new (...args: any[]) => any }).FaceDetector
        if (NativeFaceDetector) {
          detectorRef.current = new NativeFaceDetector({ fastMode: true, maxDetectedFaces: 2 })
        }
      })
      .catch(() => {
        setCamActive(false)
        updateMetrics({
          pythonAnalyzeStatus: 'unavailable',
          lastSnapshotCaptureFailedReason: 'camera_permission_failed',
        })
      })

    return () => {
      recordingEnabledRef.current = false
      if (recordingRotateRef.current) {
        clearInterval(recordingRotateRef.current)
        recordingRotateRef.current = null
      }
      const recorder = recordingRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioContextRef.current?.close().catch(() => undefined)
      const recognition = speechRecognitionRef.current
      if (recognition) {
        try {
          recognition.stop()
        } catch {
          // ignore
        }
      }
      speechRecognitionRef.current = null
      speechRecognitionActiveRef.current = false
    }
  }, [attachStreamToVideo, blobToDataUrl, captureSnapshot, enabled, getBlobDurationMs, getFaceApiDetections, updateMetrics, uploadEvidence])

  useEffect(() => {
    if (!enabled) return
    void enterFullscreen()

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
      if (!active) {
        updateMetrics((prev) => ({ fullscreenViolations: prev.fullscreenViolations + 1 }))
        void logEvent({
          type: 'tab_switch',
          severity: 'high',
          details: 'Candidate exited fullscreen during the exam session',
          timestamp: new Date(),
        })
        void enterFullscreen()
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        void logEvent({
          type: 'tab_switch',
          severity: 'high',
          details: 'Candidate switched tabs or minimized the exam window',
          timestamp: new Date(),
        })
      }
    }

    const handleOnlineState = () => {
      const isOffline = !navigator.onLine
      if (isOffline) {
        updateMetrics((prev) => ({ networkDisconnects: prev.networkDisconnects + 1 }))
      }
      void logEvent({
        type: 'network_change',
        severity: isOffline ? 'medium' : 'low',
        details: isOffline ? 'Network connectivity lost' : 'Network connectivity restored',
        timestamp: new Date(),
      })
    }

    const handleDevicesChanged = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const nextSignature = devices.map((item) => `${item.kind}:${item.label}`).sort().join('|')
      if (initialDevicesRef.current && nextSignature !== initialDevicesRef.current) {
        initialDevicesRef.current = nextSignature
        updateMetrics((prev) => ({ deviceChanges: prev.deviceChanges + 1 }))
        void logEvent({
          type: 'identity_unverified',
          severity: 'medium',
          details: 'Input devices changed during the exam session',
          timestamp: new Date(),
        })
      }
    }

    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditable = Boolean(target && (
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'INPUT' ||
        target.isContentEditable
      ))
      const key = event.key.toLowerCase()
      const blocked =
        key === 'printscreen' ||
        (((event.ctrlKey || event.metaKey) && ['c', 'v', 'x'].includes(key))) ||
        (((event.ctrlKey || event.metaKey) && ['p', 's'].includes(key)) && !isEditable) ||
        (event.altKey && key === 'tab') ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        key === 'f12'

      if (!blocked) return
      event.preventDefault()
      event.stopPropagation()

      const eventType: ProctoringEventType =
        key === 'printscreen'
          ? 'print_screen'
          : ['i', 'j', 'c', 'f12'].includes(key)
          ? 'devtools_shortcut'
          : 'tab_switch'

      void logEvent({
        type: eventType,
        severity: key === 'printscreen' ? 'high' : 'medium',
        details: `Blocked restricted keyboard shortcut: ${event.key}`,
        timestamp: new Date(),
      })
    }

    const block = (event: Event) => event.preventDefault()

    window.addEventListener('online', handleOnlineState)
    window.addEventListener('offline', handleOnlineState)
    window.addEventListener('keydown', handleKeydown, true)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('copy', block)
    document.addEventListener('paste', block)
    document.addEventListener('cut', block)
    document.addEventListener('contextmenu', block)
    document.addEventListener('dragstart', block)
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDevicesChanged)

    return () => {
      window.removeEventListener('online', handleOnlineState)
      window.removeEventListener('offline', handleOnlineState)
      window.removeEventListener('keydown', handleKeydown, true)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('copy', block)
      document.removeEventListener('paste', block)
      document.removeEventListener('cut', block)
      document.removeEventListener('contextmenu', block)
      document.removeEventListener('dragstart', block)
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDevicesChanged)
    }
  }, [enabled, enterFullscreen, logEvent, updateMetrics])

  useEffect(() => {
    if (!enabled || !camActive) return

    const runAnalyzeFrame = async () => {
      const snapshot = captureSnapshot()
      const tickId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      updateMetrics({
        pythonLastAnalyzeAt: new Date().toISOString(),
        pythonAnalyzeAttempts: sessionMetricsRef.current.pythonAnalyzeAttempts + 1,
      })
      console.info('proctoring.analyze_tick', { tickId })

      if (!snapshot) {
        snapshotFailureCountRef.current += 1
        console.warn('proctoring.snapshot_failed')
        updateMetrics({
          pythonAnalyzeStatus: 'degraded',
          lastSnapshotCaptureFailedReason: 'video_not_ready',
          pythonLastAnalyzeFailureReason: 'snapshot_failed',
          pythonAnalyzeFailureCount: sessionMetricsRef.current.pythonAnalyzeFailureCount + 1,
        })
        if (snapshotFailureCountRef.current >= SNAPSHOT_FAILURE_THRESHOLD) {
          pythonFallbackActiveRef.current = true
          pythonFallbackReasonRef.current = 'snapshot_failed'
          updateMetrics({
            detectorMode: 'browser_fallback',
            pythonFallbackActive: true,
          })
        }
        return
      }

      snapshotFailureCountRef.current = 0
      updateMetrics({
        lastSnapshotCapturedAt: new Date().toISOString(),
        lastSnapshotCaptureFailedReason: '',
      })
      if (snapshot && !identitySnapshot) setIdentitySnapshot(snapshot)

      const video = videoRef.current
      if (snapshot) {
        const backend = await analyzeFrameWithBackend(snapshot)
        if (!backend && pythonFallbackActiveRef.current && !backendOutageLoggedRef.current) {
          backendOutageLoggedRef.current = true
          void logEvent({
            type: 'identity_unverified',
            severity: 'low',
            details: `Python proctoring service unavailable (${pythonFallbackReasonRef.current}); browser fallback active`,
            timestamp: new Date(),
            source: 'python',
            confidence: 0.4,
            evidenceImage: snapshot,
            detectorDetails: {
              analysisTickId: tickId,
              snapshotCaptured: true,
              pythonAnalyzeStatus: 'unavailable',
              sourceMode: 'browser_fallback',
              reason: pythonFallbackReasonRef.current,
            },
          })
        } else if (backend) {
          backendOutageLoggedRef.current = false

          if (Array.isArray(backend.embedding) && backend.embedding.length > 0 && !baselineEmbeddingRef.current) {
            baselineEmbeddingRef.current = backend.embedding
          }

          const facesCount = Number(backend.faces_count ?? -1)
          if (facesCount === 0) {
            void logEvent({
              type: 'face_missing',
              severity: 'high',
              details: 'No face detected in the camera frame',
              timestamp: new Date(),
              source: 'python',
              confidence: 0.9,
              evidenceImage: snapshot,
              detectorDetails: {
                analysisTickId: tickId,
                snapshotCaptured: true,
                pythonAnalyzeStatus: 'healthy',
                sourceMode: 'python_primary',
                faceCount: facesCount,
                detector: String(backend.detector_details?.face_detector ?? 'python'),
              },
            })
            return
          }

          if (facesCount > 1 && emitWithHysteresis('multiple_faces', 0.8)) {
            void logEvent({
              type: 'multiple_faces',
              severity: 'high',
              details: `Multiple faces detected (${facesCount}) by Python face counter`,
              timestamp: new Date(),
              source: 'python',
              confidence: 0.8,
              evidenceImage: snapshot,
              detectorDetails: {
                analysisTickId: tickId,
                snapshotCaptured: true,
                pythonAnalyzeStatus: 'healthy',
                sourceMode: 'python_primary',
                faceCount: facesCount,
                detector: String(backend.detector_details?.face_detector ?? 'python'),
              },
            })
          }

          const gazeScore = Number(backend.gaze_offscreen_score ?? 0)
          if (gazeScore >= 0.65 && emitWithHysteresis('eye_gaze', Math.min(1, gazeScore))) {
            void logEvent({
              type: 'eye_gaze',
              severity: 'low',
              details: `Eye gaze drift detected (score ${gazeScore.toFixed(2)})`,
              timestamp: new Date(),
              source: 'python',
              confidence: Math.min(1, gazeScore),
              evidenceImage: snapshot,
              detectorDetails: {
                analysisTickId: tickId,
                snapshotCaptured: true,
                pythonAnalyzeStatus: 'healthy',
                sourceMode: 'python_primary',
                gazeScore,
                detector: String(backend.detector_details?.gaze_detector ?? 'python'),
              },
            })
          }

          const mobileConfidence = Number(backend.mobile_confidence ?? 0.85)
          if (backend.mobile_detected && mobileConfidence >= 0.1 && emitWithHysteresis('mobile_detected', Math.max(0.72, mobileConfidence), 1)) {
            void logEvent({
              type: 'mobile_detected',
              severity: 'high',
              details: `Possible mobile phone detected in the webcam frame (python score ${mobileConfidence.toFixed(2)})`,
              timestamp: new Date(),
              source: 'python',
              confidence: Math.max(0.75, mobileConfidence),
              evidenceImage: snapshot,
              detectorDetails: {
                analysisTickId: tickId,
                snapshotCaptured: true,
                pythonAnalyzeStatus: 'healthy',
                sourceMode: 'python_primary',
                mobileConfidence,
                detector: String(backend.detector_details?.mobile_detector ?? 'python'),
                reason: typeof backend.detector_details?.mobile_reason === 'string' ? backend.detector_details.mobile_reason : undefined,
              },
            })
          }

          const identityDistance = backend.identity_distance
          if (typeof identityDistance === 'number' && identityDistance > 0.95 && emitWithHysteresis('identity_unverified', 0.8)) {
            void logEvent({
              type: 'identity_unverified',
              severity: 'high',
              details: `Face mismatch detected (distance ${identityDistance.toFixed(2)})`,
              timestamp: new Date(),
              source: 'python',
              confidence: 0.8,
              evidenceImage: snapshot,
              detectorDetails: {
                analysisTickId: tickId,
                snapshotCaptured: true,
                pythonAnalyzeStatus: 'healthy',
                sourceMode: 'python_primary',
                identityDistance,
                detector: String(backend.detector_details?.embedding_model ?? 'python'),
              },
            })
          }

          return
        }
      }

      const faceApiDetections = await getFaceApiDetections()
      if (faceApiDetections) {
        if (faceApiDetections.length === 0) {
          void logEvent({
            type: 'face_missing',
            severity: 'high',
            details: 'No face detected in the camera frame',
            timestamp: new Date(),
            evidenceImage: snapshot ?? undefined,
            detectorDetails: {
              sourceMode: 'browser_fallback',
              faceCount: 0,
              detector: 'face-api',
            },
          })
          return
        }

        if (faceApiDetections.length > 1) {
          void logEvent({
            type: 'multiple_faces',
            severity: 'high',
            details: 'Multiple faces detected in the camera frame',
            timestamp: new Date(),
            evidenceImage: snapshot ?? undefined,
            detectorDetails: {
              sourceMode: 'browser_fallback',
              faceCount: faceApiDetections.length,
              detector: 'face-api',
            },
          })
          return
        }

        const [detection] = faceApiDetections
        if (baselineDescriptorRef.current && detection.descriptor) {
          const distance = Math.sqrt(
            detection.descriptor.reduce((acc: number, value: number, index: number) => {
              const delta = value - (baselineDescriptorRef.current?.[index] ?? value)
              return acc + delta * delta
            }, 0)
          )

          if (distance > 0.58) {
            void logEvent({
              type: 'identity_unverified',
              severity: 'high',
              details: `Face mismatch detected against the initial identity sample (distance ${distance.toFixed(2)})`,
              timestamp: new Date(),
              evidenceImage: snapshot ?? undefined,
              detectorDetails: {
                sourceMode: 'browser_fallback',
                identityDistance: distance,
                detector: 'face-api',
              },
            })
          }
        } else if (detection.descriptor) {
          baselineDescriptorRef.current = detection.descriptor
        }

        const leftEye = detection.landmarks?.getLeftEye?.()
        const rightEye = detection.landmarks?.getRightEye?.()
        const jaw = detection.landmarks?.getJawOutline?.()
        if (leftEye?.length && rightEye?.length && jaw?.length && video) {
          const eyeCenterX =
            ([...leftEye, ...rightEye].reduce((acc: number, point: any) => acc + point.x, 0)) /
            (leftEye.length + rightEye.length)
          const faceCenterX = jaw.reduce((acc: number, point: any) => acc + point.x, 0) / jaw.length
          const deviation = Math.abs(eyeCenterX - faceCenterX) / Math.max(video.videoWidth, 1)
          if (deviation > 0.035) {
            void logEvent({
              type: 'eye_gaze',
              severity: 'low',
              details: 'Eye alignment suggests the candidate is looking away from the screen',
              timestamp: new Date(),
              evidenceImage: snapshot ?? undefined,
              detectorDetails: {
                sourceMode: 'browser_fallback',
                gazeScore: deviation,
                detector: 'face-api',
              },
            })
          }
        }
        return
      }

      const nativeDetections = await getNativeFaceDetections()
      if (nativeDetections && video) {
        if (nativeDetections.length === 0) {
          void logEvent({
            type: 'face_missing',
            severity: 'high',
            details: 'No face detected in the camera frame',
            timestamp: new Date(),
            evidenceImage: snapshot ?? undefined,
            detectorDetails: {
              sourceMode: 'browser_fallback',
              faceCount: 0,
              detector: 'native-face-detector',
            },
          })
        } else if (nativeDetections.length > 1) {
          void logEvent({
            type: 'multiple_faces',
            severity: 'high',
            details: 'Multiple faces detected in the camera frame',
            timestamp: new Date(),
            evidenceImage: snapshot ?? undefined,
            detectorDetails: {
              sourceMode: 'browser_fallback',
              faceCount: nativeDetections.length,
              detector: 'native-face-detector',
            },
          })
        } else if (nativeDetections[0]?.boundingBox) {
          const box = nativeDetections[0].boundingBox
          const centerX = box.x + box.width / 2
          const centerY = box.y + box.height / 2
          const screenOffset = Math.abs(centerX - video.videoWidth / 2) / Math.max(video.videoWidth, 1)
          const verticalOffset = Math.abs(centerY - video.videoHeight / 2) / Math.max(video.videoHeight, 1)
          if (screenOffset > 0.22 || verticalOffset > 0.2) {
            void logEvent({
              type: 'eye_gaze',
              severity: 'low',
              details: 'Candidate face position drift suggests gaze away from the screen',
              timestamp: new Date(),
              evidenceImage: snapshot ?? undefined,
              detectorDetails: {
                sourceMode: 'browser_fallback',
                gazeScore: Math.max(screenOffset, verticalOffset),
                detector: 'native-face-detector',
              },
            })
          }
        }
        return
      }

      if (!faceDetectionUnavailableLoggedRef.current) {
        faceDetectionUnavailableLoggedRef.current = true
        void logEvent({
          type: 'identity_unverified',
          severity: 'medium',
          details: 'Face detection model unavailable; configure local /public/models for stable multiple-face checks',
          timestamp: new Date(),
          evidenceImage: snapshot ?? undefined,
          detectorDetails: {
            analysisTickId: tickId,
            snapshotCaptured: Boolean(snapshot),
            pythonAnalyzeStatus: 'unavailable',
            sourceMode: 'browser_fallback',
            detector: 'browser_fallback_unavailable',
            reason: 'face_models_missing',
          },
        })
      }
    }

    const faceInterval = setInterval(async () => {
      await runAnalyzeFrame()
    }, ANALYZE_INTERVAL_MS)

    const audioInterval = setInterval(() => {
      const analyser = analyserRef.current
      if (!analyser) return
      const timeBuffer = new Uint8Array(analyser.fftSize)
      const freqBuffer = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteTimeDomainData(timeBuffer)
      analyser.getByteFrequencyData(freqBuffer)

      let sumSquares = 0
      let zeroCrossings = 0
      let previousSign = 0
      for (const value of Array.from(timeBuffer)) {
        const normalized = (value - 128) / 128
        sumSquares += normalized * normalized
        const sign = normalized > 0.02 ? 1 : normalized < -0.02 ? -1 : 0
        if (sign !== 0 && previousSign !== 0 && sign !== previousSign) zeroCrossings += 1
        if (sign !== 0) previousSign = sign
      }
      const rms = Math.sqrt(sumSquares / timeBuffer.length)
      const zeroCrossingRate = zeroCrossings / Math.max(timeBuffer.length, 1)

      const nyquist = 24000
      const binHz = nyquist / Math.max(freqBuffer.length, 1)
      let speechBandEnergy = 0
      let totalEnergy = 0
      for (let index = 0; index < freqBuffer.length; index += 1) {
        const energy = freqBuffer[index]
        const hz = index * binHz
        totalEnergy += energy
        if (hz >= 180 && hz <= 4000) speechBandEnergy += energy
      }
      const speechBandRatio = totalEnergy > 0 ? speechBandEnergy / totalEnergy : 0
      const speechLikely =
        rms > 0.035 &&
        rms < 0.24 &&
        zeroCrossingRate > 0.03 &&
        zeroCrossingRate < 0.22 &&
        speechBandRatio > 0.55
      audioSpeechStreakRef.current = speechLikely ? audioSpeechStreakRef.current + 1 : 0
      if (rms > 0.12 || audioSpeechStreakRef.current >= 2) {
        void logEvent({
          type: 'audio_detected',
          severity: audioSpeechStreakRef.current >= 2 ? 'high' : 'medium',
          details:
            audioSpeechStreakRef.current >= 2
              ? `Conversation-like audio detected (rms ${rms.toFixed(2)}, zcr ${zeroCrossingRate.toFixed(2)}, band ${speechBandRatio.toFixed(2)})`
              : `Elevated background audio detected (rms ${rms.toFixed(2)})`,
          timestamp: new Date(),
          detectorDetails: {
            sourceMode: pythonFallbackActiveRef.current ? 'browser_fallback' : 'python_primary',
            detector: 'web-audio',
            reason: audioSpeechStreakRef.current >= 2 ? 'speech_like_pattern' : 'loud_audio',
          },
        })
        audioSpeechStreakRef.current = 0
      }
    }, 3500)

    const mobileInterval = setInterval(async () => {
      if (!pythonFallbackActiveRef.current) return
      // Keep browser fallback dormant unless Python is truly unavailable.
    }, 2000)

    const intervalSnapshot = setInterval(() => {
      const snapshot = captureSnapshot()
      if (!snapshot) return
      setIdentitySnapshot((prev) => prev ?? snapshot)
      void uploadEvidence({
        snapshot: {
          type: 'interval',
          imageUrl: snapshot,
          details: 'Scheduled monitoring snapshot',
        },
      })
    }, 30000)

    intervalsRef.current = [faceInterval, audioInterval, mobileInterval, intervalSnapshot]

    return () => {
      intervalsRef.current.forEach(clearInterval)
    }
  }, [analyzeFrameWithBackend, camActive, captureSnapshot, emitWithHysteresis, enabled, getFaceApiDetections, getNativeFaceDetections, identitySnapshot, loadObjectDetector, logEvent, uploadEvidence])

  const stopProctoring = useCallback((options?: { flushRecording?: boolean }) => {
    intervalsRef.current.forEach(clearInterval)
    recordingEnabledRef.current = false
    recorderShouldFinalizeRef.current = options?.flushRecording ?? true
    if (recordingRotateRef.current) {
      clearInterval(recordingRotateRef.current)
      recordingRotateRef.current = null
    }
    const recorder = recordingRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    setCamActive(false)
  }, [])

  return {
    riskScore,
    status,
    events,
    camActive,
    videoRef,
    stopProctoring,
    enterFullscreen,
    recorderSupported,
    sessionMetrics,
    isFullscreen,
    identitySnapshot,
  }
}
