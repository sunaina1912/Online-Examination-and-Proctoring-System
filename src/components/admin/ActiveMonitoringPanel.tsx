'use client'

import { useEffect, useState } from 'react'
import { Loader2, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ActiveMonitoringPanel() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/monitoring/active')
        const payload = await response.json()
        if (!cancelled) {
          setSessions(payload.sessions ?? [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchSessions()
    const interval = window.setInterval(fetchSessions, 5000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-brand-400" />
          <h2 className="font-semibold text-white text-sm">Active Monitoring</h2>
        </div>
        <span className="text-[11px] text-gray-500">{sessions.length} live</span>
      </div>
      {loading ? (
        <div className="px-5 py-8 flex items-center justify-center text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-500 text-center">No active exam sessions right now</p>
      ) : (
        <div className="divide-y divide-surface-3">
          {sessions.map((session) => (
            <div key={session.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-200">{session.student?.name ?? 'Student'}</p>
                  <p className="text-xs text-gray-500">{session.exam?.title ?? 'Exam'}</p>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold px-2 py-1 rounded-full border',
                    session.riskScore >= 80
                      ? 'bg-danger/10 border-danger/20 text-danger'
                      : session.riskScore >= 40
                      ? 'bg-warn/10 border-warn/20 text-warn'
                      : 'bg-ok/10 border-ok/20 text-ok'
                  )}
                >
                  Risk {session.riskScore}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
                <span>Detector: {session.detectorMode === 'python_primary' ? 'Python' : 'Browser'}</span>
                <span>Python: {session.pythonServiceStatus}</span>
                <span>Analyze: {session.pythonAnalyzeStatus}</span>
                <span>Evidence: {session.evidenceCount}</span>
                <span>Clips: {session.recordingClipCount}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600 font-mono">
                <span>Last analyze: {session.lastAnalyzeAt ? new Date(session.lastAnalyzeAt).toLocaleTimeString('en-IN') : 'never'}</span>
                <span>Snapshot: {session.lastSnapshotCapturedAt ? 'fresh' : 'missing'}</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-400">
                {session.latestEvent?.details ?? session.lastAnalyzeFailureReason ?? 'Awaiting first proctoring event'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
