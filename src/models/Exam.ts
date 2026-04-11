import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IQuestion {
  _id?:           string
  text:           string
  type:           'mcq' | 'descriptive'
  options?:       string[]
  correctAnswer?: number
  marks:          number
}

export interface IExam extends Document {
  title:          string
  description:    string
  duration:       number   // minutes
  totalMarks:     number
  passingMarks:   number
  questions:      IQuestion[]
  createdBy:      mongoose.Types.ObjectId
  isActive:       boolean
  startTime?:     Date
  endTime?:       Date
  negativeMarking: boolean
  randomize:      boolean
  createdAt:      Date
}

const QuestionSchema = new Schema<IQuestion>({
  text:          { type: String, required: true },
  type:          { type: String, enum: ['mcq', 'descriptive'], required: true },
  options:       [String],
  correctAnswer: Number,
  marks:         { type: Number, required: true, default: 1 },
})

const ExamSchema = new Schema<IExam>(
  {
    title:           { type: String, required: true },
    description:     { type: String, default: '' },
    duration:        { type: Number, required: true },
    totalMarks:      { type: Number, required: true },
    passingMarks:    { type: Number, required: true },
    questions:       [QuestionSchema],
    createdBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isActive:        { type: Boolean, default: false },
    startTime:       Date,
    endTime:         Date,
    negativeMarking: { type: Boolean, default: false },
    randomize:       { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Exam: Model<IExam> =
  mongoose.models.Exam ?? mongoose.model<IExam>('Exam', ExamSchema)

export default Exam
