import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'

export async function GET(
  _: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await dbConnect()

    const submission = await Submission.findById(params.id)
      .populate('studentId', 'name email')
      .populate('examId', 'title totalMarks passingMarks duration questions')

    if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const role    = (session.user as any).role
    const userId  = (session.user as any).id

    // Students can only see their own
    if (role === 'student' && submission.studentId._id.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ submission })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
