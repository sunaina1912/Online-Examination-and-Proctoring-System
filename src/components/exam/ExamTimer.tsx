'use client'

import { cn } from '@/lib/utils'

interface ExamTimerProps {
  formatted: {
    hours: string
    minutes: string
    seconds: string
    danger: boolean
    warning: boolean
    isGracePeriod: boolean
  }
}

export function ExamTimer({ formatted }: ExamTimerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 font-mono text-2xl font-bold tracking-widest px-4 py-2 rounded-xl border transition-colors',
        formatted.isGracePeriod
          ? 'text-danger border-danger/50 bg-danger/15 animate-pulse'
          : formatted.danger
          ? 'text-danger border-danger/40 bg-danger/10 animate-pulse'
          : formatted.warning
          ? 'text-warn  border-warn/40  bg-warn/10'
          : 'text-brand-300 border-surface-3 bg-surface-1'
      )}
    >
      <span>{formatted.hours}</span>
      <span className="opacity-60">:</span>
      <span>{formatted.minutes}</span>
      <span className="opacity-60">:</span>
      <span>{formatted.seconds}</span>
    </div>
  )
}
