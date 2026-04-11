'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'student' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      router.push('/auth/login?registered=1')
    } catch {
      setError('Something went wrong')
      setLoading(false)
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-400 font-medium">{label}</label>
      <input
        type={type}
        required
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500/60 transition-colors"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Join ProctorX</p>
        </div>

        <form onSubmit={submit} className="bg-surface-1 border border-surface-3 rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          {field('Full Name',    'name',     'text',     'John Doe')}
          {field('Email',        'email',    'email',    'you@example.com')}
          {field('Password',     'password', 'password', '••••••••')}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-brand-500/60 transition-colors"
            >
              <option value="student">Student</option>
              <option value="examiner">Examiner</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
