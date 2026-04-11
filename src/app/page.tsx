import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Shield, Zap, Eye, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    const role = (session.user as any)?.role
    if (role === 'admin' || role === 'examiner') redirect('/admin/dashboard')
    else redirect('/admin/dashboard') // students also go to dashboard for now
  }

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <nav className="border-b border-surface-3 px-8 py-4 flex items-center justify-between">
        <span className="font-display font-bold text-xl text-white tracking-tight">
          Proctor<span className="text-brand-400">X</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link href="/auth/register" className="text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-colors font-medium">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center relative overflow-hidden">
        {/* Grid bg */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-50 pointer-events-none" />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs bg-brand-500/10 border border-brand-500/20 text-brand-300 px-3 py-1.5 rounded-full mb-6">
            <Shield className="w-3.5 h-3.5" />
            AI-Powered Exam Proctoring
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Secure Exams,<br />
            <span className="text-brand-400">Zero Compromise</span>
          </h1>

          <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Real-time face recognition, gaze tracking, and behavioral analysis — 
            so every exam result is genuinely earned.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/register" className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login" className="text-gray-400 hover:text-white px-6 py-3 transition-colors font-medium">
              Sign in →
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="border-t border-surface-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-surface-3">
        {[
          { icon: Eye,      label: 'Face & Gaze AI',     desc: 'Real-time identity verification' },
          { icon: Shield,   label: 'Browser Lockdown',    desc: 'No copy-paste or tab switching' },
          { icon: Zap,      label: 'Instant Scoring',     desc: 'Auto-graded MCQs on submit' },
          { icon: BarChart3,label: 'Admin Analytics',     desc: 'Risk reports & audit trail' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="p-6 flex flex-col gap-2">
            <Icon className="w-5 h-5 text-brand-400 mb-1" />
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  )
}
