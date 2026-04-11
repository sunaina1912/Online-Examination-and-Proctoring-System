'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center px-4">
          <p className="font-mono text-danger text-sm mb-4">Error</p>
          <h1 className="font-display text-3xl font-bold text-white mb-3">Something went wrong</h1>
          <p className="text-gray-500 mb-8">An unexpected error occurred. Please try again.</p>
          <button
            onClick={reset}
            className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
