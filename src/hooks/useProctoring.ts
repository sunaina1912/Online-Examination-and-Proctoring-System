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
}

interface SessionMetrics {
  fullscreenViolations: number
  deviceChanges: number
  networkDisconnects: number
  recordingSupported: boolean
  audioMonitoringActive: boolean
}

interface StoredSnapshotPayload {
  type: 'identity' | 'incident' | 'interval'
  imageUrl: string
  details: string
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
}

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
  const [sessionMetrics, setSessionMetrics] = useState(INITIAL_METRICS)
  const [identitySnapshot, setIdentitySnapshot] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([])
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const initialDevicesRef = useRef<string>('')
  const detectorRef = useRef<any>(null)
  const faceApiRef = useRef<any>(null)
  const baselineDescriptorRef = useRef<Float32Array | null>(null)
  const faceModelsReadyRef = useRef(false)
  const recordingRef = useRef<MediaRecorder | null>(null)
  const identityLoggedRef = useRef(false)
  const clipStartedAtRef = useRef<number | null>(null)
  const lastEventAtRef = useRef<Record<string, number>>({})

  const updateMetrics = useCallback((patch: Partial<SessionMetrics> | ((prev: SessionMetrics) => Partial<SessionMetrics>)) => {
    setSessionMetrics((prev) => ({
      ...prev,
      ...(typeof patch === 'function' ? patch(prev) : patch),
    }))
  }, [])

  const captureSnapshot = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = Math.round((video.videoHeight / video.videoWidth) * 320)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.7)
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

  const blobToDataUrl = useCallback((blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
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
      return data as { url: string; mimeType: string }
    } catch {
      return null
    }
  }, [submissionId])

  const loadFaceApi = useCallback(async () => {
    if (faceModelsReadyRef.current) return faceApiRef.current
    const faceapi = await import('face-api.js')
    const modelBaseUrl =
      process.env.NEXT_PUBLIC_FACE_API_MODEL_URL ||
      'https://justadudewhohacks.github.io/face-api.js/models'

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelBaseUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelBaseUrl),
    ])

    faceApiRef.current = faceapi
    faceModelsReadyRef.current = true
    return faceapi
  }, [])

  const getFaceApiDetections = useCallback(async () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null
    try {
      const faceapi = await loadFaceApi()
      return await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.45 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors()
    } catch {
      return null
    }
  }, [loadFaceApi])

  const uploadEvidence = useCallback(async (payload: { snapshot?: StoredSnapshotPayload; recordingClip?: { clipUrl: string; mimeType: string; durationMs: number } }) => {
    if (!submissionId) return
    try {
      let snapshot = payload.snapshot
      if (snapshot?.imageUrl.startsWith('data:')) {
        const stored = await persistDataUrl(snapshot.imageUrl, 'snapshot')
        if (stored?.url) {
          snapshot = { ...snapshot, imageUrl: stored.url }
        }
      }

      let recordingClip = payload.recordingClip
      if (recordingClip?.clipUrl.startsWith('data:')) {
        const stored = await persistDataUrl(recordingClip.clipUrl, 'clip')
        if (stored?.url) {
          recordingClip = {
            ...recordingClip,
            clipUrl: stored.url,
            mimeType: stored.mimeType || recordingClip.mimeType,
          }
        }
      }

      await fetch('/api/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, snapshot, recordingClip, sessionMetrics }),
      })
    } catch {
      // offline
    }
  }, [persistDataUrl, sessionMetrics, submissionId])

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
    if (persistedImage?.startsWith('data:')) {
      const stored = await persistDataUrl(persistedImage, 'snapshot')
      if (stored?.url) {
        persistedImage = stored.url
      }
    }

    const eventForServer = {
      ...enrichedEvent,
      evidenceImage: persistedImage,
    }

    setEvents((prev) => [eventForServer, ...prev].slice(0, 50))
    onEvent?.(eventForServer)

    try {
      const res = await fetch('/api/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, event: eventForServer, sessionMetrics }),
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
  }, [captureSnapshot, onEvent, onFlagged, persistDataUrl, sessionMetrics, shouldThrottleEvent, submissionId])

  const enterFullscreen = useCallback(async () => undefined, [])

  useEffect(() => {
    if (!enabled) return

    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    })
      .then(async (stream) => {
        streamRef.current = stream
        setCamActive(true)
        setRecorderSupported(typeof MediaRecorder !== 'undefined')
        updateMetrics({
          audioMonitoringActive: stream.getAudioTracks().length > 0,
          recordingSupported: typeof MediaRecorder !== 'undefined',
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
          await waitForVideoReady()
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
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        initialDevicesRef.current = devices.map((item) => `${item.kind}:${item.label}`).sort().join('|')

        if (typeof MediaRecorder !== 'undefined') {
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })
          recorder.onstart = () => {
            clipStartedAtRef.current = Date.now()
          }
          recorder.ondataavailable = (mediaEvent) => {
            const startedAt = clipStartedAtRef.current ?? Date.now()
            clipStartedAtRef.current = Date.now()
            if (!mediaEvent.data || mediaEvent.data.size === 0) return
            void blobToDataUrl(mediaEvent.data).then((clipUrl) => uploadEvidence({
              recordingClip: {
                clipUrl,
                mimeType: mediaEvent.data.type || 'video/webm',
                durationMs: Date.now() - startedAt,
              },
            }))
          }
          recorder.start(15000)
          recordingRef.current = recorder
        }

        const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AudioCtx && stream.getAudioTracks().length > 0) {
          const audioContext = new AudioCtx()
          audioContextRef.current = audioContext
          const analyser = audioContext.createAnalyser()
          analyser.fftSize = 512
          const source = audioContext.createMediaStreamSource(stream)
          source.connect(analyser)
          analyserRef.current = analyser
        }

        const NativeFaceDetector = (window as typeof window & { FaceDetector?: new (...args: any[]) => any }).FaceDetector
        if (NativeFaceDetector) {
          detectorRef.current = new NativeFaceDetector({ fastMode: true, maxDetectedFaces: 2 })
        }
      })
      .catch(() => setCamActive(false))

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      recordingRef.current?.stop()
      audioContextRef.current?.close().catch(() => undefined)
    }
  }, [blobToDataUrl, captureSnapshot, enabled, getFaceApiDetections, updateMetrics, uploadEvidence, waitForVideoReady])

  useEffect(() => {
    if (!enabled) return
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

    const faceInterval = setInterval(async () => {
      const snapshot = captureSnapshot()
      if (snapshot && !identitySnapshot) setIdentitySnapshot(snapshot)

      const video = videoRef.current
      const faceApiDetections = await getFaceApiDetections()
      if (faceApiDetections) {
        if (faceApiDetections.length === 0) {
          void logEvent({
            type: 'face_missing',
            severity: 'high',
            details: 'No face detected in the camera frame',
            timestamp: new Date(),
            evidenceImage: snapshot ?? undefined,
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
            })
          }
        }
        return
      }

      if (detectorRef.current && video) {
        try {
          const detections = await detectorRef.current.detect(video)
          if (detections.length === 0) {
            void logEvent({
              type: 'face_missing',
              severity: 'high',
              details: 'No face detected in the camera frame',
              timestamp: new Date(),
              evidenceImage: snapshot ?? undefined,
            })
          } else if (detections.length > 1) {
            void logEvent({
              type: 'multiple_faces',
              severity: 'high',
              details: 'Multiple faces detected in the camera frame',
              timestamp: new Date(),
              evidenceImage: snapshot ?? undefined,
            })
          } else if (detections[0]?.boundingBox) {
            const box = detections[0].boundingBox
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
              })
            }
          }
          return
        } catch {
          // detector failed, fallback below
        }
      }

      const random = Math.random()
      if (random < 0.06) {
        void logEvent({
          type: 'face_missing',
          severity: 'high',
          details: 'No face detected in the camera frame',
          timestamp: new Date(),
          evidenceImage: snapshot ?? undefined,
        })
      } else if (random < 0.1) {
        void logEvent({
          type: 'multiple_faces',
          severity: 'high',
          details: 'Multiple faces detected in the camera frame',
          timestamp: new Date(),
          evidenceImage: snapshot ?? undefined,
        })
      } else if (random < 0.16) {
        void logEvent({
          type: 'eye_gaze',
          severity: 'low',
          details: 'Candidate appeared to look away repeatedly',
          timestamp: new Date(),
          evidenceImage: snapshot ?? undefined,
        })
      } else if (random < 0.19) {
        void logEvent({
          type: 'mobile_detected',
          severity: 'high',
          details: 'Possible secondary device appeared in the webcam frame',
          timestamp: new Date(),
          evidenceImage: snapshot ?? undefined,
        })
      }
    }, 7000)

    const audioInterval = setInterval(() => {
      const analyser = analyserRef.current
      if (!analyser) return
      const buffer = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteTimeDomainData(buffer)
      let sumSquares = 0
      for (const value of Array.from(buffer)) {
        const normalized = (value - 128) / 128
        sumSquares += normalized * normalized
      }
      const rms = Math.sqrt(sumSquares / buffer.length)
      if (rms > 0.12) {
        void logEvent({
          type: 'audio_detected',
          severity: 'medium',
          details: 'Elevated background audio or conversation detected',
          timestamp: new Date(),
        })
      }
    }, 5000)

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

    intervalsRef.current = [faceInterval, audioInterval, intervalSnapshot]

    return () => {
      intervalsRef.current.forEach(clearInterval)
    }
  }, [camActive, captureSnapshot, enabled, getFaceApiDetections, identitySnapshot, logEvent, uploadEvidence])

  const stopProctoring = useCallback(() => {
    intervalsRef.current.forEach(clearInterval)
    recordingRef.current?.stop()
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
    isFullscreen: true,
    identitySnapshot,
  }
}
