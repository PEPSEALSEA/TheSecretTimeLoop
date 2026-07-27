import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatedScore } from '../components/AnimatedScore'
import { formatDelta, type TeamState } from '../lib/scoring'
import { playRoundSound } from '../lib/sounds'
import { subscribeTeam } from '../lib/teams'

export function DisplayTeam() {
  const { teamId = '1' } = useParams()
  const [team, setTeam] = useState<TeamState | null>(null)
  const [flash, setFlash] = useState(false)
  const lastUpdated = useRef<number | null>(null)

  useEffect(() => {
    return subscribeTeam(teamId, (data) => {
      setTeam(data)
      if (
        data?.lastRound &&
        data.updatedAt &&
        lastUpdated.current !== null &&
        data.updatedAt !== lastUpdated.current
      ) {
        playRoundSound(data.lastRound.result)
        setFlash(true)
        window.setTimeout(() => setFlash(false), 700)
      }
      if (data?.updatedAt) lastUpdated.current = data.updatedAt
    })
  }, [teamId])

  const last = team?.lastRound

  return (
    <main className="sea-grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(201,162,39,0.12), transparent 70%)',
        }}
      />

      <Link
        to="/"
        className="absolute left-4 top-4 z-10 text-sm text-[var(--color-mist)] no-underline hover:text-[var(--color-brass)]"
      >
        ← หน้าแรก
      </Link>
      <Link
        to="/display/all"
        className="absolute right-4 top-4 z-10 text-sm text-[var(--color-mist)] no-underline hover:text-[var(--color-brass)]"
      >
        กระดานรวม
      </Link>

      <motion.p
        key={team?.name ?? teamId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display z-10 mb-2 text-[clamp(1.8rem,5vw,3.5rem)] text-[var(--color-brass)]"
      >
        {team?.name ?? `ทีม ${teamId}`}
      </motion.p>
      <p className="z-10 mb-8 text-xs font-medium uppercase tracking-[0.45em] text-[var(--color-mist)]">
        คะแนนทีม
      </p>

      {team ? (
        <div className="z-10">
          <AnimatedScore score={team.score} size="xl" flash={flash} />
        </div>
      ) : (
        <p className="font-display z-10 text-5xl text-white/25">รอข้อมูล…</p>
      )}

      <AnimatePresence mode="wait">
        {last && (
          <motion.div
            key={`${last.result}-${team?.updatedAt}`}
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className={`z-10 mt-10 rounded-2xl px-8 py-4 text-center text-xl font-bold md:text-2xl ${
              last.result === 'correct'
                ? 'bg-[rgba(60,184,138,0.18)] text-[var(--color-success)]'
                : 'bg-[rgba(212,90,72,0.18)] text-[var(--color-danger)]'
            }`}
          >
            {last.result === 'correct' ? 'ถูก' : 'ผิด'} · {formatDelta(last.delta)} · ×
            {last.multiplier}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
