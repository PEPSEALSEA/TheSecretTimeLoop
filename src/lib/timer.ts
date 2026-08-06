import { onValue, ref, type Unsubscribe } from 'firebase/database'
import { useEffect, useLayoutEffect, useState } from 'react'
import { db } from './firebase'

let cachedOffset = 0
let offsetStarted = false
const offsetListeners = new Set<(offsetMs: number) => void>()

function ensureServerOffsetListener(): void {
  if (offsetStarted) return
  offsetStarted = true
  onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
    cachedOffset = typeof snap.val() === 'number' ? snap.val() : 0
    for (const listener of offsetListeners) listener(cachedOffset)
  })
}

export function serverNow(): number {
  ensureServerOffsetListener()
  return Date.now() + cachedOffset
}

export function subscribeServerTimeOffset(
  onOffset: (offsetMs: number) => void,
): Unsubscribe {
  ensureServerOffsetListener()
  offsetListeners.add(onOffset)
  onOffset(cachedOffset)
  return () => {
    offsetListeners.delete(onOffset)
  }
}

export function useNow(active: boolean, intervalMs = 200): number {
  const [offset, setOffset] = useState(() => {
    ensureServerOffsetListener()
    return cachedOffset
  })
  const [now, setNow] = useState(() => Date.now() + cachedOffset)

  useEffect(() => subscribeServerTimeOffset(setOffset), [])

  useLayoutEffect(() => {
    if (!active) return
    setNow(Date.now() + offset)
  }, [active, offset])

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(Date.now() + offset), intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs, offset])

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
