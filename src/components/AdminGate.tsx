import { motion } from 'framer-motion'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  clearAdminAuth,
  isAdminAuthenticated,
  isAdminConfigured,
  verifyAdminPassword,
} from '../lib/adminAuth'

type Props = {
  children: ReactNode
}

export function AdminGate({ children }: Props) {
  const [authed, setAuthed] = useState(isAdminAuthenticated)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isAdminConfigured()) {
    return (
      <main className="pirate-scene flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="parchment panel max-w-md rounded-[1.75rem] p-8 text-center">
          <h1 className="font-display text-2xl text-[var(--color-ink)]">Admin ยังไม่พร้อม</h1>
          <p className="mt-3 text-[var(--color-ink-muted)]">
            ตั้งค่า <code className="rounded bg-black/5 px-1.5 py-0.5">VITE_ADMIN_PASSWORD</code>{' '}
            ใน environment ก่อนใช้งานหน้าแอดมิน
          </p>
          <Link to="/" className="btn-ocean mt-6 inline-block rounded-xl px-5 py-2.5 no-underline">
            กลับหน้าแรก
          </Link>
        </div>
      </main>
    )
  }

  if (!authed) {
    function onSubmit(e: FormEvent) {
      e.preventDefault()
      if (verifyAdminPassword(password)) {
        setAuthed(true)
        setError(null)
        return
      }
      setError('รหัสผ่านไม่ถูกต้อง')
    }

    return (
      <main className="pirate-scene flex min-h-dvh items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="parchment panel w-full max-w-md rounded-[1.75rem] p-7 md:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-pirate-red)]">
            Staff Only
          </p>
          <h1 className="font-display mt-2 text-[clamp(1.8rem,5vw,2.4rem)] text-[var(--color-ink)]">
            เข้าสู่ระบบแอดมิน
          </h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            หน้านี้ไม่แสดงบนหน้าปกติ — ต้องมีรหัสผ่านเพื่อแก้คะแนน
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[var(--color-ink-muted)]">
                รหัสผ่าน
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="กรอกรหัสผ่านพี่สตาฟ"
              />
            </label>
            {error && <p className="text-center text-sm text-[var(--color-danger)]">{error}</p>}
            <button type="submit" className="btn-gold w-full rounded-xl py-3.5 text-lg">
              เข้าสู่ระบบ
            </button>
          </form>

          <Link
            to="/"
            className="mt-5 block text-center text-sm text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-ocean)]"
          >
            ← กลับหน้าแรก
          </Link>
        </motion.div>
      </main>
    )
  }

  return (
    <>
      {children}
      <button
        type="button"
        onClick={() => {
          clearAdminAuth()
          setAuthed(false)
          setPassword('')
        }}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-[rgba(26,74,110,0.25)] bg-[rgba(244,228,200,0.92)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] shadow-lg backdrop-blur hover:text-[var(--color-pirate-red)]"
      >
        ออกจากระบบ
      </button>
    </>
  )
}
