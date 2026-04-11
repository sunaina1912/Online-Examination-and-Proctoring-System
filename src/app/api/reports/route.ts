import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'
import Exam from '@/models/Exam'
import User from '@/models/User'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (role !== 'admin' && role !== 'examiner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await dbConnect()

    const [totalExams, totalStudents, totalSubmissions, flaggedCount] = await Promise.all([
      Exam.countDocuments(),
      User.countDocuments({ role: 'student' }),
      Submission.countDocuments({ status: { $in: ['submitted', 'flagged'] } }),
      Submission.countDocuments({ status: 'flagged' }),
    ])

    const recentSubmissions = await Submission.find({ status: { $in: ['submitted', 'flagged'] } })
      .populate('studentId', 'name email')
      .populate('examId', 'title')
      .sort({ submittedAt: -1 })
      .limit(10)

    // Pass rate
    const passCount = await Submission.countDocuments({ status: { $in: ['submitted', 'flagged'] }, passed: true })
    const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0

    // Avg score
    const scoreAgg = await Submission.aggregate([
      { $match: { status: { $in: ['submitted', 'flagged'] } } },
      { $group: { _id: null, avgScore: { $avg: '$percentage' } } },
    ])
    const avgScore = scoreAgg[0]?.avgScore ? Math.round(scoreAgg[0].avgScore) : 0

    // Risk distribution
    const riskAgg = await Submission.aggregate([
      { $match: { status: { $in: ['submitted', 'flagged'] } } },
      {
        $bucket: {
          groupBy: '$riskScore',
          boundaries: [0, 25, 50, 75, 101],
          default: 'Other',
          output: { count: { $sum: 1 } },
        },
      },
    ])

    return NextResponse.json({
      stats: { totalExams, totalStudents, totalSubmissions, flaggedCount, passRate, avgScore },
      recentSubmissions,
      riskDistribution: riskAgg,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
