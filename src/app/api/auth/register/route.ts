import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/db'
import User from '@/models/User'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json()

    if (!name || !email || !password)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    await dbConnect()

    const existing = await User.findOne({ email })
    if (existing)
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role === 'admin' ? 'student' : (role ?? 'student'), // prevent self-promoting to admin
    })

    return NextResponse.json({ message: 'Account created', userId: user._id }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
