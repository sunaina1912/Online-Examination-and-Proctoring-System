import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'
import Exam from '@/models/Exam'
import { buildExamDelivery, detectPlagiarism, getDeliveredQuestions, scoreSubmission } from '@/lib/exam'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { examId, action, answers, submissionId, currentQuestionIndex } = await req.json()
    await dbConnect()

    const studentId = (session.user as any).id

    // START exam
    if (action === 'start') {
      const existing = await Submission.findOne({ examId, studentId, status: 'in_progress' })
      const exam = await Exam.findById(examId)
      if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

      if (existing) {
        const remainingSeconds = existing.graceExpiresAt
          ? Math.max(-30, Math.floor((new Date(existing.graceExpiresAt).getTime() - Date.now()) / 1000))
          : exam.duration * 60
        return NextResponse.json({
          submission: existing,
          deliveredQuestions: getDeliveredQuestions(exam, {
            questionOrder: existing.questionOrder,
            optionOrders: existing.optionOrders,
          }),
          answers: existing.answers ?? [],
          currentQuestionIndex: existing.currentQuestionIndex ?? 0,
          remainingSeconds,
          resumed: true,
        })
      }

      const delivery = buildExamDelivery(exam)
      const submission = await Submission.create({
        examId,
        studentId,
        startedAt: new Date(),
        questionOrder: delivery.questionOrder,
        optionOrders: delivery.optionOrders,
        graceExpiresAt: new Date(Date.now() + ((exam.duration * 60) + 30) * 1000),
        secureBrowserDetected: /safe exam browser|seb/i.test(req.headers.get('user-agent') ?? ''),
      })

      return NextResponse.json(
        {
          submission,
          deliveredQuestions: getDeliveredQuestions(exam, delivery),
          answers: [],
          currentQuestionIndex: 0,
          remainingSeconds: exam.duration * 60,
          resumed: false,
        },
        { status: 201 }
      )
    }

    if (action === 'progress') {
      const submission = await Submission.findById(submissionId)
      if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (submission.status !== 'in_progress') {
        return NextResponse.json({ error: 'Submission already finished' }, { status: 400 })
      }

      submission.answers = answers ?? submission.answers
      submission.currentQuestionIndex = typeof currentQuestionIndex === 'number'
        ? currentQuestionIndex
        : submission.currentQuestionIndex
      submission.lastSavedAt = new Date()
      await submission.save()

      return NextResponse.json({ ok: true, lastSavedAt: submission.lastSavedAt })
    }

    // SUBMIT exam
    if (action === 'submit') {
      const submission = await Submission.findById(submissionId)
      if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const exam = await Exam.findById(submission.examId)
      if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

      const { score, percentage, passed } = scoreSubmission(exam, answers, {
        questionOrder: submission.questionOrder,
        optionOrders: submission.optionOrders,
      })
      const normalizedAnswers = answers.map((answer: any) => {
        const optionOrder = submission.optionOrders?.find((item: any) => item.questionId === answer.questionId)?.order
        return {
          ...answer,
          selectedOption:
            answer.selectedOption !== undefined && optionOrder?.length
              ? optionOrder[answer.selectedOption] ?? answer.selectedOption
              : answer.selectedOption,
        }
      })
      const previousSubmissions = await Submission.find({
        examId: submission.examId,
        _id: { $ne: submission._id },
        status: { $in: ['submitted', 'flagged'] },
      }).select('answers')
      const previousAnswers = previousSubmissions.flatMap((item: any) => item.answers ?? [])
      const { plagiarismScore, plagiarismFlags } = detectPlagiarism(normalizedAnswers, previousAnswers)

      submission.answers = normalizedAnswers
      submission.score = score
      submission.percentage = percentage
      submission.passed = passed
      submission.submittedAt = new Date()
      submission.graceUsed = submission.graceExpiresAt ? submission.submittedAt > new Date(submission.graceExpiresAt.getTime() - 30000) : false
      submission.plagiarismScore = plagiarismScore
      submission.plagiarismFlags = plagiarismFlags
      submission.status =
        submission.status === 'flagged' || plagiarismScore >= 80
          ? 'flagged'
          : 'submitted'

      await submission.save()

      return NextResponse.json({
        submission,
        score,
        percentage,
        passed,
        plagiarismScore,
        plagiarismFlags,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await dbConnect()
    const role = (session.user as any).role
    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    const examId = searchParams.get('examId')

    let submissions
    if (role === 'admin' || role === 'examiner') {
      const filter: any = {}
      if (examId) filter.examId = examId
      submissions = await Submission.find(filter)
        .populate('studentId', 'name email')
        .populate('examId', 'title totalMarks')
        .sort({ createdAt: -1 })
    } else {
      submissions = await Submission.find({ studentId: userId })
        .populate('examId', 'title totalMarks duration')
        .sort({ createdAt: -1 })
    }

    return NextResponse.json({ submissions })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
