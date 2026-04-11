import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Exam from '@/models/Exam'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await dbConnect()

    const role = (session.user as any).role
    const userId = (session.user as any).id

    let exams
    if (role === 'admin' || role === 'examiner') {
      exams = await Exam.find({}).populate('createdBy', 'name email').sort({ createdAt: -1 })
    } else {
      exams = await Exam.find({ isActive: true }).select('-questions.correctAnswer').sort({ createdAt: -1 })
    }

    return NextResponse.json({ exams })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (session.user as any).role
    if (role !== 'admin' && role !== 'examiner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    await dbConnect()

    const exam = await Exam.create({
      ...body,
      createdBy: (session.user as any).id,
    })

    return NextResponse.json({ exam }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
