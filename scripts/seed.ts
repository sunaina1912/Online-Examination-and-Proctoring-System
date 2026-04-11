/**
 * Run: npx tsx scripts/seed.ts
 * Creates: admin@proctorx.dev / admin123  (role: admin)
 *          student@proctorx.dev / student123 (role: student)
 * + 1 sample MCQ exam (active)
 */

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/proctorx'

const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true },
  password: String, role: { type: String, default: 'student' },
}, { timestamps: true })

const QuestionSchema = new mongoose.Schema({
  text: String, type: String, options: [String],
  correctAnswer: Number, marks: { type: Number, default: 1 },
})

const ExamSchema = new mongoose.Schema({
  title: String, description: String, duration: Number,
  totalMarks: Number, passingMarks: Number, questions: [QuestionSchema],
  createdBy: mongoose.Types.ObjectId, isActive: Boolean,
  negativeMarking: Boolean, randomize: Boolean,
}, { timestamps: true })

const User = mongoose.models.User ?? mongoose.model('User', UserSchema)
const Exam = mongoose.models.Exam ?? mongoose.model('Exam', ExamSchema)

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // Users
  const users = [
    { name: 'Admin User',    email: 'admin@proctorx.dev',   password: 'admin123',   role: 'admin' },
    { name: 'Test Student',  email: 'student@proctorx.dev', password: 'student123', role: 'student' },
    { name: 'Exam Creator',  email: 'examiner@proctorx.dev', password: 'exam123',   role: 'examiner' },
  ]

  let adminId: mongoose.Types.ObjectId | undefined
  for (const u of users) {
    const existing = await User.findOne({ email: u.email })
    if (!existing) {
      const hashed = await bcrypt.hash(u.password, 12)
      const created = await User.create({ ...u, password: hashed })
      if (u.role === 'admin') adminId = created._id
      console.log(`✓ Created ${u.role}: ${u.email}`)
    } else {
      if (u.role === 'admin') adminId = existing._id
      console.log(`→ Skipped existing: ${u.email}`)
    }
  }

  // Sample exam
  const existingExam = await Exam.findOne({ title: 'General Knowledge Quiz' })
  if (!existingExam) {
    await Exam.create({
      title:         'General Knowledge Quiz',
      description:   'A sample 10-question MCQ exam to test the platform',
      duration:      30,
      totalMarks:    10,
      passingMarks:  6,
      isActive:      true,
      negativeMarking: false,
      randomize:     true,
      createdBy:     adminId,
      questions: [
        { text: 'What is the capital of France?',       type: 'mcq', options: ['Berlin','Madrid','Paris','Rome'],        correctAnswer: 2, marks: 1 },
        { text: 'Which planet is known as the Red Planet?', type: 'mcq', options: ['Venus','Mars','Jupiter','Saturn'],   correctAnswer: 1, marks: 1 },
        { text: 'What is 15 × 8?',                     type: 'mcq', options: ['100','110','120','130'],                  correctAnswer: 2, marks: 1 },
        { text: 'Who invented the telephone?',          type: 'mcq', options: ['Tesla','Edison','Bell','Marconi'],       correctAnswer: 2, marks: 1 },
        { text: 'What is the largest ocean?',           type: 'mcq', options: ['Atlantic','Indian','Arctic','Pacific'],  correctAnswer: 3, marks: 1 },
        { text: 'Which element has the symbol "Au"?',   type: 'mcq', options: ['Silver','Gold','Copper','Iron'],         correctAnswer: 1, marks: 1 },
        { text: 'How many sides does a hexagon have?',  type: 'mcq', options: ['5','6','7','8'],                         correctAnswer: 1, marks: 1 },
        { text: 'What year did World War II end?',      type: 'mcq', options: ['1943','1944','1945','1946'],             correctAnswer: 2, marks: 1 },
        { text: 'Who painted the Mona Lisa?',           type: 'mcq', options: ['Michelangelo','Raphael','da Vinci','Botticelli'], correctAnswer: 2, marks: 1 },
        { text: 'What is the fastest land animal?',     type: 'mcq', options: ['Lion','Horse','Cheetah','Leopard'],      correctAnswer: 2, marks: 1 },
      ],
    })
    console.log('✓ Created sample exam: General Knowledge Quiz')
  } else {
    console.log('→ Skipped existing exam')
  }

  await mongoose.disconnect()
  console.log('\n✅ Seed complete!')
  console.log('\nLogin credentials:')
  console.log('  Admin:    admin@proctorx.dev   / admin123')
  console.log('  Student:  student@proctorx.dev / student123')
  console.log('  Examiner: examiner@proctorx.dev / exam123')
}

seed().catch(e => { console.error(e); process.exit(1) })
