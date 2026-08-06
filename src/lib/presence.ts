import {
  onDisconnect,
  onValue,
  ref,
  remove,
  set,
  type Unsubscribe,
} from 'firebase/database'
import { db } from './firebase'

export const SPARK_MAX_CONNECTIONS = 100
export const SPARK_DOWNLOAD_MB_PER_DAY = 360
export const SPARK_DOWNLOAD_GB_PER_MONTH = 10
export const SPARK_STORAGE_GB = 1

export const FIREBASE_USAGE_URL =
  'https://console.firebase.google.com/project/secret-timeloop-2026/usage/details'

const SESSION_KEY = 'stl-presence-id'

function sessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

export type PresenceEntry = {
  at: number | object
  path: string
  role: string
}

function roleFromPath(path: string): string {
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/staff')) return 'staff'
  if (path.startsWith('/display')) return 'display'
  return 'other'
}

export function startPresence(): Unsubscribe {
  const id = sessionId()
  const myRef = ref(db, `presence/${id}`)
  const connectedRef = ref(db, '.info/connected')

  return onValue(connectedRef, (snap) => {
    if (snap.val() !== true) return
    const path = window.location.pathname
    void onDisconnect(myRef)
      .remove()
      .then(() =>
        set(myRef, {
          at: Date.now(),
          path,
          role: roleFromPath(path),
        } satisfies PresenceEntry),
      )
  })
}

export function subscribePresence(
  onData: (entries: Record<string, PresenceEntry>) => void,
): Unsubscribe {
  return onValue(ref(db, 'presence'), (snap) => {
    onData((snap.val() as Record<string, PresenceEntry> | null) ?? {})
  })
}

export function clearOwnPresence(): Promise<void> {
  return remove(ref(db, `presence/${sessionId()}`))
}

export function countPresenceByRole(
  entries: Record<string, PresenceEntry>,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of Object.values(entries)) {
    const role = entry.role || 'other'
    counts[role] = (counts[role] ?? 0) + 1
  }
  return counts
}
