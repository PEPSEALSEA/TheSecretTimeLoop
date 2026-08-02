import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GameTimer } from '../components/GameTimer'
import { TeamGrid } from '../components/TeamGrid'
import { leaderboardAsset, preloadLeaderboardAssets } from '../lib/assets'
import {
  answeredCount as countAnsweredTeams,
  effectivePhase,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { getQuestion } from '../lib/questions'
import type { TeamState } from '../lib/scoring'
import { TEAM_IDS } from '../lib/scoring'
import { playLeaderboardChangeSound, playScoreboardUpdateSound, unlockAudio } from '../lib/sounds'
import { STAGE_H, STAGE_W, useStageScale } from '../lib/stage'
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

function RoundBadge({ round }: { round: number }) {
  return (
    <div className="lb-round" aria-label={`รอบที่ ${round}`}>
      <img
        src={leaderboardAsset('round-scroll.png')}
        alt=""
        className="lb-round-img"
        draggable={false}
        decoding="sync"
      />
      <span className="lb-round-text">รอบที่ {round}</span>
    </div>
  )
}

function DisplayStage({
  stageScale,
  children,
  className = '',
}: {
  stageScale: number
  children: ReactNode
  className?: string
}) {
  return (
    <div className="lb-screen">
      <div
        className={`lb-stage ${className}`}
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `scale(${stageScale})`,
          backgroundImage: `url(${leaderboardAsset('bg.jpg')})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ScrollPanel({
  variant,
  children,
  className = '',
}: {
  variant: 'content' | 'status'
  children: ReactNode
  className?: string
}) {
  const src =
    variant === 'content'
      ? leaderboardAsset('content-scroll.png')
      : leaderboardAsset('status-board.png')

  return (
    <div className={`dsp-scroll dsp-scroll-${variant} ${className}`.trim()}>
      <img
        src={src}
        alt=""
        className="dsp-scroll-img"
        draggable={false}
        decoding="sync"
      />
      <div className="dsp-scroll-body">{children}</div>
    </div>
  )
}

export function DisplayAll() {
  const [game, setGame] = useState<GameState | null>(null)
  const [teams, setTeams] = useState<Record<string, TeamState>>({})
  const [assetsReady, setAssetsReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const prevUpdatedAt = useRef<Record<string, number>>({})
  const prevRankKey = useRef<string | null>(null)
  const ready = useRef(false)
  const stageScale = useStageScale()

  useEffect(() => {
    let cancelled = false
    void preloadLeaderboardAssets((loaded, total) => {
      if (!cancelled) setLoadProgress(loaded / total)
    }).then(() => {
      if (!cancelled) setAssetsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => subscribeGame(setGame), [])
  useEffect(() => subscribeAllTeams(setTeams), [])

  const phase = game ? effectivePhase(game) : 'lobby'
  const question = game ? getQuestion(game.questionIndex) : null
  const timerActive = phase === 'question' && game?.endsAt != null
  const now = useNow(timerActive || phase === 'waiting')
  const left = remainingMs(game?.endsAt ?? null, now)
  const totalMs = (question?.durationSec ?? 0) * 1000
  const isBoard = phase === 'scores' || phase === 'finished'
  const roundNumber = (game?.questionIndex ?? 0) + 1
  const answeredCount = game ? countAnsweredTeams(game) : 0

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow
    const prevBody = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtml
      document.body.style.overflow = prevBody
    }
  }, [])

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

  if (!assetsReady) {
    const pct = Math.round(loadProgress * 100)
    return (
      <main className="lb-viewport">
        <DisplayStage stageScale={stageScale}>
          <div className="dsp-center">
            <ScrollPanel variant="status" className="dsp-scroll-compact">
              <p className="dsp-kicker">The Secret Time Loop</p>
              <h1 className="dsp-title">กำลังเตรียมกระดาน</h1>
              <div
                className="dsp-progress"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="ความคืบหน้าการโหลด"
              >
                <div className="dsp-progress-bar" style={{ width: `${pct}%` }} />
              </div>
              <p className="dsp-sub font-score">{pct}%</p>
            </ScrollPanel>
          </div>
        </DisplayStage>
      </main>
    )
  }

  return (
    <main className="lb-viewport" onPointerDown={unlockAudio}>
      {timerActive && left > 0 && (
        <GameTimer remainingMs={left} totalMs={totalMs} />
      )}

      <AnimatePresence mode="wait">
        {phase === 'lobby' && (
          <motion.section
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lb-screen-anim"
          >
            <DisplayStage stageScale={stageScale}>
              <div className="dsp-center">
                <ScrollPanel variant="status" className="dsp-scroll-status-lg">
                  <h1 className="dsp-title dsp-title-hero">รอเริ่มเกม</h1>
                </ScrollPanel>
                <Link to="/" className="dsp-back-link">
                  ← หน้าแรก
                </Link>
              </div>
            </DisplayStage>
          </motion.section>
        )}

        {phase === 'question' && question && (
          <motion.section
            key={`q-${game?.questionIndex}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="lb-screen-anim"
          >
            <DisplayStage stageScale={stageScale}>
              <div className="dsp-center">
                <ScrollPanel variant="content" className="dsp-scroll-question">
                  <p className="dsp-heading">โจทย์</p>
                  <p className="dsp-round">รอบที่ {roundNumber}</p>
                  <p className="dsp-prompt">{question.prompt}</p>
                </ScrollPanel>
              </div>
            </DisplayStage>
          </motion.section>
        )}

        {phase === 'waiting' && (
          <motion.section
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lb-screen-anim"
          >
            <DisplayStage stageScale={stageScale}>
              <div className="dsp-center">
                <ScrollPanel variant="status" className="dsp-scroll-status-lg">
                  <h1 className="dsp-title dsp-title-hero">หมดเวลา</h1>
                  <p className="dsp-answered-count">
                    ตอบแล้ว {answeredCount}/{TEAM_IDS.length} ทีม
                  </p>
                </ScrollPanel>
              </div>
            </DisplayStage>
          </motion.section>
        )}

        {phase === 'reveal' && question && (
          <motion.section
            key={`reveal-${game?.questionIndex}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="lb-screen-anim"
          >
            <DisplayStage stageScale={stageScale}>
              <div className="dsp-center">
                <ScrollPanel variant="content" className="dsp-scroll-reveal">
                  <p className="dsp-heading">เฉลย</p>
                  <p className="dsp-round">รอบที่ {roundNumber}</p>
                  <p className="dsp-answer">{question.answer}</p>
                </ScrollPanel>
              </div>
            </DisplayStage>
          </motion.section>
        )}

        {isBoard && (
          <motion.section
            key="scores"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lb-screen-anim"
          >
            <DisplayStage stageScale={stageScale}>
              <div className="lb-inner">
                <header className="lb-header">
                  <RoundBadge round={roundNumber} />
                  <img
                    src={leaderboardAsset('title-scroll.png')}
                    alt="LEADERBOARD"
                    className="lb-title"
                    draggable={false}
                    decoding="sync"
                  />
                  <RoundBadge round={roundNumber} />
                </header>

                <TeamGrid teams={teams} scoredTeams={game?.scoredTeams ?? {}} />
              </div>
            </DisplayStage>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  )
}
