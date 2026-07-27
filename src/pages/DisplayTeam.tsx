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
      }
      if (data?.updatedAt) lastUpdated.current = data.updatedAt
    })
  }, [teamId])

  const last = team?.lastRound

  return (
    <main className="sea-grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-8">
      <Link
        to="/"
        className="absolute left-4 top-4 text-sm text-white/40 no-underline hover:text-[var(--color-gold-400)]"
      >
        หน้าแรก
      </Link>

      <p className="font-display mb-2 text-3xl text-[var(--color-gold-400)] md:text-5xl">
        {team?.name ?? `ทีม ${teamId}`}
      </p>
      <p className="mb-6 text-sm uppercase tracking-[0.4em] text-white/50">คะแนนทีม</p>

      {team ? (
        <AnimatedScore score={team.score} size="xl" />
      ) : (
        <p className="font-display text-6xl text-white/30">รอข้อมูล…</p>
      )}

      <AnimatePresence mode="wait">
        {last && (
          <motion.div
            key={`${last.result}-${team?.updatedAt}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-8 rounded-xl px-6 py-3 text-center text-xl font-bold ${
              last.result === 'correct'
                ? 'bg-[var(--color-success)]/25 text-[var(--color-success)]'
                : 'bg-[var(--color-danger)]/25 text-[var(--color-danger)]'
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
