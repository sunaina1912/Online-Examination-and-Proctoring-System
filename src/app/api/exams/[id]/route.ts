import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Exam from '@/models/Exam'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await dbConnect()
    const role = (session.user as any).role
    const exam = await Exam.findById(params.id)
    if (!exam) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Strip correct answers for students
    if (role === 'student') {
      const now = Date.now()
      const start = exam.startTime ? new Date(exam.startTime).getTime() : null
      const end = exam.endTime ? new Date(exam.endTime).getTime() : null
      const available = exam.isActive && (!start || now >= start) && (!end || now <= end)
      if (!available) {
        return NextResponse.json({ error: 'Exam is not available for this user right now' }, { status: 403 })
      }
      const safe = exam.toObject()
      safe.questions = safe.questions.map((q: any) => {
        const { correctAnswer, ...rest } = q
        return rest
      })
      return NextResponse.json({ exam: safe })
    }

    return NextResponse.json({ exam })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (role !== 'admin' && role !== 'examiner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    await dbConnect()
    const exam = await Exam.findByIdAndUpdate(params.id, body, { new: true })
    return NextResponse.json({ exam })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await dbConnect()
    await Exam.findByIdAndDelete(params.id)
    return NextResponse.json({ message: 'Deleted' })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
