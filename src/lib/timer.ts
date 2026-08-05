import { useEffect, useLayoutEffect, useState } from 'react'

export function useNow(active: boolean, intervalMs = 200): number {
  const [now, setNow] = useState(() => Date.now())

  useLayoutEffect(() => {
    if (!active) return
    setNow(Date.now())
  }, [active])

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])

  return now
}

export function remainingMs(endsAt: number | null, now: number): number {
  if (endsAt == null) return 0
  return Math.max(0, endsAt - now)
}

export function formatTimer(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
