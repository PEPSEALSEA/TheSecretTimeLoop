import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TEAM_IDS,
  formatDelta,
  type TeamState,
} from '../lib/scoring'
import { AnimatedScore } from './AnimatedScore'

type Props = {
  teams: Record<string, TeamState>
  ranked?: boolean
}

export function TeamGrid({ teams, ranked = true }: Props) {
  const ordered = useMemo(() => {
    const rows = TEAM_IDS.map((id) => ({
      id,
      team: teams[id],
      score: teams[id]?.score ?? 0,
    }))
    if (!ranked) return rows
    return [...rows].sort((a, b) => b.score - a.score || Number(a.id) - Number(b.id))
  }, [teams, ranked])

  const prevScores = useRef<Record<string, number>>({})
  const [flashed, setFlashed] = useState<Record<string, number>>({})

  useEffect(() => {
    const nextFlash: Record<string, number> = {}
    for (const id of TEAM_IDS) {
      const team = teams[id]
      if (!team) continue
      const prev = prevScores.current[id]
      if (prev !== undefined && prev !== team.score) {
        nextFlash[id] = team.updatedAt
      }
      prevScores.current[id] = team.score
    }
    if (!Object.keys(nextFlash).length) return
    setFlashed((f) => ({ ...f, ...nextFlash }))
    const t = window.setTimeout(() => {
      setFlashed((f) => {
        const copy = { ...f }
        for (const id of Object.keys(nextFlash)) delete copy[id]
        return copy
      })
    }, 1200)
    return () => window.clearTimeout(t)
  }, [teams])

  return (
    <LayoutGroup>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        {ordered.map(({ id, team }, index) => {
          const last = team?.lastRound
          const isFlash = Boolean(flashed[id])
          const card = (
            <motion.div
              layout
              layoutId={`team-card-${id}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{
                opacity: 1,
                y: 0,
                borderColor: isFlash
                  ? 'rgba(201, 148, 26, 0.75)'
                  : 'rgba(42, 24, 16, 0.14)',
              }}
              transition={{
                layout: { type: 'spring', stiffness: 280, damping: 28 },
                opacity: { duration: 0.35 },
              }}
              className={`parchment panel group relative overflow-hidden rounded-[1.6rem] p-4 md:p-5 ${
                isFlash ? 'rank-pulse panel-glow' : ''
              }`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(201,148,26,0.55)] to-transparent opacity-70" />
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.32em] text-[var(--color-ink-muted)]">
                    ทีม {id}
                  </p>
                  <p className="mt-2 truncate font-display text-xl text-[var(--color-ocean-deep)] md:text-2xl">
                    {team?.name ?? `ทีม ${id}`}
                  </p>
                </div>
                <div className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[rgba(42,24,16,0.12)] bg-[rgba(255,255,255,0.35)] px-3 text-sm font-bold text-[var(--color-gold)]">
                  #{index + 1}
                </div>
              </div>

              <div className="rounded-2xl border border-[rgba(42,24,16,0.1)] bg-[rgba(255,255,255,0.32)] px-4 py-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
                  คะแนนรวม
                </p>
                {team ? (
                  <AnimatedScore score={team.score} size="sm" flash={isFlash} />
                ) : (
                  <p className="font-score text-3xl text-[var(--color-ink-muted)]/35">—</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <div className="rounded-full border border-[rgba(42,24,16,0.1)] bg-[rgba(255,255,255,0.28)] px-3 py-1.5 text-[var(--color-ink-muted)]">
                  {team ? 'พร้อมแสดงผล' : 'ยังไม่มีข้อมูล'}
                </div>
                <div className="text-right text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                  สด
                </div>
              </div>

              <AnimatePresence mode="wait">
                {last ? (
                  <motion.div
                    key={`${last.result}-${team?.updatedAt}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${
                      last.result === 'correct'
                        ? 'bg-[rgba(45,138,94,0.14)] text-[var(--color-success)]'
                        : 'bg-[rgba(185,28,28,0.1)] text-[var(--color-danger)]'
                    }`}
                  >
                    {last.result === 'correct' ? 'ตอบถูก' : 'ตอบผิด'} · {formatDelta(last.delta)} · ×
                    {last.multiplier}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`idle-${id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-2xl border border-dashed border-[rgba(42,24,16,0.14)] px-4 py-3 text-sm text-[var(--color-ink-muted)]"
                  >
                    {team ? 'ยังไม่มีผลรอบล่าสุด' : 'รอข้อมูลคะแนนจากแอดมิน'}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )

          return <div key={id}>{card}</div>
        })}
      </div>
    </LayoutGroup>
  )
}
