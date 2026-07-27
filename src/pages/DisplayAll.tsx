import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TeamGrid } from '../components/TeamGrid'
import type { TeamState } from '../lib/scoring'
import { subscribeAllTeams } from '../lib/teams'

export function DisplayAll() {
  const [teams, setTeams] = useState<Record<string, TeamState>>({})

  useEffect(() => subscribeAllTeams(setTeams), [])

  return (
    <main className="sea-grain min-h-dvh px-4 py-6 md:px-8 md:py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <Link to="/" className="text-sm text-white/40 no-underline hover:text-[var(--color-gold-400)]">
            หน้าแรก
          </Link>
          <h1 className="font-display mt-2 text-4xl text-[var(--color-gold-300)] md:text-5xl">
            The Secret Time Loop
          </h1>
          <p className="text-white/60">กระดานคะแนนทุกทีม · อัปเดตสด</p>
        </div>
      </div>
      <TeamGrid teams={teams} linkPrefix="/display" />
    </main>
  )
}
