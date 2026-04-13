import mongoose, { Document, Model, Schema } from 'mongoose'

export interface IEvidenceBlob extends Document {
  submissionId: mongoose.Types.ObjectId
  kind: 'snapshot' | 'clip'
  mimeType: string
  sizeBytes: number
  data: Buffer
  createdAt: Date
  updatedAt: Date
}

const EvidenceBlobSchema = new Schema<IEvidenceBlob>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    kind: { type: String, enum: ['snapshot', 'clip'], required: true, index: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true }
)

const EvidenceBlob: Model<IEvidenceBlob> =
  mongoose.models.EvidenceBlob ?? mongoose.model<IEvidenceBlob>('EvidenceBlob', EvidenceBlobSchema)

export default EvidenceBlob
