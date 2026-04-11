'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { ...form, redirect: false })
    setLoading(false)
    if (res?.ok) router.push('/admin/dashboard')
    else setError('Invalid email or password')
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-brand-400" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to ProctorX</p>
        </div>

        <form onSubmit={submit} className="bg-surface-1 border border-surface-3 rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@example.com"
              className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500/60 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-3 pr-10 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-brand-500/60 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{' '}
          <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
