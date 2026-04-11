'use client'

import { useEffect, useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoad] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/reports')
      .then((response) => response.json())
      .then((payload) => {
        setData(payload)
        setLoad(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  const { stats, recentSubmissions } = data

  const statCards = [
    { label: 'Total Exams', value: stats.totalExams, color: 'text-brand-400' },
    { label: 'Students', value: stats.totalStudents, color: 'text-ok' },
    { label: 'Submissions', value: stats.totalSubmissions, color: 'text-brand-300' },
    { label: 'Flagged', value: stats.flaggedCount, color: 'text-danger' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, color: 'text-ok' },
    { label: 'Avg Score', value: `${stats.avgScore}%`, color: 'text-warn' },
  ]

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold text-white mb-1">Reports</h1>
      <p className="text-gray-500 text-sm mb-8">Analytics, evidence snapshots and submission review</p>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-surface-1 border border-surface-3 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-2">{label}</p>
            <p className={cn('text-2xl font-display font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-3">
          <h2 className="font-semibold text-white">Recent Submissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-3">
                {['Student', 'Exam', 'Score', 'Status', 'Risk', 'Plagiarism', 'Evidence', 'Submitted', ''].map((header) => (
                  <th key={header} className="text-left px-5 py-3 text-xs text-gray-500 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-3">
              {recentSubmissions?.map((submission: any) => (
                <tr
                  key={submission._id}
                  onClick={() => router.push(`/admin/reports/${submission._id}`)}
                  className="hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-gray-200">{submission.studentId?.name ?? '-'}</p>
                    <p className="text-xs text-gray-500">{submission.studentId?.email ?? ''}</p>
                  </td>
                  <td className="px-5 py-3.5 text-gray-300">{submission.examId?.title ?? '-'}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('font-mono font-bold', submission.passed ? 'text-ok' : 'text-danger')}>
                      {submission.percentage}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-1 rounded-full border',
                        submission.status === 'flagged'
                          ? 'bg-danger/10 border-danger/20 text-danger'
                          : submission.passed
                          ? 'bg-ok/10 border-ok/20 text-ok'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      )}
                    >
                      {submission.status === 'flagged' ? 'Flagged' : submission.passed ? 'Pass' : 'Fail'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            submission.riskScore >= 80 ? 'bg-danger' : submission.riskScore >= 40 ? 'bg-warn' : 'bg-ok'
                          )}
                          style={{ width: `${submission.riskScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-400">{submission.riskScore}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        'text-xs font-mono',
                        (submission.plagiarismScore ?? 0) >= 80
                          ? 'text-danger'
                          : (submission.plagiarismScore ?? 0) >= 40
                          ? 'text-warn'
                          : 'text-gray-400'
                      )}
                    >
                      {submission.plagiarismScore ?? 0}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                    {submission.evidenceSnapshots?.length ?? 0}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {submission.submittedAt
                      ? new Date(submission.submittedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </td>
                  <td className="px-3 py-3.5">
                    <ExternalLink className="w-3.5 h-3.5 text-gray-600" />
                  </td>
                </tr>
              ))}
              {!recentSubmissions?.length && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-gray-500 text-sm">
                    No submissions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
