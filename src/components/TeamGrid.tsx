import { Link } from 'react-router-dom'
import { TEAM_IDS, formatScore, type TeamState } from '../lib/scoring'
import { AnimatedScore } from './AnimatedScore'

type Props = {
  teams: Record<string, TeamState>
  linkPrefix?: string
}

export function TeamGrid({ teams, linkPrefix }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {TEAM_IDS.map((id) => {
        const team = teams[id]
        const score = team?.score ?? 0
        const inner = (
          <div className="panel-wood rounded-xl p-4 text-center">
            <p className="font-display text-xl text-[var(--color-gold-400)]">
              {team?.name ?? `ทีม ${id}`}
            </p>
            {team ? (
              <AnimatedScore score={score} size="sm" />
            ) : (
              <p className="mt-2 text-2xl text-white/40">{formatScore(0)}</p>
            )}
          </div>
        )

        if (!linkPrefix) return <div key={id}>{inner}</div>

        return (
          <Link key={id} to={`${linkPrefix}/${id}`} className="block no-underline">
            {inner}
          </Link>
        )
      })}
    </div>
  )
}
