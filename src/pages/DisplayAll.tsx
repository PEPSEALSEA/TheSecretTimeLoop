import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GameTimer } from '../components/GameTimer'
import { TeamGrid } from '../components/TeamGrid'
import {
  leaderboardAsset,
  preloadLeaderboardAssets,
  questionImageAsset,
} from '../lib/assets'
import {
  answeredCount as countAnsweredTeams,
  effectivePhase,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { getQuestion } from '../lib/questions'
import type { TeamState } from '../lib/scoring'
import { TEAM_IDS, formatMultiplier } from '../lib/scoring'
import { playLeaderboardChangeSound, playScoreboardUpdateSound, unlockAudio } from '../lib/sounds'
import { STAGE_H, STAGE_W, useStageScale } from '../lib/stage'
import { subscribeAllTeams } from '../lib/teams'
import { remainingMs, useNow } from '../lib/timer'

const panelTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
}

const panelMotion = {
  initial: { opacity: 0, y: 18, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
  transition: panelTransition,
}

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

function StageShell({
  stageScale,
  children,
}: {
  stageScale: number
  children: ReactNode
}) {
  return (
    <div className="lb-screen">
      <div
        className="lb-stage"
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

function fitPromptClass(text: string): string {
  if (text.length > 180) return 'dsp-prompt dsp-prompt-xs'
  if (text.length > 110) return 'dsp-prompt dsp-prompt-sm'
  return 'dsp-prompt'
}

function fitChoicesClass(choices: { text: string }[]): string {
  const maxLen = Math.max(0, ...choices.map((c) => c.text.length))
  if (maxLen > 80) return 'dsp-choices dsp-choices-dense'
  if (maxLen > 40) return 'dsp-choices dsp-choices-md'
  return 'dsp-choices'
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
        <StageShell stageScale={stageScale}>
          <div className="dsp-layer">
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
          </div>
        </StageShell>
      </main>
    )
  }

  const panelKey =
    phase === 'lobby'
      ? 'lobby'
      : phase === 'question'
        ? `q-${game?.questionIndex}`
        : phase === 'waiting'
          ? 'waiting'
          : phase === 'reveal'
            ? `reveal-${game?.questionIndex}`
            : 'scores'

  const hasAnswerImage = Boolean(question?.answerImage)

  return (
    <main className="lb-viewport" onPointerDown={unlockAudio}>
      {timerActive && left > 0 && (
        <GameTimer remainingMs={left} totalMs={totalMs} />
      )}

      <StageShell stageScale={stageScale}>
        <AnimatePresence mode="sync" initial={false}>
          {phase === 'lobby' && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center">
                <ScrollPanel variant="status" className="dsp-scroll-status-lg">
                  <h1 className="dsp-title dsp-title-hero">รอเริ่มเกม</h1>
                </ScrollPanel>
                <Link to="/" className="dsp-back-link">
                  ← หน้าแรก
                </Link>
              </div>
            </motion.div>
          )}

          {phase === 'question' && question && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center dsp-center-tight">
                <ScrollPanel variant="content" className="dsp-scroll-question">
                  <p className="dsp-heading">โจทย์</p>
                  <p className="dsp-round">
                    ข้อ {roundNumber}
                    <span className="dsp-mul"> · ×{formatMultiplier(question.multiplier)}</span>
                  </p>
                  <p className={fitPromptClass(question.prompt)}>{question.prompt}</p>
                  <div className={fitChoicesClass(question.choices)}>
                    {question.choices.map((choice) => (
                      <div key={choice.id} className="dsp-choice">
                        <span className="dsp-choice-id">{choice.id}</span>
                        <span className="dsp-choice-text">{choice.text}</span>
                      </div>
                    ))}
                  </div>
                </ScrollPanel>
              </div>
            </motion.div>
          )}

          {phase === 'waiting' && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center">
                <ScrollPanel variant="status" className="dsp-scroll-status-lg">
                  <h1 className="dsp-title dsp-title-hero">หมดเวลา</h1>
                  <p className="dsp-answered-count">
                    ตอบแล้ว {answeredCount}/{TEAM_IDS.length} ทีม
                  </p>
                </ScrollPanel>
              </div>
            </motion.div>
          )}

          {phase === 'reveal' && question && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center">
                <ScrollPanel
                  variant="content"
                  className={
                    hasAnswerImage
                      ? 'dsp-scroll-reveal dsp-scroll-reveal-img'
                      : 'dsp-scroll-reveal'
                  }
                >
                  <p className="dsp-heading">เฉลย</p>
                  <p className="dsp-round">ข้อ {roundNumber}</p>
                  <p className="dsp-answer">{question.answerLabel}</p>
                  {hasAnswerImage && question.answerImage && (
                    <img
                      src={questionImageAsset(question.answerImage)}
                      alt=""
                      className="dsp-answer-img"
                      draggable={false}
                      decoding="sync"
                    />
                  )}
                  <p
                    className={
                      hasAnswerImage
                        ? 'dsp-explain dsp-explain-sm'
                        : 'dsp-explain'
                    }
                  >
                    {question.explanation}
                  </p>
                </ScrollPanel>
              </div>
            </motion.div>
          )}

          {isBoard && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
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
            </motion.div>
          )}
        </AnimatePresence>
      </StageShell>
    </main>
  )
}
