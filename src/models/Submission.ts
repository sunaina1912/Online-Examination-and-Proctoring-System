import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IProctoringEvent {
  type:
    | 'face_missing'
    | 'multiple_faces'
    | 'tab_switch'
    | 'audio_detected'
    | 'eye_gaze'
    | 'mobile_detected'
    | 'print_screen'
    | 'devtools_shortcut'
    | 'network_change'
    | 'identity_unverified'
  severity:  'low' | 'medium' | 'high'
  timestamp: Date
  details:   string
  evidenceImage?: string
}

export interface IAnswer {
  questionId:    string
  selectedOption?: number
  textAnswer?:   string
}

export interface ISubmission extends Document {
  examId:          mongoose.Types.ObjectId
  studentId:       mongoose.Types.ObjectId
  answers:         IAnswer[]
  score:           number
  percentage:      number
  passed:          boolean
  startedAt:       Date
  submittedAt?:    Date
  proctoringEvents: IProctoringEvent[]
  riskScore:       number   // 0-100, computed from events
  status:          'in_progress' | 'submitted' | 'flagged'
  graceUsed:       boolean
  graceExpiresAt?: Date
  secureBrowserDetected: boolean
  currentQuestionIndex: number
  lastSavedAt?: Date
  questionOrder:   string[]
  optionOrders:    Array<{ questionId: string; order: number[] }>
  evidenceSnapshots: Array<{
    type: 'identity' | 'incident' | 'interval'
    timestamp: Date
    imageUrl: string
    details: string
  }>
  recordingClips: Array<{
    timestamp: Date
    mimeType: string
    clipUrl: string
    durationMs: number
  }>
  plagiarismScore: number
  plagiarismFlags: Array<{
    questionId: string
    similarity: number
    reason: string
  }>
  sessionMetrics: {
    fullscreenViolations: number
    deviceChanges: number
    networkDisconnects: number
    recordingSupported: boolean
    audioMonitoringActive: boolean
  }
}

const ProctoringEventSchema = new Schema<IProctoringEvent>({
  type:      { type: String, required: true },
  severity:  { type: String, enum: ['low', 'medium', 'high'], required: true },
  timestamp: { type: Date, default: Date.now },
  details:   { type: String, default: '' },
  evidenceImage: String,
})

const AnswerSchema = new Schema<IAnswer>({
  questionId:     { type: String, required: true },
  selectedOption: Number,
  textAnswer:     String,
})

const EvidenceSnapshotSchema = new Schema(
  {
    type: { type: String, enum: ['identity', 'incident', 'interval'], required: true },
    timestamp: { type: Date, default: Date.now },
    imageUrl: { type: String, required: true },
    details: { type: String, default: '' },
  },
  { _id: false }
)

const DeliveryOptionSchema = new Schema(
  {
    questionId: { type: String, required: true },
    order: [{ type: Number, required: true }],
  },
  { _id: false }
)

const RecordingClipSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    mimeType: { type: String, required: true },
    clipUrl: { type: String, required: true },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
)

const PlagiarismFlagSchema = new Schema(
  {
    questionId: { type: String, required: true },
    similarity: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
)

const SubmissionSchema = new Schema<ISubmission>(
  {
    examId:           { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    answers:          [AnswerSchema],
    score:            { type: Number, default: 0 },
    percentage:       { type: Number, default: 0 },
    passed:           { type: Boolean, default: false },
    startedAt:        { type: Date, default: Date.now },
    submittedAt:      Date,
    proctoringEvents: [ProctoringEventSchema],
    riskScore:        { type: Number, default: 0 },
    status:           { type: String, enum: ['in_progress', 'submitted', 'flagged'], default: 'in_progress' },
    graceUsed:        { type: Boolean, default: false },
    graceExpiresAt:   Date,
    secureBrowserDetected: { type: Boolean, default: false },
    currentQuestionIndex: { type: Number, default: 0 },
    lastSavedAt: Date,
    questionOrder:    [{ type: String }],
    optionOrders:     [DeliveryOptionSchema],
    evidenceSnapshots: [EvidenceSnapshotSchema],
    recordingClips:   [RecordingClipSchema],
    plagiarismScore:  { type: Number, default: 0 },
    plagiarismFlags:  [PlagiarismFlagSchema],
    sessionMetrics: {
      fullscreenViolations: { type: Number, default: 0 },
      deviceChanges: { type: Number, default: 0 },
      networkDisconnects: { type: Number, default: 0 },
      recordingSupported: { type: Boolean, default: false },
      audioMonitoringActive: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
)

const Submission: Model<ISubmission> =
  mongoose.models.Submission ?? mongoose.model<ISubmission>('Submission', SubmissionSchema)

export default Submission
