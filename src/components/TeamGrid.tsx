import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { leaderboardAsset } from '../lib/assets'
import { TEAM_IDS, formatScore, type TeamState } from '../lib/scoring'

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
  const cardSrc = leaderboardAsset('team-card.png')

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
    <div className="lb-grid">
      {TEAM_IDS.map((id) => {
        const team = teams[id]
        const isFlash = Boolean(flashed[id])
        const isScored = Boolean(scoredTeams[id])
        const rank = ranks[id]
        const scoreLabel = team ? `${formatScore(team.score)} คะแนน` : '— คะแนน'

        return (
          <motion.article
            key={id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className={`lb-card ${isFlash ? 'lb-card-flash' : ''} ${isScored ? 'lb-card-scored' : ''}`}
          >
            <img
              src={cardSrc}
              alt=""
              className="lb-card-bg"
              draggable={false}
              decoding="sync"
            />
            <div className="lb-card-body">
              <span className="lb-card-rank">#{rank}</span>
              <p className="lb-card-name">{team?.name ?? `ทีมที่ ${id}`}</p>
              <p className={`lb-card-score ${isScored ? 'lb-card-score-scored' : ''}`}>
                {scoreLabel}
              </p>
            </div>
          </motion.article>
        )
      })}
    </div>
  )
}
