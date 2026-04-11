'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseExamTimerOptions {
  gracePeriodSeconds?: number
  onGraceStart?: () => void
  initialSeconds?: number
}

export function useExamTimer(
  durationMinutes: number,
  onExpire: () => void,
  options: UseExamTimerOptions = {}
) {
  const gracePeriodSeconds = options.gracePeriodSeconds ?? 30
  const [secondsLeft, setSecondsLeft] = useState(options.initialSeconds ?? durationMinutes * 60)
  const [isRunning, setIsRunning]     = useState(false)
  const [isGracePeriod, setIsGracePeriod] = useState(false)

  useEffect(() => {
    setSecondsLeft(options.initialSeconds ?? durationMinutes * 60)
    setIsGracePeriod((options.initialSeconds ?? durationMinutes * 60) <= 0)
  }, [durationMinutes, options.initialSeconds])

  useEffect(() => {
    if (!isRunning) return
    if (secondsLeft <= -gracePeriodSeconds) {
      onExpire()
      return
    }
    if (secondsLeft === 0 && !isGracePeriod) {
      setIsGracePeriod(true)
      options.onGraceStart?.()
    }
    const t = setInterval(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearInterval(t)
  }, [gracePeriodSeconds, isGracePeriod, isRunning, onExpire, options, secondsLeft])

  const start  = useCallback(() => setIsRunning(true),  [])
  const pause  = useCallback(() => setIsRunning(false), [])
  const displaySeconds = Math.max(secondsLeft, 0)

  const formatted = {
    hours:   String(Math.floor(displaySeconds / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((displaySeconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(displaySeconds % 60).padStart(2, '0'),
    total:   secondsLeft,
    danger:  secondsLeft < 300,  // < 5 min
    warning: secondsLeft < 600,  // < 10 min
    isGracePeriod,
  }

  return { secondsLeft, formatted, start, pause, isRunning, isGracePeriod, setSecondsLeft }
}
