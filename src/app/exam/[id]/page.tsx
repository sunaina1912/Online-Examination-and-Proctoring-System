'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react'
import { useProctoring } from '@/hooks/useProctoring'
import { useExamTimer } from '@/hooks/useExamTimer'
import { ProctoringOverlay } from '@/components/proctoring/ProctoringOverlay'
import { QuestionCard } from '@/components/exam/QuestionCard'
import { ExamTimer } from '@/components/exam/ExamTimer'
import { cn } from '@/lib/utils'

type Phase = 'loading' | 'consent' | 'exam' | 'result'

interface Answer {
  questionId: string
  selectedOption?: number
  textAnswer?: string
}

interface ResumeState {
  submission: any
  questions: any[]
  answers: Answer[]
  currentQuestionIndex: number
  remainingSeconds: number
  resumed: boolean
}

export default function ExamPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('loading')
  const [exam, setExam] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [deliveredQuestions, setDeliveredQuestions] = useState<any[]>([])
  const [current, setCurrent] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [submitting, setSubmit] = useState(false)
  const [openingSession, setOpeningSession] = useState(false)
  const [resumeReady, setResumeReady] = useState<ResumeState | null>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    fetch(`/api/exams/${id}`)
      .then((response) => response.json())
      .then((data) => {
        setExam(data.exam)
        setPhase('consent')
      })
      .catch(() => router.push('/admin/dashboard'))
  }, [id, router])

  useEffect(() => {
    if (!exam) return
    fetch(`/api/submissions?examId=${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((data) => {
        const existing = (data.submissions ?? []).find(
          (item: any) => item.examId?._id?.toString?.() === id && item.status === 'in_progress'
        )
        if (!existing) return

        return fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: id, action: 'start' }),
        })
          .then((response) => response.json())
          .then((payload) => {
            setResumeReady({
              submission: payload.submission,
              questions: payload.deliveredQuestions ?? exam.questions ?? [],
              answers: payload.answers ?? [],
              currentQuestionIndex: payload.currentQuestionIndex ?? 0,
              remainingSeconds: payload.remainingSeconds ?? exam.duration * 60,
              resumed: Boolean(payload.resumed),
            })
          })
      })
      .catch(() => undefined)
  }, [exam, id])

  const proctoring = useProctoring({
    submissionId: submission?._id ?? '',
    enabled: phase === 'exam',
    onFlagged: () => console.warn('Exam flagged'),
  })

  const submitExam = useCallback(async () => {
    if (submittingRef.current || !submission?._id) return
    submittingRef.current = true
    setSubmit(true)
    proctoring.stopProctoring({ flushRecording: false })

    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', submissionId: submission._id, answers }),
      })
      const data = await response.json()
      setResult(data)
      setPhase('result')
    } finally {
      setSubmit(false)
      submittingRef.current = false
    }
  }, [answers, proctoring, submission])

  const timer = useExamTimer(exam?.duration ?? 60, submitExam, {
    gracePeriodSeconds: 30,
    initialSeconds: resumeReady?.remainingSeconds,
  })

  useEffect(() => {
    if (phase === 'exam' && proctoring.camActive && !timer.isRunning) {
      timer.start()
    }
  }, [phase, proctoring.camActive, timer])

  const openSession = async (mode: 'start' | 'continue') => {
    if (openingSession) return
    setOpeningSession(true)

    try {
      if (mode === 'continue' && resumeReady) {
        await proctoring.enterFullscreen()
        setSubmission(resumeReady.submission)
        setDeliveredQuestions(resumeReady.questions)
        setAnswers(
          resumeReady.questions.map((question: any) =>
            resumeReady.answers.find((answer) => answer.questionId === question._id) ?? { questionId: question._id }
          )
        )
        setCurrent(resumeReady.currentQuestionIndex ?? 0)
        setPhase('exam')
        return
      }

      const [, response] = await Promise.all([
        proctoring.enterFullscreen(),
        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ examId: id, action: 'start' }),
        }),
      ])
      const data = await response.json()
      const questions = data.deliveredQuestions ?? exam.questions ?? []
      setSubmission(data.submission)
      setDeliveredQuestions(questions)
      setAnswers(
        questions.map((question: any) =>
          data.answers?.find((answer: Answer) => answer.questionId === question._id) ?? { questionId: question._id }
        )
      )
      setCurrent(data.currentQuestionIndex ?? 0)
      setResumeReady({
        submission: data.submission,
        questions,
        answers: data.answers ?? [],
        currentQuestionIndex: data.currentQuestionIndex ?? 0,
        remainingSeconds: data.remainingSeconds ?? exam.duration * 60,
        resumed: Boolean(data.resumed),
      })
      setPhase('exam')
    } finally {
      setOpeningSession(false)
    }
  }

  const setAnswer = (questionId: string, patch: Partial<Answer>) =>
    setAnswers((prev) => prev.map((answer) => (answer.questionId === questionId ? { ...answer, ...patch } : answer)))

  const answeredCount = answers.filter((answer) => answer.selectedOption !== undefined || answer.textAnswer).length

  useEffect(() => {
    if (!submission?._id || phase !== 'exam') return

    const timeout = setTimeout(() => {
      void fetch('/api/submissions', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'progress',
          submissionId: submission._id,
          answers,
          currentQuestionIndex: current,
        }),
      })
    }, 700)

    return () => clearTimeout(timeout)
  }, [answers, current, phase, submission?._id])

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    )
  }

  if (phase === 'consent') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
        <div className="relative z-10 max-w-lg w-full">
          <div className="bg-surface-1 border border-surface-3 rounded-2xl p-8">
            <h1 className="font-display text-2xl font-bold text-white mb-1">{exam?.title}</h1>
            <p className="text-gray-500 text-sm mb-6">{exam?.description}</p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Duration', value: `${exam?.duration} min` },
                { label: 'Marks', value: `${exam?.totalMarks}` },
                { label: 'Pass Mark', value: `${exam?.passingMarks}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface-2 border border-surface-3 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="font-bold text-white font-mono">{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-warn/10 border border-warn/20 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-warn mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> AI Proctoring Active
              </p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>Your webcam and microphone will be monitored.</li>
                <li>Tab switching, copy-paste and restricted shortcuts are controlled.</li>
                <li>Question order and MCQ options may be randomized.</li>
                <li>Violations are logged with timestamps and evidence snapshots.</li>
              </ul>
            </div>

            <div className="space-y-3">
              {resumeReady?.resumed && (
                <button
                  onClick={() => openSession('continue')}
                  disabled={openingSession}
                  className="w-full bg-ok hover:bg-ok/90 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                  {openingSession ? 'Opening...' : 'Continue Writing'}
                </button>
              )}
              <button
                onClick={() => openSession(resumeReady?.resumed ? 'continue' : 'start')}
                disabled={openingSession}
                className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-70 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
              >
                {openingSession ? 'Opening...' : resumeReady?.resumed ? 'Open Saved Session' : 'I agree - Start Exam'}
              </button>
              {resumeReady?.resumed && (
                <p className="text-[11px] text-gray-500 text-center">
                  Your timer, answers and question position will continue from where you stopped.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="relative z-10 max-w-xl w-full">
          <div className="bg-surface-1 border border-surface-3 rounded-2xl p-8 text-center">
            {result?.passed ? (
              <CheckCircle className="w-16 h-16 text-ok mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-danger mx-auto mb-4" />
            )}
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              {result?.passed ? 'Congratulations!' : 'Better luck next time'}
            </h1>
            <p className="text-gray-500 mb-8">{exam?.title}</p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Score', value: result?.score, tone: result?.passed ? 'text-ok' : 'text-danger' },
                { label: 'Percentage', value: `${result?.percentage}%`, tone: result?.passed ? 'text-ok' : 'text-danger' },
                { label: 'Risk', value: proctoring.riskScore, tone: proctoring.riskScore >= 80 ? 'text-danger' : proctoring.riskScore >= 40 ? 'text-warn' : 'text-ok' },
                { label: 'Plagiarism', value: `${result?.plagiarismScore ?? 0}%`, tone: (result?.plagiarismScore ?? 0) >= 80 ? 'text-danger' : (result?.plagiarismScore ?? 0) >= 40 ? 'text-warn' : 'text-ok' },
              ].map((item) => (
                <div key={item.label} className="bg-surface-2 border border-surface-3 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={cn('text-2xl font-bold font-mono', item.tone)}>{item.value}</p>
                </div>
              ))}
            </div>

            {(proctoring.riskScore >= 80 || (result?.plagiarismScore ?? 0) >= 80) && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 mb-6 text-xs text-danger">
                This submission has been flagged for manual review.
              </div>
            )}

            <button
              onClick={() => router.push('/admin/dashboard')}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-semibold text-sm transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const question = deliveredQuestions?.[current]
  const answer = answers.find((item) => item.questionId === question?._id)

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b border-surface-3 bg-surface-1 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <p className="font-display font-bold text-white text-sm">{exam?.title}</p>
          <p className="text-[11px] text-gray-500">
            Q{current + 1} of {deliveredQuestions?.length} · {answeredCount} answered
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ExamTimer formatted={timer.formatted} />
          {timer.formatted.isGracePeriod && (
            <p className="text-[10px] text-danger font-medium">Grace period active. Auto-submit is imminent.</p>
          )}
        </div>
        <button
          onClick={submitExam}
          disabled={submitting}
          className="flex items-center gap-2 bg-ok/20 hover:bg-ok/30 border border-ok/30 text-ok px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {question && (
            <QuestionCard
              question={question}
              index={current}
              selectedOption={answer?.selectedOption}
              textAnswer={answer?.textAnswer}
              onSelect={(option) => setAnswer(question._id, { selectedOption: option })}
              onTextChange={(text) => setAnswer(question._id, { textAnswer: text })}
            />
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={() => setCurrent((value) => Math.max(0, value - 1))}
              disabled={current === 0}
              className="flex items-center gap-2 px-4 py-2.5 border border-surface-3 text-gray-400 hover:text-white hover:border-brand-500/40 rounded-xl text-sm transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-xs">
              {deliveredQuestions?.map((_: any, index: number) => {
                const currentAnswer = answers[index]
                const done = currentAnswer?.selectedOption !== undefined || currentAnswer?.textAnswer
                return (
                  <button
                    key={index}
                    onClick={() => setCurrent(index)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-bold border transition-colors',
                      index === current
                        ? 'bg-brand-500 border-brand-400 text-white'
                        : done
                        ? 'bg-ok/20 border-ok/30 text-ok'
                        : 'bg-surface-2 border-surface-3 text-gray-500 hover:border-brand-500/40'
                    )}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setCurrent((value) => Math.min(deliveredQuestions.length - 1, value + 1))}
              disabled={current === deliveredQuestions?.length - 1}
              className="flex items-center gap-2 px-4 py-2.5 border border-surface-3 text-gray-400 hover:text-white hover:border-brand-500/40 rounded-xl text-sm transition-colors disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <aside className="w-72 border-l border-surface-3 bg-surface-1 p-4 overflow-y-auto flex-shrink-0">
          <ProctoringOverlay
            videoRef={proctoring.videoRef}
            camActive={proctoring.camActive}
            riskScore={proctoring.riskScore}
            status={proctoring.status}
            events={proctoring.events}
            recorderSupported={proctoring.recorderSupported}
            isFullscreen={proctoring.isFullscreen}
            sessionMetrics={proctoring.sessionMetrics}
            identitySnapshot={proctoring.identitySnapshot}
          />
        </aside>
      </div>
    </div>
  )
}
