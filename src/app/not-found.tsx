import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 text-center">
        <p className="font-mono text-brand-500 text-sm mb-4">404</p>
        <h1 className="font-display text-4xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <Link
          href="/admin/dashboard"
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
