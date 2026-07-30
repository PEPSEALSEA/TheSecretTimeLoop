import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TEAM_IDS, type TeamState } from '../lib/scoring'
import { AnimatedScore } from './AnimatedScore'

type Props = {
  teams: Record<string, TeamState>
  scoredTeams?: Record<string, boolean>
}

function computeRanks(teams: Record<string, TeamState>): Record<string, number> {
  const ordered = [...TEAM_IDS].sort((a, b) => {
    const scoreA = teams[a]?.score ?? Number.NEGATIVE_INFINITY
    const scoreB = teams[b]?.score ?? Number.NEGATIVE_INFINITY
    if (!teams[a] && !teams[b]) return Number(a) - Number(b)
    if (!teams[a]) return 1
    if (!teams[b]) return -1
    return scoreB - scoreA || Number(a) - Number(b)
  })
  const ranks: Record<string, number> = {}
  ordered.forEach((id, index) => {
    ranks[id] = index + 1
  })
  return ranks
}

export function TeamGrid({ teams, scoredTeams = {} }: Props) {
  const ranks = useMemo(() => computeRanks(teams), [teams])
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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:gap-4">
      {TEAM_IDS.map((id) => {
        const team = teams[id]
        const isFlash = Boolean(flashed[id])
        const isScored = Boolean(scoredTeams[id])
        const rank = ranks[id]

        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ opacity: { duration: 0.35 } }}
            className={`parchment panel relative overflow-hidden rounded-[1.6rem] p-4 md:p-5 ${
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
                #{rank}
              </div>
            </div>

            <div
              className={`rounded-2xl border px-4 py-4 transition-colors duration-300 ${
                isScored
                  ? 'border-[rgba(45,138,94,0.45)] bg-[rgba(45,138,94,0.22)]'
                  : 'border-[rgba(42,24,16,0.1)] bg-[rgba(255,255,255,0.32)]'
              }`}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
                คะแนนรวม
              </p>
              {team ? (
                <AnimatedScore score={team.score} size="sm" flash={isFlash} />
              ) : (
                <p className="font-score text-3xl text-[var(--color-ink-muted)]/35">—</p>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
