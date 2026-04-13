import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Exam from '@/models/Exam'
import Submission from '@/models/Submission'
import User from '@/models/User'
import { BookOpen, Users, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ActiveMonitoringPanel } from '@/components/admin/ActiveMonitoringPanel'

async function getStats(role: string, userId: string) {
  await dbConnect()
  if (role === 'student') {
    const mySubmissions = await Submission.find({ studentId: userId })
      .populate('examId', 'title totalMarks duration')
      .sort({ createdAt: -1 }).limit(5)
    const activeExams = await Exam.find({ isActive: true }).select('title duration totalMarks').limit(5)
    return { mySubmissions, activeExams, isStudent: true }
  }
  const [totalExams, totalStudents, totalSubmissions, flaggedCount] = await Promise.all([
    Exam.countDocuments(),
    User.countDocuments({ role: 'student' }),
    Submission.countDocuments({ status: { $in: ['submitted', 'flagged'] } }),
    Submission.countDocuments({ status: 'flagged' }),
  ])
  const recentExams = await Exam.find().sort({ createdAt: -1 }).limit(5)
  const recentSubs  = await Submission.find({ status: { $in: ['submitted', 'flagged'] } })
    .populate('studentId', 'name').populate('examId', 'title')
    .sort({ submittedAt: -1 }).limit(6)
  return { totalExams, totalStudents, totalSubmissions, flaggedCount, recentExams, recentSubs, isStudent: false }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user    = session!.user as any
  const data    = await getStats(user.role, user.id)

  if (data.isStudent) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-bold text-white mb-1">My Exams</h1>
        <p className="text-gray-500 text-sm mb-8">Available and completed examinations</p>

        <div className="grid gap-4 mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Available Now</h2>
          {data.activeExams?.length === 0 && (
            <p className="text-gray-500 text-sm">No active exams at the moment.</p>
          )}
          {data.activeExams?.map((exam: any) => (
            <div key={exam._id} className="bg-surface-1 border border-surface-3 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{exam.title}</p>
                <p className="text-xs text-gray-500 mt-1">{exam.duration} min · {exam.totalMarks} marks</p>
              </div>
              <Link href={`/exam/${exam._id}`} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm px-4 py-2 rounded-xl transition-colors font-medium">
                Start <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <div className="grid gap-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">My Results</h2>
          {data.mySubmissions?.map((sub: any) => (
            <div key={sub._id} className="bg-surface-1 border border-surface-3 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{sub.examId?.title ?? 'Exam'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {sub.status === 'in_progress' ? 'In Progress' : `Score: ${sub.percentage}%`}
                </p>
              </div>
              <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full border',
                sub.status === 'flagged'     ? 'bg-danger/10 border-danger/30 text-danger' :
                sub.passed                   ? 'bg-ok/10 border-ok/30 text-ok' :
                sub.status === 'submitted'   ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                'bg-surface-3 border-surface-3 text-gray-400'
              )}>
                {sub.status === 'flagged' ? 'Flagged' : sub.passed ? 'Passed' : sub.status === 'submitted' ? 'Failed' : 'In Progress'}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Exams',    value: data.totalExams,      icon: BookOpen,       color: 'text-brand-400'  },
    { label: 'Students',       value: data.totalStudents,   icon: Users,          color: 'text-ok'         },
    { label: 'Submissions',    value: data.totalSubmissions, icon: CheckCircle,   color: 'text-brand-300'  },
    { label: 'Flagged',        value: data.flaggedCount,    icon: AlertTriangle,  color: 'text-danger'     },
  ]

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">Platform overview and recent activity</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface-1 border border-surface-3 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 font-medium">{label}</span>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <p className={cn('text-3xl font-display font-bold', color)}>{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Exams */}
        <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">Recent Exams</h2>
            <Link href="/admin/exams" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
          </div>
          <div className="divide-y divide-surface-3">
            {data.recentExams?.map((exam: any) => (
              <div key={exam._id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">{exam.title}</p>
                  <p className="text-xs text-gray-500">{exam.duration}m · {exam.totalMarks} marks</p>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full border',
                  exam.isActive
                    ? 'bg-ok/10 border-ok/20 text-ok'
                    : 'bg-surface-3 border-surface-3 text-gray-500'
                )}>
                  {exam.isActive ? 'Active' : 'Draft'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-surface-1 border border-surface-3 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm">Recent Submissions</h2>
            <Link href="/admin/reports" className="text-xs text-brand-400 hover:text-brand-300">View all →</Link>
          </div>
          <div className="divide-y divide-surface-3">
            {data.recentSubs?.map((sub: any) => (
              <div key={sub._id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-200">{(sub.studentId as any)?.name ?? 'Student'}</p>
                  <p className="text-xs text-gray-500">{(sub.examId as any)?.title ?? ''} · {sub.percentage}%</p>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full border',
                  sub.status === 'flagged'
                    ? 'bg-danger/10 border-danger/20 text-danger'
                    : sub.passed
                    ? 'bg-ok/10 border-ok/20 text-ok'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                )}>
                  {sub.status === 'flagged' ? 'Flagged' : sub.passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ActiveMonitoringPanel />
      </div>
    </div>
  )
}
