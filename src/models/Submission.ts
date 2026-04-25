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
  evidenceId?: string
  source?: 'python' | 'browser'
  confidence?: number
  detectorDetails?: {
    sourceMode?: 'python_primary' | 'browser_fallback'
    mobileConfidence?: number
    faceCount?: number
    gazeScore?: number
    identityDistance?: number
    analysisTickId?: string
    snapshotCaptured?: boolean
    pythonAnalyzeStatus?: 'healthy' | 'degraded' | 'unavailable' | 'idle'
    detector?: string
    reason?: string
  }
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
  secureBrowserMode?: 'seb' | 'standard'
  secureBrowserTrust?: 'high' | 'reduced'
  currentQuestionIndex: number
  lastSavedAt?: Date
  questionOrder:   string[]
  optionOrders:    Array<{ questionId: string; order: number[] }>
  identityBaselineEmbedding?: number[]
  identityBaselineCapturedAt?: Date
  identityBaselineEvidenceId?: string
  evidenceSnapshots: Array<{
    type: 'identity' | 'incident' | 'interval'
    timestamp: Date
    imageUrl: string
    evidenceId?: string
    details: string
  }>
  recordingClips: Array<{
    timestamp: Date
    mimeType: string
    clipUrl: string
    evidenceId?: string
    durationMs: number
  }>
  plagiarismScore: number
  plagiarismFlags: Array<{
    questionId: string
    similarity: number
    reason: string
    source: 'heuristic' | 'cross_submission'
    confidenceLabel: 'heuristic' | 'high'
    matchedSubmissionId?: string
  }>
  sessionMetrics: {
    fullscreenViolations: number
    deviceChanges: number
    networkDisconnects: number
    recordingSupported: boolean
    audioMonitoringActive: boolean
    pythonServiceStatus?: 'healthy' | 'degraded' | 'unavailable' | 'idle'
    pythonAnalyzeStatus?: 'healthy' | 'degraded' | 'unavailable' | 'idle'
    pythonModelStatus?: string
    pythonLastLatencyMs?: number
    pythonFallbackActive?: boolean
    invalidClipsDropped?: number
    pythonLastSuccessAt?: Date
    pythonLastFailureReason?: string
    pythonLastAnalyzeAt?: Date
    pythonLastAnalyzeSuccessAt?: Date
    pythonLastAnalyzeFailureReason?: string
    pythonAnalyzeAttempts?: number
    pythonAnalyzeSuccessCount?: number
    pythonAnalyzeFailureCount?: number
    lastSnapshotCapturedAt?: Date
    lastSnapshotCaptureFailedReason?: string
  secureBrowserMode?: 'seb' | 'standard'
    secureBrowserTrust?: 'high' | 'reduced'
    detectorMode?: 'python_primary' | 'browser_fallback'
  }
}

const ProctoringEventSchema = new Schema<IProctoringEvent>({
  type:      { type: String, required: true },
  severity:  { type: String, enum: ['low', 'medium', 'high'], required: true },
  timestamp: { type: Date, default: Date.now },
  details:   { type: String, default: '' },
  evidenceImage: String,
  evidenceId: String,
  source: { type: String, enum: ['python', 'browser'] },
  confidence: Number,
  detectorDetails: {
    sourceMode: { type: String, enum: ['python_primary', 'browser_fallback'] },
    mobileConfidence: Number,
    faceCount: Number,
    gazeScore: Number,
    identityDistance: Number,
    analysisTickId: String,
    snapshotCaptured: Boolean,
    pythonAnalyzeStatus: { type: String, enum: ['healthy', 'degraded', 'unavailable', 'idle'] },
    detector: String,
    reason: String,
  },
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
    evidenceId: String,
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
    evidenceId: String,
    durationMs: { type: Number, default: 0 },
  },
  { _id: false }
)

const PlagiarismFlagSchema = new Schema(
  {
    questionId: { type: String, required: true },
    similarity: { type: Number, required: true },
    reason: { type: String, required: true },
    source: { type: String, enum: ['heuristic', 'cross_submission'], default: 'heuristic' },
    confidenceLabel: { type: String, enum: ['heuristic', 'high'], default: 'heuristic' },
    matchedSubmissionId: String,
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
    secureBrowserMode: { type: String, enum: ['seb', 'standard'], default: 'standard' },
    secureBrowserTrust: { type: String, enum: ['high', 'reduced'], default: 'reduced' },
    currentQuestionIndex: { type: Number, default: 0 },
    lastSavedAt: Date,
    questionOrder:    [{ type: String }],
    optionOrders:     [DeliveryOptionSchema],
    identityBaselineEmbedding: [{ type: Number }],
    identityBaselineCapturedAt: Date,
    identityBaselineEvidenceId: String,
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
      pythonServiceStatus: { type: String, enum: ['healthy', 'degraded', 'unavailable', 'idle'], default: 'unavailable' },
      pythonAnalyzeStatus: { type: String, enum: ['healthy', 'degraded', 'unavailable', 'idle'], default: 'unavailable' },
      pythonModelStatus: { type: String, default: '' },
      pythonLastLatencyMs: { type: Number, default: 0 },
      pythonFallbackActive: { type: Boolean, default: false },
      invalidClipsDropped: { type: Number, default: 0 },
      pythonLastSuccessAt: Date,
      pythonLastFailureReason: { type: String, default: '' },
      pythonLastAnalyzeAt: Date,
      pythonLastAnalyzeSuccessAt: Date,
      pythonLastAnalyzeFailureReason: { type: String, default: '' },
      pythonAnalyzeAttempts: { type: Number, default: 0 },
      pythonAnalyzeSuccessCount: { type: Number, default: 0 },
      pythonAnalyzeFailureCount: { type: Number, default: 0 },
      lastSnapshotCapturedAt: Date,
      lastSnapshotCaptureFailedReason: { type: String, default: '' },
      secureBrowserMode: { type: String, enum: ['seb', 'standard'], default: 'standard' },
      secureBrowserTrust: { type: String, enum: ['high', 'reduced'], default: 'reduced' },
      detectorMode: { type: String, enum: ['python_primary', 'browser_fallback'], default: 'browser_fallback' },
    },
  },
  { timestamps: true }
)

SubmissionSchema.pre('validate', function normalizeSessionMetrics(next) {
  const metrics = this.sessionMetrics
  if (metrics?.pythonAnalyzeStatus && !['healthy', 'degraded', 'unavailable', 'idle'].includes(metrics.pythonAnalyzeStatus)) {
    metrics.pythonAnalyzeStatus = 'unavailable'
  }
  if (metrics?.pythonServiceStatus && !['healthy', 'degraded', 'unavailable', 'idle'].includes(metrics.pythonServiceStatus)) {
    metrics.pythonServiceStatus = 'unavailable'
  }
  if (metrics?.secureBrowserMode && !['seb', 'standard'].includes(metrics.secureBrowserMode)) {
    metrics.secureBrowserMode = 'standard'
  }
  if (metrics?.secureBrowserTrust && !['high', 'reduced'].includes(metrics.secureBrowserTrust)) {
    metrics.secureBrowserTrust = 'reduced'
  }
  if (metrics?.detectorMode && !['python_primary', 'browser_fallback'].includes(metrics.detectorMode)) {
    metrics.detectorMode = 'browser_fallback'
  }
  next()
})

const Submission: Model<ISubmission> =
  mongoose.models.Submission ?? mongoose.model<ISubmission>('Submission', SubmissionSchema)

export default Submission
