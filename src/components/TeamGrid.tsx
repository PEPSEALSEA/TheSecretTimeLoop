import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TEAM_IDS,
  formatDelta,
  type TeamState,
} from '../lib/scoring'
import { AnimatedScore } from './AnimatedScore'

type Props = {
  teams: Record<string, TeamState>
  linkPrefix?: string
  ranked?: boolean
}

export function TeamGrid({ teams, linkPrefix, ranked = true }: Props) {
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
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
                  ? 'rgba(232, 201, 106, 0.75)'
                  : 'rgba(201, 162, 39, 0.28)',
              }}
              transition={{
                layout: { type: 'spring', stiffness: 280, damping: 28 },
                opacity: { duration: 0.35 },
              }}
              className={`panel relative overflow-hidden rounded-2xl p-4 text-center md:p-5 ${
                isFlash ? 'rank-pulse panel-glow' : ''
              }`}
            >
              <div className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-md bg-[rgba(201,162,39,0.15)] text-xs font-bold text-[var(--color-brass-soft)]">
                {index + 1}
              </div>
              <p className="mt-1 font-display text-lg text-[var(--color-brass)] md:text-xl">
                {team?.name ?? `ทีม ${id}`}
              </p>
              <div className="mt-2">
                {team ? (
                  <AnimatedScore score={team.score} size="sm" flash={isFlash} />
                ) : (
                  <p className="font-score text-3xl text-white/30">—</p>
                )}
              </div>
              <AnimatePresence mode="wait">
                {last && (
                  <motion.p
                    key={`${last.result}-${team?.updatedAt}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-3 text-sm font-semibold ${
                      last.result === 'correct'
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-danger)]'
                    }`}
                  >
                    {last.result === 'correct' ? 'ถูก' : 'ผิด'} · {formatDelta(last.delta)} · ×
                    {last.multiplier}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )

          if (!linkPrefix) return <div key={id}>{card}</div>

          return (
            <Link key={id} to={`${linkPrefix}/${id}`} className="block no-underline">
              {card}
            </Link>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
