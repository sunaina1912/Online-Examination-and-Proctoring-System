import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUser extends Document {
  name:      string
  email:     string
  password:  string
  role:      'student' | 'admin' | 'examiner'
  createdAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role:     { type: String, enum: ['student', 'admin', 'examiner'], default: 'student' },
  },
  { timestamps: true }
)

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema)

export default User
