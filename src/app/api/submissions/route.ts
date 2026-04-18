import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/db'
import Submission from '@/models/Submission'
import Exam from '@/models/Exam'
import { buildExamDelivery, detectPlagiarism, getDeliveredQuestions, scoreSubmission } from '@/lib/exam'

function isExamOpenForStudent(exam: any) {
  if (!exam?.isActive) return false
  const now = Date.now()
  const start = exam.startTime ? new Date(exam.startTime).getTime() : null
  const end = exam.endTime ? new Date(exam.endTime).getTime() : null
  if (start && now < start) return false
  if (end && now > end) return false
  return true
}

function detectSecureBrowser(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') ?? ''
  const sebHeaders = [
    req.headers.get('x-safeexambrowser-configkeyhash'),
    req.headers.get('x-safeexambrowser-requesthash'),
  ].filter(Boolean)
  const secureBrowserDetected = /safe exam browser|seb/i.test(userAgent) || sebHeaders.length > 0

  return {
    secureBrowserDetected,
    secureBrowserMode: secureBrowserDetected ? 'seb' as const : 'standard' as const,
    secureBrowserTrust: secureBrowserDetected ? 'high' as const : 'reduced' as const,
  }
}

function getRemainingExamSeconds(submission: any, exam: any) {
  const durationSeconds = Math.max(0, Number(exam?.duration ?? 0) * 60)
  if (!submission?.graceExpiresAt) return durationSeconds

  const hardExpiryMs = new Date(submission.graceExpiresAt).getTime()
  if (!Number.isFinite(hardExpiryMs)) return durationSeconds

  return Math.max(-30, Math.floor((hardExpiryMs - Date.now()) / 1000) - 30)
}

function isHardExpired(submission: any) {
  if (!submission?.graceExpiresAt) return false
  const hardExpiryMs = new Date(submission.graceExpiresAt).getTime()
  return Number.isFinite(hardExpiryMs) && Date.now() >= hardExpiryMs
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { examId, action, answers, submissionId, currentQuestionIndex } = await req.json()
    await dbConnect()

    const studentId = (session.user as any).id

    // START exam
    if (action === 'start') {
      const secureBrowser = detectSecureBrowser(req)
      const existing = await Submission.findOne({ examId, studentId, status: 'in_progress' })
      const exam = await Exam.findById(examId)
      if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

      if (existing) {
        if (isHardExpired(existing)) {
          existing.status = 'submitted'
          existing.submittedAt = existing.graceExpiresAt ?? new Date()
          existing.graceUsed = true
          await existing.save()
        } else {
          const remainingSeconds = getRemainingExamSeconds(existing, exam)
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
      }

      if ((session.user as any).role === 'student' && !isExamOpenForStudent(exam)) {
        return NextResponse.json({ error: 'Exam is not available for this user right now' }, { status: 403 })
      }

      const delivery = buildExamDelivery(exam)
      const submission = await Submission.create({
        examId,
        studentId,
        startedAt: new Date(),
        questionOrder: delivery.questionOrder,
        optionOrders: delivery.optionOrders,
        graceExpiresAt: new Date(Date.now() + ((exam.duration * 60) + 30) * 1000),
        secureBrowserDetected: secureBrowser.secureBrowserDetected,
        secureBrowserMode: secureBrowser.secureBrowserMode,
        secureBrowserTrust: secureBrowser.secureBrowserTrust,
        sessionMetrics: {
          secureBrowserMode: secureBrowser.secureBrowserMode,
          secureBrowserTrust: secureBrowser.secureBrowserTrust,
          detectorMode: 'browser_fallback',
        },
      })

      return NextResponse.json(
        {
          submission,
          deliveredQuestions: getDeliveredQuestions(exam, delivery),
          answers: [],
          currentQuestionIndex: 0,
          remainingSeconds: Math.max(0, Number(exam.duration ?? 0) * 60),
          resumed: false,
        },
        { status: 201 }
      )
    }

    if (action === 'progress') {
      const submission = await Submission.findById(submissionId)
      if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (submission.studentId.toString() !== studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
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
      if (submission.studentId.toString() !== studentId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const exam = await Exam.findById(submission.examId)
      if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 })

      const safeAnswers = Array.isArray(answers) ? answers : submission.answers ?? []
      const optionOrderMap = new Map(
        (submission.optionOrders ?? []).map((item: any) => [item.questionId, item.order])
      )
      const { score, percentage, passed } = scoreSubmission(exam, safeAnswers, {
        questionOrder: submission.questionOrder,
        optionOrders: submission.optionOrders,
      })
      const normalizedAnswers = safeAnswers.map((answer: any) => {
        const optionOrder = optionOrderMap.get(answer.questionId)
        return {
          ...answer,
          selectedOption:
            answer.selectedOption !== undefined && optionOrder?.length
              ? optionOrder[answer.selectedOption] ?? answer.selectedOption
              : answer.selectedOption,
        }
      })
      const hasTextAnswers = normalizedAnswers.some((answer: any) => typeof answer.textAnswer === 'string' && answer.textAnswer.trim())
      let plagiarismScore = 0
      let plagiarismFlags: any[] = []

      if (hasTextAnswers) {
        const previousSubmissions = await Submission.find({
          examId: submission.examId,
          _id: { $ne: submission._id },
          status: { $in: ['submitted', 'flagged'] },
        })
          .select('answers')
          .lean()

        const previousAnswers = previousSubmissions.flatMap((item: any) =>
          (item.answers ?? []).map((answer: any) => ({
            ...answer,
            submissionId: item._id?.toString?.(),
          }))
        )
        const plagiarismResult = detectPlagiarism(normalizedAnswers, previousAnswers)
        plagiarismScore = plagiarismResult.plagiarismScore
        plagiarismFlags = plagiarismResult.plagiarismFlags
      }

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
      const filter: any = { studentId: userId }
      if (examId) filter.examId = examId
      submissions = await Submission.find(filter)
        .populate('examId', 'title totalMarks duration')
        .sort({ createdAt: -1 })
    }

    return NextResponse.json({ submissions })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
