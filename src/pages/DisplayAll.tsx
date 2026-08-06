import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnswerVideo, stopAllAnswerVideos } from '../components/AnswerVideo'
import { GameTimer } from '../components/GameTimer'
import { TeamGrid } from '../components/TeamGrid'
import { ZoomableImage } from '../components/ZoomableImage'
import {
  leaderboardAsset,
  preloadLeaderboardAssets,
  questionImageAsset,
  questionVideoAsset,
} from '../lib/assets'
import {
  answeredCount as countAnsweredTeams,
  effectivePhase,
  lockExpiredQuestion,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { getQuestion, TOTAL_QUESTIONS } from '../lib/questions'
import type { TeamState } from '../lib/scoring'
import { TEAM_IDS, formatMultiplier } from '../lib/scoring'
import { playLeaderboardChangeSound, playScoreboardUpdateSound, unlockAudio } from '../lib/sounds'
import { STAGE_H, STAGE_W, useStageScale } from '../lib/stage'
import { subscribeAllTeams } from '../lib/teams'
import { remainingMs, useNow } from '../lib/timer'

export type DisplayLayout = 'stage' | 'fluid'

const panelTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as const,
}

const panelMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
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

function RoundBadge({ questionNumber }: { questionNumber: number }) {
  return (
    <div className="lb-round" aria-label={`ข้อ ${questionNumber}/${TOTAL_QUESTIONS}`}>
      <img
        src={leaderboardAsset('round-scroll.png')}
        alt=""
        className="lb-round-img"
        draggable={false}
        decoding="sync"
      />
      <span className="lb-round-text">
        ข้อ {questionNumber}
        <br />
        <span className="lb-round-total">/{TOTAL_QUESTIONS}</span>
      </span>
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
      ? leaderboardAsset('content-card.png')
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

function FluidShell({ children }: { children: ReactNode }) {
  return (
    <div className="lb-screen lb-fluid-screen">
      <div
        className="lb-stage lb-fluid-stage"
        style={{
          backgroundImage: `url(${leaderboardAsset('bg.jpg')})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

function DisplayShell({
  layout,
  stageScale,
  children,
}: {
  layout: DisplayLayout
  stageScale: number
  children: ReactNode
}) {
  if (layout === 'fluid') {
    return <FluidShell>{children}</FluidShell>
  }
  return <StageShell stageScale={stageScale}>{children}</StageShell>
}

function fitPromptClass(text: string): string {
  if (text.length > 150) return 'dsp-prompt dsp-prompt-xs'
  if (text.length > 95) return 'dsp-prompt dsp-prompt-sm'
  return 'dsp-prompt'
}

function fitChoicesClass(choices: { text: string }[]): string {
  const maxLen = Math.max(0, ...choices.map((c) => c.text.length))
  if (maxLen > 70) return 'dsp-choices dsp-choices-dense'
  if (maxLen > 36) return 'dsp-choices dsp-choices-md'
  return 'dsp-choices'
}

function fitExplainClass(text: string, hasAnswerImage: boolean): string {
  const base = hasAnswerImage ? 'dsp-explain dsp-explain-sm' : 'dsp-explain'
  if (text.length > 280) return `${base} dsp-explain-xs`
  if (text.length > 180) return `${base} dsp-explain-md`
  return base
}

type DisplayAllProps = {
  layout?: DisplayLayout
}

export function DisplayAll({ layout = 'stage' }: DisplayAllProps) {
  const [game, setGame] = useState<GameState | null>(null)
  const [teams, setTeams] = useState<Record<string, TeamState>>({})
  const [assetsReady, setAssetsReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const prevUpdatedAt = useRef<Record<string, number>>({})
  const prevRankKey = useRef<string | null>(null)
  const ready = useRef(false)
  const lockAttemptEndsAt = useRef<number | null>(null)
  const stageScale = useStageScale()
  const isFluid = layout === 'fluid'

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

  const clockActive =
    game != null && game.phase !== 'lobby' && game.phase !== 'finished'
  const now = useNow(clockActive)
  const phase = game ? effectivePhase(game, now) : 'lobby'
  const question = game ? getQuestion(game.questionIndex) : null
  const timerActive = phase === 'question' && game?.endsAt != null
  const left = remainingMs(game?.endsAt ?? null, now)
  const totalMs = (question?.durationSec ?? 0) * 1000
  const isBoard = phase === 'scores' || phase === 'finished'
  const roundNumber = (game?.questionIndex ?? 0) + 1
  const answeredCount = game ? countAnsweredTeams(game) : 0

  useEffect(() => {
    if (phase !== 'revealVideo') {
      stopAllAnswerVideos()
    }
  }, [phase])

  useEffect(() => {
    if (
      game?.phase !== 'question' ||
      game.endsAt == null ||
      now < game.endsAt
    ) {
      return
    }
    if (lockAttemptEndsAt.current === game.endsAt) return
    lockAttemptEndsAt.current = game.endsAt
    void lockExpiredQuestion(now)
  }, [game, now])

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

  const rootClass = isFluid ? 'lb-viewport lb-fluid' : 'lb-viewport'

  if (!assetsReady) {
    const pct = Math.round(loadProgress * 100)
    return (
      <main className={rootClass}>
        <DisplayShell layout={layout} stageScale={stageScale}>
          <div className="dsp-layer">
            <div className="dsp-center">
              <ScrollPanel variant="content" className="dsp-scroll-stage">
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
        </DisplayShell>
      </main>
    )
  }

  const panelKey =
    phase === 'lobby'
      ? 'lobby'
      : phase === 'betting'
        ? `bet-${game?.questionIndex}`
        : phase === 'question'
          ? `q-${game?.questionIndex}`
          : phase === 'waiting'
            ? 'waiting'
            : phase === 'revealVideo'
              ? `reveal-video-${game?.questionIndex}`
              : phase === 'reveal'
                ? `reveal-${game?.questionIndex}`
                : 'scores'

  const hasAnswerImage = Boolean(question?.answerImage)
  const hasPromptImage = Boolean(question?.promptImage)
  const hasPromptAfterImage = Boolean(question?.promptAfterImage)
  const hasAnswerVideo = Boolean(question?.answerVideo)

  return (
    <main className={rootClass} onPointerDown={unlockAudio}>
      {timerActive && left > 0 && (
        <GameTimer remainingMs={left} totalMs={totalMs} />
      )}

      <DisplayShell layout={layout} stageScale={stageScale}>
        <AnimatePresence mode="wait" initial={false}>
          {phase === 'lobby' && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center">
                <ScrollPanel variant="content" className="dsp-scroll-stage">
                  <h1 className="dsp-title dsp-title-hero">รอเริ่มเกม</h1>
                </ScrollPanel>
                <Link to="/" className="dsp-back-link">
                  ← หน้าแรก
                </Link>
              </div>
            </motion.div>
          )}

          {phase === 'betting' && question && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center dsp-center-tight">
                <ScrollPanel
                  variant="content"
                  className={
                    hasPromptImage
                      ? hasPromptAfterImage
                        ? 'dsp-scroll-stage dsp-scroll-betting-img dsp-scroll-prompt-after'
                        : 'dsp-scroll-stage dsp-scroll-betting-img'
                      : 'dsp-scroll-stage'
                  }
                >
                  <p className="dsp-heading">วางเดิมพัน</p>
                  <p className="dsp-round">
                    ข้อ {roundNumber}/{TOTAL_QUESTIONS}
                    <span className="dsp-mul"> · ×{formatMultiplier(question.multiplier)}</span>
                  </p>
                  <p className={fitPromptClass(question.prompt)}>{question.prompt}</p>
                  {hasPromptImage && question.promptImage && (
                    <ZoomableImage
                      src={questionImageAsset(question.promptImage)}
                      className="dsp-prompt-img"
                    />
                  )}
                  {question.promptAfterImage && (
                    <p className={fitPromptClass(question.promptAfterImage)}>
                      {question.promptAfterImage}
                    </p>
                  )}
                </ScrollPanel>
              </div>
            </motion.div>
          )}

          {phase === 'question' && question && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center dsp-center-tight">
                <ScrollPanel
                  variant="content"
                  className={
                    hasPromptImage
                      ? hasPromptAfterImage
                        ? 'dsp-scroll-stage dsp-scroll-question-img dsp-scroll-prompt-after'
                        : 'dsp-scroll-stage dsp-scroll-question-img'
                      : 'dsp-scroll-stage'
                  }
                >
                  <p className="dsp-heading">โจทย์</p>
                  <p className="dsp-round">
                    ข้อ {roundNumber}/{TOTAL_QUESTIONS}
                    <span className="dsp-mul"> · ×{formatMultiplier(question.multiplier)}</span>
                  </p>
                  <p className={fitPromptClass(question.prompt)}>{question.prompt}</p>
                  {hasPromptImage && question.promptImage && (
                    <ZoomableImage
                      src={questionImageAsset(question.promptImage)}
                      className="dsp-prompt-img"
                    />
                  )}
                  {question.promptAfterImage && (
                    <p className={fitPromptClass(question.promptAfterImage)}>
                      {question.promptAfterImage}
                    </p>
                  )}
                  <div className={fitChoicesClass(question.choices)}>
                    {question.choices.map((choice) => (
                      <div key={choice.id} className="dsp-choice">
                        <div className="dsp-choice-face">
                          <span className="dsp-choice-id">{choice.id}</span>
                          <span className="dsp-choice-sep">:</span>
                          <span className="dsp-choice-text">{choice.text}</span>
                        </div>
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
                <ScrollPanel variant="content" className="dsp-scroll-stage">
                  <h1 className="dsp-title dsp-title-hero">หมดเวลา</h1>
                  <p className="dsp-answered-count">
                    ตอบแล้ว {answeredCount}/{TEAM_IDS.length} ทีม
                  </p>
                </ScrollPanel>
              </div>
            </motion.div>
          )}

          {phase === 'revealVideo' && question && hasAnswerVideo && question.answerVideo && (
            <motion.div key={panelKey} className="dsp-layer" {...panelMotion}>
              <div className="dsp-center">
                <ScrollPanel
                  variant="content"
                  className="dsp-scroll-stage dsp-scroll-reveal-video"
                >
                  <p className="dsp-heading">วิดีโอเฉลย</p>
                  <p className="dsp-round">ข้อ {roundNumber}/{TOTAL_QUESTIONS}</p>
                  <p className="dsp-answer">{question.answerLabel}</p>
                  <AnswerVideo
                    key={`av-${game?.questionIndex}-${question.answerVideo}`}
                    src={questionVideoAsset(question.answerVideo)}
                    className="dsp-answer-video"
                  />
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
                      ? 'dsp-scroll-stage dsp-scroll-reveal-img'
                      : 'dsp-scroll-stage'
                  }
                >
                  <p className="dsp-heading">เฉลย</p>
                  <p className="dsp-round">ข้อ {roundNumber}/{TOTAL_QUESTIONS}</p>
                  <p className="dsp-answer">{question.answerLabel}</p>
                  {hasAnswerImage && question.answerImage && (
                    <ZoomableImage
                      src={questionImageAsset(question.answerImage)}
                      className="dsp-answer-img"
                    />
                  )}
                  <p className={fitExplainClass(question.explanation, hasAnswerImage)}>
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
                  <RoundBadge questionNumber={roundNumber} />
                  <img
                    src={leaderboardAsset('title-scroll.png')}
                    alt="LEADERBOARD"
                    className="lb-title"
                    draggable={false}
                    decoding="sync"
                  />
                  <RoundBadge questionNumber={roundNumber} />
                </header>

                <TeamGrid teams={teams} scoredTeams={game?.scoredTeams ?? {}} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DisplayShell>
    </main>
  )
}
