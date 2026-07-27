import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TeamGrid } from '../components/TeamGrid'
import type { TeamState } from '../lib/scoring'
import { TEAM_IDS } from '../lib/scoring'
import { subscribeAllTeams } from '../lib/teams'

export function DisplayAll() {
  const [teams, setTeams] = useState<Record<string, TeamState>>({})

  useEffect(() => subscribeAllTeams(setTeams), [])

  const liveCount = useMemo(
    () => TEAM_IDS.filter((id) => teams[id]).length,
    [teams],
  )

  const leader = useMemo(() => {
    let best: { id: string; score: number; name: string } | null = null
    for (const id of TEAM_IDS) {
      const t = teams[id]
      if (!t) continue
      if (!best || t.score > best.score) {
        best = { id, score: t.score, name: t.name }
      }
    }
    return best
  }, [teams])

  return (
    <main className="sea-grain min-h-dvh px-4 py-6 md:px-8 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-7 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <Link
            to="/"
            className="text-sm text-[var(--color-mist)] no-underline transition hover:text-[var(--color-brass)]"
          >
            ← หน้าแรก
          </Link>
          <h1 className="font-display mt-3 text-[clamp(1.8rem,5vw,3.2rem)] text-[var(--color-brass-soft)]">
            The Secret Time Loop
          </h1>
          <p className="mt-1 text-[var(--color-mist)]">
            กระดานคะแนนทุกทีม · อัปเดตสดจาก Firebase
          </p>
        </div>
        <div className="panel flex flex-wrap items-center gap-4 rounded-xl px-4 py-3 text-sm">
          <div>
            <p className="text-[var(--color-mist)]">ออนไลน์</p>
            <p className="font-display text-lg text-[var(--color-brass-soft)]">
              {liveCount}/{TEAM_IDS.length}
            </p>
          </div>
          {leader && (
            <div className="border-l border-[rgba(201,162,39,0.25)] pl-4">
              <p className="text-[var(--color-mist)]">นำอยู่</p>
              <p className="font-semibold text-[var(--color-brass-soft)]">{leader.name}</p>
            </div>
          )}
          <div className="flex items-center gap-2 border-l border-[rgba(201,162,39,0.25)] pl-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
            </span>
            <span className="text-[var(--color-mist)]">LIVE</span>
          </div>
        </div>
      </motion.div>

      <TeamGrid teams={teams} linkPrefix="/display" ranked />
    </main>
  )
}
