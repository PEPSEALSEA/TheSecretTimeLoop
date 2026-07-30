import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameTimer } from '../components/GameTimer'
import { TeamGrid } from '../components/TeamGrid'
import {
  effectivePhase,
  questionProgressLabel,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { getQuestion } from '../lib/questions'
import type { TeamState } from '../lib/scoring'
import { TEAM_IDS } from '../lib/scoring'
import { playLeaderboardChangeSound, playScoreboardUpdateSound, unlockAudio } from '../lib/sounds'
import { subscribeAllTeams } from '../lib/teams'
import { remainingMs, useNow } from '../lib/timer'

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
  const [game, setGame] = useState<GameState | null>(null)
  const [teams, setTeams] = useState<Record<string, TeamState>>({})
  const prevUpdatedAt = useRef<Record<string, number>>({})
  const prevRankKey = useRef<string | null>(null)
  const ready = useRef(false)

  useEffect(() => subscribeGame(setGame), [])
  useEffect(() => subscribeAllTeams(setTeams), [])

  const phase = game ? effectivePhase(game) : 'lobby'
  const question = game ? getQuestion(game.questionIndex) : null
  const timerActive = phase === 'question' && game?.endsAt != null
  const now = useNow(timerActive || phase === 'waiting')
  const left = remainingMs(game?.endsAt ?? null, now)
  const totalMs = (question?.durationSec ?? 0) * 1000

  useEffect(() => {
    if (phase !== 'scores') return
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
  }, [teams, phase])

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
    <main
      className="pirate-scene sea-grain relative min-h-dvh px-4 py-6 md:px-8 md:py-10"
      onPointerDown={unlockAudio}
    >
      {timerActive && left > 0 && (
        <GameTimer remainingMs={left} totalMs={totalMs} />
      )}

      <AnimatePresence mode="wait">
        {phase === 'lobby' && (
          <motion.section
            key="lobby"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-auto flex min-h-[70dvh] max-w-5xl flex-col items-center justify-center text-center"
          >
            <p className="font-pirate text-2xl text-[var(--color-ocean)] md:text-3xl">
              The Secret Time Loop
            </p>
            <h1 className="font-display title-glow mt-3 text-[clamp(2.4rem,7vw,4.5rem)]">
              รอเริ่มเกม
            </h1>
            <p className="mt-4 text-[var(--color-ink-muted)]">
              แอดมินกดเริ่มที่หน้า /admin
            </p>
            <Link
              to="/"
              className="mt-8 text-sm text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-ocean)]"
            >
              ← หน้าแรก
            </Link>
          </motion.section>
        )}

        {phase === 'question' && question && (
          <motion.section
            key={`q-${game?.questionIndex}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="mx-auto flex min-h-[70dvh] max-w-5xl flex-col justify-center px-2"
          >
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-[var(--color-ink-muted)]">
              {questionProgressLabel(game?.questionIndex ?? 0)}
            </p>
            <div className="parchment panel mt-4 rounded-[2rem] p-8 md:p-14">
              <h1 className="font-display title-glow text-[clamp(2rem,6vw,4rem)] leading-tight text-[var(--color-ocean-deep)]">
                {question.prompt}
              </h1>
            </div>
          </motion.section>
        )}

        {phase === 'waiting' && (
          <motion.section
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mx-auto flex min-h-[70dvh] max-w-4xl flex-col items-center justify-center text-center"
          >
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-[var(--color-ink-muted)]">
              {questionProgressLabel(game?.questionIndex ?? 0)}
            </p>
            <h1 className="font-display title-glow mt-4 text-[clamp(2.2rem,6vw,4rem)]">
              หมดเวลา
            </h1>
            <p className="mt-3 text-lg text-[var(--color-ink-muted)]">
              รอแอดมินเปิดเฉลย
            </p>
          </motion.section>
        )}

        {phase === 'reveal' && question && (
          <motion.section
            key={`reveal-${game?.questionIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto flex min-h-[70dvh] max-w-5xl flex-col justify-center"
          >
            <p className="text-sm font-bold uppercase tracking-[0.32em] text-[var(--color-ink-muted)]">
              เฉลย · {questionProgressLabel(game?.questionIndex ?? 0)}
            </p>
            <div className="parchment panel mt-4 rounded-[2rem] p-8 md:p-14">
              <p className="text-sm text-[var(--color-ink-muted)]">{question.prompt}</p>
              <h1 className="font-display title-glow mt-4 text-[clamp(2.2rem,6vw,4.2rem)] text-[var(--color-ocean-deep)]">
                {question.answer}
              </h1>
            </div>
          </motion.section>
        )}

        {(phase === 'scores' || phase === 'finished') && (
          <motion.section
            key="scores"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto max-w-7xl"
          >
            <div className="parchment panel mb-7 overflow-hidden rounded-[1.75rem] p-5 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-pirate text-xl text-[var(--color-ocean)] md:text-2xl">
                    The Secret Time Loop
                  </p>
                  <h1 className="font-display title-glow mt-1 text-[clamp(2rem,5vw,3.5rem)] leading-tight">
                    {phase === 'finished' ? 'สรุปคะแนนสุดท้าย' : 'กระดานคะแนนรวม'}
                  </h1>
                  <p className="mt-2 text-sm text-[var(--color-ink-muted)] md:text-base">
                    {phase === 'finished'
                      ? 'จบเกมแล้ว'
                      : `${questionProgressLabel(game?.questionIndex ?? 0)} · ทีมนำ: ${leader?.name ?? '—'}`}
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
            </div>
            <TeamGrid teams={teams} scoredTeams={game?.scoredTeams ?? {}} />
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  )
}
