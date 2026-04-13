import type { IExam, IQuestion } from '@/models/Exam'
import type { IAnswer } from '@/models/Submission'

interface DeliveryOptionOrder {
  questionId: string
  order: number[]
}

export interface ExamDeliveryPlan {
  questionOrder: string[]
  optionOrders: DeliveryOptionOrder[]
}

export interface DeliveredQuestion extends Omit<IQuestion, 'correctAnswer'> {
  _id: string
  options?: string[]
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildExamDelivery(exam: IExam): ExamDeliveryPlan {
  const sourceQuestions = exam.questions.map((question) => ({
    id: question._id?.toString() ?? '',
    type: question.type,
    options: question.options ?? [],
  }))

  const orderedQuestions = exam.randomize ? shuffleArray(sourceQuestions) : sourceQuestions

  return {
    questionOrder: orderedQuestions.map((question) => question.id),
    optionOrders: orderedQuestions
      .filter((question) => question.type === 'mcq')
      .map((question) => ({
        questionId: question.id,
        order: exam.randomize
          ? shuffleArray(question.options.map((_, index) => index))
          : question.options.map((_, index) => index),
      })),
  }
}

export function getDeliveredQuestions(exam: IExam, delivery?: ExamDeliveryPlan): DeliveredQuestion[] {
  const questionMap = new Map(
    exam.questions.map((question) => [question._id?.toString() ?? '', question])
  )
  const order = delivery?.questionOrder?.length
    ? delivery.questionOrder
    : exam.questions.map((question) => question._id?.toString() ?? '')

  return order
    .map((questionId) => {
      const question = questionMap.get(questionId)
      if (!question) return null

      const optionOrder = delivery?.optionOrders.find((item) => item.questionId === questionId)?.order
      const options = question.options
        ? (optionOrder?.length
            ? optionOrder.map((optionIndex) => question.options?.[optionIndex] ?? '')
            : question.options)
        : undefined

      return {
        _id: questionId,
        text: question.text,
        type: question.type,
        options,
        marks: question.marks,
      }
    })
    .filter(Boolean) as DeliveredQuestion[]
}

export function scoreSubmission(
  exam: IExam,
  answers: IAnswer[],
  delivery?: ExamDeliveryPlan
) {
  const questionMap = new Map(
    exam.questions.map((question) => [question._id?.toString() ?? '', question])
  )
  const optionOrderMap = new Map(
    (delivery?.optionOrders ?? []).map((item) => [item.questionId, item.order])
  )

  let score = 0

  for (const answer of answers) {
    const question = questionMap.get(answer.questionId)
    if (!question) continue

    if (question.type === 'mcq' && answer.selectedOption !== undefined) {
      const optionOrder = optionOrderMap.get(answer.questionId)
      const selectedOriginalIndex = optionOrder?.[answer.selectedOption] ?? answer.selectedOption
      if (selectedOriginalIndex === question.correctAnswer) {
        score += question.marks
      } else if (exam.negativeMarking) {
        score -= Math.max(0, Math.round(question.marks * 0.25 * 100) / 100)
      }
    }
  }

  const boundedScore = Math.max(0, Number(score.toFixed(2)))
  const percentage = exam.totalMarks > 0 ? Math.round((boundedScore / exam.totalMarks) * 100) : 0

  return {
    score: boundedScore,
    percentage,
    passed: boundedScore >= exam.passingMarks,
  }
}

function textSimilarity(a: string, b: string) {
  const left = new Set(normalizeText(a).split(' ').filter(Boolean))
  const right = new Set(normalizeText(b).split(' ').filter(Boolean))
  if (!left.size || !right.size) return 0

  let intersection = 0
  for (const token of Array.from(left)) {
    if (right.has(token)) intersection += 1
  }
  return intersection / new Set([...Array.from(left), ...Array.from(right)]).size
}

export function detectPlagiarism(
  answers: IAnswer[],
  previousAnswers: Array<{ questionId: string; textAnswer?: string; submissionId?: string }>
) {
  const flags: Array<{
    questionId: string
    similarity: number
    reason: string
    source: 'heuristic' | 'cross_submission'
    confidenceLabel: 'heuristic' | 'high'
    matchedSubmissionId?: string
  }> = []
  let maxSimilarity = 0

  for (const answer of answers) {
    if (!answer.textAnswer?.trim()) continue
    const normalized = normalizeText(answer.textAnswer)
    const hasBoilerplate =
      /(lorem ipsum|chatgpt|as an ai|copyright|stack overflow)/i.test(answer.textAnswer) ||
      /(public static void main|def main|SELECT \* FROM)/i.test(answer.textAnswer)

    if (hasBoilerplate) {
      flags.push({
        questionId: answer.questionId,
        similarity: 0.7,
        reason: 'Contains common generated or copied boilerplate patterns',
        source: 'heuristic',
        confidenceLabel: 'heuristic',
      })
      maxSimilarity = Math.max(maxSimilarity, 70)
    }

    for (const previous of previousAnswers) {
      if (previous.questionId !== answer.questionId || !previous.textAnswer?.trim()) continue
      const similarity = textSimilarity(normalized, previous.textAnswer)
      if (similarity >= 0.82) {
        const similarityScore = Math.round(similarity * 100)
        maxSimilarity = Math.max(maxSimilarity, similarityScore)
        flags.push({
          questionId: answer.questionId,
          similarity,
          reason: `Highly similar to another submission (${similarityScore}% token overlap)`,
          source: 'cross_submission',
          confidenceLabel: 'high',
          matchedSubmissionId: previous.submissionId,
        })
      }
    }
  }

  return {
    plagiarismScore: maxSimilarity,
    plagiarismFlags: flags,
  }
}
