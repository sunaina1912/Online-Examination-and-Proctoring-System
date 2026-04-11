'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Shield, ShieldAlert, ShieldX,
  CheckCircle, XCircle, Loader2, Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'

const EVENT_META: Record<string, { label: string; color: string }> = {
  face_missing: { label: 'Face Missing', color: 'text-red-400' },
  multiple_faces: { label: 'Multiple Faces', color: 'text-red-400' },
  tab_switch: { label: 'Tab Switch', color: 'text-orange-400' },
  audio_detected: { label: 'Audio Detected', color: 'text-orange-400' },
  eye_gaze: { label: 'Eye Gaze Alert', color: 'text-yellow-400' },
  mobile_detected: { label: 'Mobile Detected', color: 'text-red-400' },
  print_screen: { label: 'Screen Capture', color: 'text-red-400' },
  devtools_shortcut: { label: 'Restricted Shortcut', color: 'text-orange-400' },
  network_change: { label: 'Network Change', color: 'text-yellow-400' },
  identity_unverified: { label: 'Identity / Device Change', color: 'text-red-400' },
}

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400',
  medium: 'bg-orange-400/10 border-orange-400/20 text-orange-400',
  high: 'bg-red-400/10 border-red-400/20 text-red-400',
}

export default function SubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [sub, setSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then((response) => response.json())
      .then((data) => {
        setSub(data.submission)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (!sub) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Submission not found</div>
  }

  const StatusIcon = sub.riskScore >= 80 ? ShieldX : sub.riskScore >= 40 ? ShieldAlert : Shield
  const eventCounts = sub.proctoringEvents?.reduce((acc: any, event: any) => {
    acc[event.type] = (acc[event.type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-8 max-w-6xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to reports
      </button>

      <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white mb-1">
              {sub.studentId?.name ?? 'Student'} - Submission Report
            </h1>
            <p className="text-sm text-gray-500">{sub.examId?.title ?? 'Exam'}</p>
            <p className="text-xs text-gray-600 mt-1">{sub.studentId?.email}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                'flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full border',
                sub.status === 'flagged'
                  ? 'bg-danger/10 border-danger/20 text-danger'
                  : sub.passed
                  ? 'bg-ok/10 border-ok/20 text-ok'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              )}
            >
              {sub.status === 'flagged' ? (
                <>
                  <ShieldX className="w-4 h-4" /> Flagged
                </>
              ) : sub.passed ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Passed
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" /> Failed
                </>
              )}
            </span>
            {sub.submittedAt && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(sub.submittedAt).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Score', value: `${sub.score} / ${sub.examId?.totalMarks}`, color: sub.passed ? 'text-ok' : 'text-danger' },
          { label: 'Percentage', value: `${sub.percentage}%`, color: sub.passed ? 'text-ok' : 'text-danger' },
          { label: 'Risk Score', value: `${sub.riskScore} / 100`, color: sub.riskScore >= 80 ? 'text-danger' : sub.riskScore >= 40 ? 'text-warn' : 'text-ok' },
          { label: 'Plagiarism', value: `${sub.plagiarismScore ?? 0}%`, color: (sub.plagiarismScore ?? 0) >= 80 ? 'text-danger' : (sub.plagiarismScore ?? 0) >= 40 ? 'text-warn' : 'text-ok' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-1 border border-surface-3 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-2">{label}</p>
            <p className={cn('text-2xl font-display font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center gap-2">
            <StatusIcon className={cn('w-4 h-4', sub.riskScore >= 80 ? 'text-danger' : sub.riskScore >= 40 ? 'text-warn' : 'text-ok')} />
            <h2 className="font-semibold text-white text-sm">Violation Breakdown</h2>
          </div>

          <div className="px-5 py-4 border-b border-surface-3">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Risk Score</span>
              <span className="font-mono font-bold text-gray-300">{sub.riskScore}/100</span>
            </div>
            <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', sub.riskScore >= 80 ? 'bg-danger' : sub.riskScore >= 40 ? 'bg-warn' : 'bg-ok')}
                style={{ width: `${sub.riskScore}%` }}
              />
            </div>
          </div>

          <div className="divide-y divide-surface-3">
            {Object.entries(eventCounts ?? {}).map(([type, count]) => (
              <div key={type} className="px-5 py-3 flex items-center justify-between">
                <span className={cn('text-sm font-medium', EVENT_META[type]?.color ?? 'text-gray-300')}>
                  {EVENT_META[type]?.label ?? type}
                </span>
                <span className="text-xs font-mono bg-surface-2 border border-surface-3 text-gray-300 px-2 py-1 rounded-lg">
                  x{count as number}
                </span>
              </div>
            ))}
            {!Object.keys(eventCounts ?? {}).length && (
              <p className="px-5 py-6 text-sm text-gray-600 text-center">No violations detected</p>
            )}
          </div>
        </div>

        <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="font-semibold text-white text-sm">Event Timeline</h2>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-surface-3">
            {sub.proctoringEvents?.length === 0 && (
              <p className="px-5 py-6 text-sm text-gray-600 text-center">No events recorded</p>
            )}
            {sub.proctoringEvents?.map((event: any, index: number) => (
              <div
                key={index}
                className={cn(
                  'px-5 py-3 border-l-2',
                  event.severity === 'high'
                    ? 'border-red-500'
                    : event.severity === 'medium'
                    ? 'border-orange-400'
                    : 'border-yellow-400'
                )}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={cn('text-xs font-semibold', EVENT_META[event.type]?.color ?? 'text-gray-300')}>
                    {EVENT_META[event.type]?.label ?? event.type}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase', SEVERITY_BADGE[event.severity])}>
                      {event.severity}
                    </span>
                    <span className="text-[10px] text-gray-600 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">{event.details}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="font-semibold text-white text-sm">Session Integrity</h2>
          </div>
          <div className="divide-y divide-surface-3 text-sm">
            {[
              ['Secure Browser', sub.secureBrowserDetected ? 'Detected' : 'Standard Browser'],
              ['Grace Used', sub.graceUsed ? 'Yes' : 'No'],
              ['Device Changes', sub.sessionMetrics?.deviceChanges ?? 0],
              ['Network Disconnects', sub.sessionMetrics?.networkDisconnects ?? 0],
              ['Audio Monitoring', sub.sessionMetrics?.audioMonitoringActive ? 'Active' : 'Unavailable'],
            ].map(([label, value]) => (
              <div key={String(label)} className="px-5 py-3 flex items-center justify-between">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-200 font-medium">{value as any}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="font-semibold text-white text-sm">Plagiarism Signals</h2>
          </div>
          <div className="divide-y divide-surface-3">
            {!sub.plagiarismFlags?.length && (
              <p className="px-5 py-6 text-sm text-gray-600 text-center">No strong plagiarism signals were detected</p>
            )}
            {sub.plagiarismFlags?.map((flag: any, index: number) => (
              <div key={index} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-warn">
                    Question {sub.examId?.questions?.findIndex((question: any) => question._id?.toString() === flag.questionId) + 1}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{Math.round((flag.similarity ?? 0) * 100)}%</span>
                </div>
                <p className="text-xs text-gray-400">{flag.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {sub.evidenceSnapshots?.length > 0 && (
        <div className="mt-6 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="font-semibold text-white text-sm">Incident Snapshots</h2>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 p-5">
            {sub.evidenceSnapshots.map((snapshot: any, index: number) => (
              <div key={index} className="border border-surface-3 rounded-xl overflow-hidden bg-surface-2">
                <img src={snapshot.imageUrl} alt={snapshot.details} className="w-full aspect-video object-cover" />
                <div className="p-3">
                  <p className="text-xs text-gray-300 mb-1">{snapshot.details}</p>
                  <p className="text-[10px] text-gray-500">{new Date(snapshot.timestamp).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub.recordingClips?.length > 0 && (
        <div className="mt-6 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="font-semibold text-white text-sm">Review Clips</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-4 p-5">
            {sub.recordingClips.map((clip: any, index: number) => (
              <div key={index} className="border border-surface-3 rounded-xl overflow-hidden bg-surface-2">
                <video controls className="w-full aspect-video bg-black">
                  <source src={clip.clipUrl} type={clip.mimeType} />
                </video>
                <div className="p-3 flex items-center justify-between text-xs">
                  <span className="text-gray-300">{new Date(clip.timestamp).toLocaleString('en-IN')}</span>
                  <span className="text-gray-500">{Math.round((clip.durationMs ?? 0) / 1000)}s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub.answers?.length > 0 && sub.examId?.questions && (
        <div className="mt-6 bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="font-semibold text-white text-sm">Answer Review</h2>
          </div>
          <div className="divide-y divide-surface-3">
            {sub.examId.questions.map((question: any, index: number) => {
              const answer = sub.answers.find((item: any) => item.questionId === question._id?.toString())
              const correct = question.type === 'mcq' && answer?.selectedOption === question.correctAnswer
              return (
                <div key={index} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
                        question.type !== 'mcq' ? 'bg-brand-500/20' : correct ? 'bg-ok/20' : 'bg-danger/20'
                      )}
                    >
                      {question.type !== 'mcq' ? (
                        <span className="text-[10px] text-brand-400 font-bold">D</span>
                      ) : correct ? (
                        <CheckCircle className="w-3.5 h-3.5 text-ok" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-danger" />
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-200 mb-2">
                        <span className="text-gray-500 mr-2">Q{index + 1}.</span>
                        {question.text}
                      </p>
                      {question.type === 'mcq' && (
                        <div className="flex gap-4 text-xs flex-wrap">
                          <span className="text-gray-500">
                            Selected:{' '}
                            <span className="text-gray-200">
                              {answer?.selectedOption !== undefined ? question.options?.[answer.selectedOption] ?? '-' : 'Not answered'}
                            </span>
                          </span>
                          <span className="text-gray-500">
                            Correct: <span className="text-ok">{question.options?.[question.correctAnswer] ?? '-'}</span>
                          </span>
                        </div>
                      )}
                      {question.type === 'descriptive' && answer?.textAnswer && (
                        <p className="text-xs text-gray-400 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 mt-1">
                          {answer.textAnswer}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-mono text-gray-600">{question.marks}m</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
