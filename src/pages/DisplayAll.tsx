import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { TeamGrid } from '../components/TeamGrid'
import type { TeamState } from '../lib/scoring'
import { TEAM_IDS } from '../lib/scoring'
import { playLeaderboardChangeSound, playScoreboardUpdateSound, unlockAudio } from '../lib/sounds'
import { subscribeAllTeams } from '../lib/teams'

function rankKey(teams: Record<string, TeamState>): string {
  return TEAM_IDS.map((id) => `${id}:${teams[id]?.score ?? 0}`)
    .sort((a, b) => {
      const scoreA = Number(a.split(':')[1])
      const scoreB = Number(b.split(':')[1])
      return scoreB - scoreA || Number(a.split(':')[0]) - Number(b.split(':')[0])
    })
    .join('|')
}

export function DisplayAll() {
  const [teams, setTeams] = useState<Record<string, TeamState>>({})
  const prevUpdatedAt = useRef<Record<string, number>>({})
  const prevRankKey = useRef<string | null>(null)
  const ready = useRef(false)

  useEffect(() => subscribeAllTeams(setTeams), [])

  useEffect(() => {
    if (!ready.current) {
      for (const id of TEAM_IDS) {
        const team = teams[id]
        if (team) prevUpdatedAt.current[id] = team.updatedAt
      }
      prevRankKey.current = rankKey(teams)
      if (Object.keys(teams).length > 0) ready.current = true
      return
    }

    let scoreChanged = false
    for (const id of TEAM_IDS) {
      const team = teams[id]
      if (!team) continue
      const prev = prevUpdatedAt.current[id]
      if (prev !== undefined && team.updatedAt !== prev) {
        scoreChanged = true
      }
      prevUpdatedAt.current[id] = team.updatedAt
    }

    if (!scoreChanged) return

    const nextRank = rankKey(teams)
    if (prevRankKey.current && nextRank !== prevRankKey.current) {
      playLeaderboardChangeSound()
    } else {
      playScoreboardUpdateSound()
    }
    prevRankKey.current = nextRank
  }, [teams])

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

  const totalScore = useMemo(
    () => TEAM_IDS.reduce((sum, id) => sum + (teams[id]?.score ?? 0), 0),
    [teams],
  )

  const lastUpdatedTeam = useMemo(() => {
    let latest: TeamState | null = null
    for (const id of TEAM_IDS) {
      const team = teams[id]
      if (!team) continue
      if (!latest || team.updatedAt > latest.updatedAt) {
        latest = team
      }
    }
    return latest
  }, [teams])

  return (
    <main
      className="pirate-scene sea-grain min-h-dvh px-4 py-6 md:px-8 md:py-10"
      onPointerDown={unlockAudio}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mb-7 max-w-7xl"
      >
        <div className="parchment panel overflow-hidden rounded-[1.75rem] p-5 md:p-7">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                to="/"
                className="text-sm text-[var(--color-ink-muted)] no-underline transition hover:text-[var(--color-ocean)]"
              >
                ← หน้าแรก
              </Link>
              <p className="font-pirate mt-3 text-xl text-[var(--color-ocean)] md:text-2xl">
                The Secret Time Loop
              </p>
              <h1 className="font-display title-glow mt-1 text-[clamp(2rem,5vw,3.5rem)] leading-tight">
                กระดานคะแนนรวม
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-muted)] md:text-base">
                อัปเดตสดทุกทีม · แตะหน้าจอครั้งแรกเพื่อเปิดเสียง
              </p>
            </div>
            <div className="live-badge inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold tracking-[0.24em]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
              </span>
              LIVE
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="score-summary-card">
              <p className="score-summary-label">ทีมที่ออนไลน์</p>
              <p className="score-summary-value">
                {liveCount}
                <span className="text-lg text-[var(--color-ink-muted)]">/{TEAM_IDS.length}</span>
              </p>
            </div>
            <div className="score-summary-card">
              <p className="score-summary-label">คะแนนรวมทั้งหมด</p>
              <p className="score-summary-value">{Math.round(totalScore).toLocaleString('th-TH')}</p>
            </div>
            <div className="score-summary-card">
              <p className="score-summary-label">ทีมนำ</p>
              <p className="score-summary-value text-[clamp(1.5rem,4vw,2.2rem)]">
                {leader?.name ?? 'รอข้อมูล'}
              </p>
            </div>
            <div className="score-summary-card">
              <p className="score-summary-label">อัปเดตล่าสุด</p>
              <p className="score-summary-value text-[clamp(1.35rem,3.2vw,2rem)]">
                {lastUpdatedTeam?.name ?? 'ยังไม่มี'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mx-auto max-w-7xl">
        <TeamGrid teams={teams} ranked />
      </div>
    </main>
  )
}
