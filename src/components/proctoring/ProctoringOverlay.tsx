'use client'

import type { RefObject } from 'react'
import { Shield, ShieldAlert, ShieldX, WifiOff, AlertTriangle, Mic, Camera, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProctoringEvent } from '@/hooks/useProctoring'

interface ProctoringOverlayProps {
  videoRef: RefObject<HTMLVideoElement>
  camActive: boolean
  riskScore: number
  status: 'clean' | 'warning' | 'flagged'
  events: ProctoringEvent[]
  recorderSupported: boolean
  isFullscreen: boolean
  sessionMetrics: {
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
    secureBrowserMode: 'seb' | 'standard'
    secureBrowserTrust: 'high' | 'reduced'
    detectorMode: 'python_primary' | 'browser_fallback'
    pythonLastAnalyzeAt?: string
    pythonLastAnalyzeSuccessAt?: string
    pythonLastAnalyzeFailureReason?: string
    pythonAnalyzeAttempts: number
    pythonAnalyzeSuccessCount: number
    pythonAnalyzeFailureCount: number
    lastSnapshotCapturedAt?: string
    lastSnapshotCaptureFailedReason?: string
  }
  identitySnapshot?: string | null
}

const SEVERITY_COLORS = {
  low: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  medium: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  high: 'text-red-400   bg-red-400/10    border-red-400/20',
}

const EVENT_LABELS: Record<string, string> = {
  face_missing: 'Face Missing',
  multiple_faces: 'Multiple Faces',
  tab_switch: 'Tab Switch',
  audio_detected: 'Audio Detected',
  eye_gaze: 'Eye Gaze Alert',
  mobile_detected: 'Mobile Detected',
  print_screen: 'Screen Capture Key',
  devtools_shortcut: 'Restricted Shortcut',
  network_change: 'Network Change',
  identity_unverified: 'Identity / Device Change',
}

export function ProctoringOverlay({
  videoRef,
  camActive,
  riskScore,
  status,
  events,
  recorderSupported,
  isFullscreen,
  sessionMetrics,
  identitySnapshot,
}: ProctoringOverlayProps) {
  const StatusIcon = status === 'flagged' ? ShieldX : status === 'warning' ? ShieldAlert : Shield

  return (
    <div className="flex flex-col gap-3">
      <div className="relative rounded-xl overflow-hidden border border-surface-3 bg-surface-1 aspect-video">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cn(
            'w-full h-full object-cover scale-x-[-1]',
            camActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        />
        {camActive ? (
          <>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute w-full h-0.5 bg-brand-500/30 animate-scan" />
            </div>
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brand-400" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brand-400" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brand-400" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brand-400" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-1">
              <span className="text-[10px] text-brand-400 font-mono">LIVE</span>
              <span className="flex items-center gap-1 text-[10px] text-ok font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-ok animate-pulse inline-block" />
                AI MONITORING
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <WifiOff className="w-8 h-8" />
            <p className="text-xs">Camera unavailable</p>
          </div>
        )}
      </div>

      <div
        className={cn(
          'rounded-xl border p-3 transition-colors',
          status === 'flagged'
            ? 'border-danger/40 bg-danger/10'
            : status === 'warning'
            ? 'border-warn/40 bg-warn/10'
            : 'border-surface-3 bg-surface-1'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon
              className={cn(
                'w-4 h-4',
                status === 'flagged' ? 'text-danger' : status === 'warning' ? 'text-warn' : 'text-ok'
              )}
            />
            <span className="text-xs font-semibold text-gray-300">Risk Score</span>
          </div>
          <span
            className={cn(
              'text-sm font-bold font-mono',
              status === 'flagged' ? 'text-danger' : status === 'warning' ? 'text-warn' : 'text-ok'
            )}
          >
            {riskScore}/100
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              status === 'flagged' ? 'bg-danger' : status === 'warning' ? 'bg-warn' : 'bg-ok'
            )}
            style={{ width: `${riskScore}%` }}
          />
        </div>
        <p
          className={cn(
            'text-[10px] mt-1.5 font-medium',
            status === 'flagged' ? 'text-danger' : status === 'warning' ? 'text-warn' : 'text-ok'
          )}
        >
          {status === 'flagged'
            ? 'Exam flagged for review'
            : status === 'warning'
            ? 'Multiple violations detected'
            : 'All clear'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          {
            label: 'Audio',
            value: sessionMetrics.audioMonitoringActive ? 'Active' : 'Off',
            icon: Mic,
            tone: sessionMetrics.audioMonitoringActive ? 'text-ok' : 'text-warn',
          },
          {
            label: 'Recording',
            value: recorderSupported ? 'Ready' : 'Basic',
            icon: Camera,
            tone: recorderSupported ? 'text-ok' : 'text-warn',
          },
          {
            label: 'Devices',
            value: `${sessionMetrics.deviceChanges} changes`,
            icon: Smartphone,
            tone: sessionMetrics.deviceChanges ? 'text-danger' : 'text-gray-300',
          },
          {
            label: 'Network',
            value: `${sessionMetrics.networkDisconnects} drops`,
            icon: Smartphone,
            tone: sessionMetrics.networkDisconnects ? 'text-warn' : 'text-gray-300',
          },
          {
            label: 'Python AI',
            value: sessionMetrics.pythonServiceStatus,
            icon: Shield,
            tone:
              sessionMetrics.pythonServiceStatus === 'healthy'
                ? 'text-ok'
                : sessionMetrics.pythonServiceStatus === 'degraded'
                ? 'text-warn'
                : 'text-danger',
          },
          {
            label: 'Analyze',
            value: sessionMetrics.pythonAnalyzeStatus,
            icon: ShieldAlert,
            tone:
              sessionMetrics.pythonAnalyzeStatus === 'healthy'
                ? 'text-ok'
                : sessionMetrics.pythonAnalyzeStatus === 'degraded'
                ? 'text-warn'
                : 'text-danger',
          },
          {
            label: 'Detector',
            value: sessionMetrics.detectorMode === 'python_primary' ? 'Python' : 'Browser',
            icon: ShieldAlert,
            tone: sessionMetrics.detectorMode === 'python_primary' ? 'text-ok' : 'text-warn',
          },
          {
            label: 'Secure Browser',
            value: sessionMetrics.secureBrowserMode === 'seb' ? 'SEB mode' : 'Standard',
            icon: Shield,
            tone: sessionMetrics.secureBrowserTrust === 'high' ? 'text-ok' : 'text-warn',
          },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-surface-3 bg-surface-1 p-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <div className={cn('text-xs font-semibold', tone)}>{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-surface-3 bg-surface-1 p-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Diagnostics
        </div>
        <div className="space-y-1 text-[11px]">
          <p className="text-gray-400">Last Analyze: <span className="text-gray-200">{sessionMetrics.pythonLastAnalyzeAt ? new Date(sessionMetrics.pythonLastAnalyzeAt).toLocaleTimeString('en-IN') : 'never'}</span></p>
          <p className="text-gray-400">Last Success: <span className="text-gray-200">{sessionMetrics.pythonLastAnalyzeSuccessAt ? new Date(sessionMetrics.pythonLastAnalyzeSuccessAt).toLocaleTimeString('en-IN') : 'never'}</span></p>
          <p className="text-gray-400">Snapshot: <span className="text-gray-200">{sessionMetrics.lastSnapshotCapturedAt ? 'fresh' : 'missing'}</span></p>
          <p className="text-gray-400">Analyze Rate: <span className="text-gray-200">{sessionMetrics.pythonAnalyzeSuccessCount}/{sessionMetrics.pythonAnalyzeAttempts}</span></p>
          <p className="text-gray-400">Failure: <span className="text-gray-200">{sessionMetrics.pythonLastAnalyzeFailureReason || sessionMetrics.lastSnapshotCaptureFailedReason || 'none'}</span></p>
        </div>
      </div>

      {identitySnapshot && (
        <div className="rounded-xl border border-surface-3 bg-surface-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-3 flex items-center gap-2">
            <Camera className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-xs font-semibold text-gray-400">Identity Snapshot</span>
          </div>
          <img src={identitySnapshot} alt="Identity snapshot" className="w-full aspect-video object-cover" />
        </div>
      )}

      {events.length > 0 && (
        <div className="rounded-xl border border-surface-3 bg-surface-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warn" />
            <span className="text-xs font-semibold text-gray-400">Recent Alerts</span>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y divide-surface-3">
            {events.slice(0, 6).map((ev, i) => (
              <div
                key={i}
                className={cn('px-3 py-2 border-l-2', {
                  'border-red-500': ev.severity === 'high',
                  'border-orange-400': ev.severity === 'medium',
                  'border-yellow-400': ev.severity === 'low',
                })}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-gray-200">{EVENT_LABELS[ev.type] ?? ev.type}</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-mono uppercase', SEVERITY_COLORS[ev.severity])}>
                    {ev.severity}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">{ev.details}</p>
                <p className="text-[9px] text-gray-600 mt-1 font-mono">
                  {(ev.detectorDetails?.sourceMode === 'python_primary' ? 'python' : 'browser')}{ev.confidence !== undefined ? ` · ${Math.round(ev.confidence * 100)}%` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
