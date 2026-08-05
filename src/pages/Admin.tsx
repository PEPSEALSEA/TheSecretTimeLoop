import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  answeredCount,
  betCount,
  effectivePhase,
  jumpToQuestion,
  lockQuestion,
  nextQuestion,
  nextQuestionLabel,
  openQuestion,
  questionProgressLabel,
  resetGame,
  scoredCount,
  showReveal,
  showScores,
  startGame,
  startQuestionTimer,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { QUESTIONS, ROUND_LABEL, TOTAL_QUESTIONS, getQuestion } from '../lib/questions'
import {
  DEFAULT_STARTING_SCORE,
  TEAM_IDS,
  formatMultiplier,
  formatScore,
  type TeamState,
} from '../lib/scoring'
import {
  ensureAllTeams,
  resetAllTeams,
  resetTeam,
  setTeamScore,
  subscribeAllTeams,
} from '../lib/teams'
import { remainingMs, useNow } from '../lib/timer'

const phaseLabel: Record<string, string> = {
  lobby: 'รอเริ่ม',
  betting: 'วางเดิมพัน · โจทย์อย่างเดียว',
  question: 'แสดงตัวเลือก',
  waiting: 'หมดเวลา · รอเปิดเฉลย',
  reveal: 'แสดงเฉลย',
  scores: 'คะแนนอัปเดตแล้ว',
  finished: 'จบเกม',
}

export function Admin() {
  const [game, setGame] = useState<GameState | null>(null)
  const [teams, setTeams] = useState<Record<string, TeamState>>({})
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({})
  const [resetDrafts, setResetDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(TEAM_IDS.map((id) => [id, String(DEFAULT_STARTING_SCORE)])),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jumpTarget, setJumpTarget] = useState('1')
  const lastScores = useRef<Record<string, number>>({})

  useEffect(() => subscribeGame(setGame), [])
  useEffect(() => {
    void ensureAllTeams().catch((e) => setError(String(e)))
    return subscribeAllTeams(setTeams)
  }, [])

  useEffect(() => {
    setScoreDrafts((prev) => {
      const next = { ...prev }
      for (const id of TEAM_IDS) {
        const team = teams[id]
        if (!team) continue
        const rounded = Math.round(team.score)
        if (lastScores.current[id] !== rounded) {
          next[id] = String(rounded)
          lastScores.current[id] = rounded
        }
      }
      return next
    })
    setResetDrafts((prev) => {
      const next = { ...prev }
      for (const id of TEAM_IDS) {
        const team = teams[id]
        if (!team) continue
        if (prev[id] == null || prev[id] === '') {
          next[id] = String(team.startingScore)
        }
      }
      return next
    })
  }, [teams])

  const clockActive =
    game != null && game.phase !== 'lobby' && game.phase !== 'finished'
  const now = useNow(clockActive)
  const phase = game ? effectivePhase(game, now) : 'lobby'
  const question = game ? getQuestion(game.questionIndex) : null
  const timerRunning = phase === 'question' && game?.endsAt != null
  const timerPending = phase === 'question' && game?.endsAt == null
  const left = remainingMs(game?.endsAt ?? null, now)
  const doneCount = game ? scoredCount(game) : 0
  const answeredTeamsCount = game ? answeredCount(game) : 0
  const betTeamsCount = game ? betCount(game) : 0
  const statusLabel =
    phase === 'question'
      ? timerRunning
        ? 'กำลังจับเวลา'
        : 'แสดงตัวเลือก · รอจับเวลา'
      : (phaseLabel[phase] ?? phase)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onSetScore(teamId: string) {
    const score = Number(scoreDrafts[teamId])
    if (!Number.isFinite(score) || score < 0) {
      setError(`ทีม ${teamId}: คะแนนที่ตั้งไม่ถูกต้อง`)
      return
    }
    await run(() => setTeamScore(teamId, score).then(() => undefined))
  }

  async function onResetTeam(teamId: string) {
    const start = Number(resetDrafts[teamId] ?? DEFAULT_STARTING_SCORE)
    if (!Number.isFinite(start) || start < 0) {
      setError(`ทีม ${teamId}: คะแนนเริ่มต้นไม่ถูกต้อง`)
      return
    }
    await run(() => resetTeam(teamId, start))
  }

  function confirmResetGame() {
    const ok = window.confirm(
      'รีเซ็ตเกม?\n\nสถานะเกมจะกลับไปรอเริ่ม · คะแนนทีมจะไม่ถูกรีเซ็ต',
    )
    if (!ok) return
    void run(resetGame)
  }

  function confirmResetAll() {
    const ok = window.confirm(
      'Reset All?\n\nจะรีเซ็ตเกมกลับไปรอเริ่ม และรีเซ็ตคะแนนทุกทีมกลับค่าเริ่มต้น\nการกระทำนี้ยกเลิกไม่ได้',
    )
    if (!ok) return
    void run(async () => {
      await resetGame()
      await resetAllTeams(DEFAULT_STARTING_SCORE)
    })
  }

  const primaryAction =
    phase === 'lobby'
      ? {
          label: `เริ่มเกม ${ROUND_LABEL} (${TOTAL_QUESTIONS} ข้อ)`,
          onClick: () => void run(startGame),
          tone: 'gold' as const,
        }
      : phase === 'betting'
        ? {
            label: 'เปิดตัวเลือก',
            onClick: () => void run(openQuestion),
            tone: 'gold' as const,
          }
        : timerPending && game
          ? {
              label: `จับเวลา ${question?.durationSec ?? 0}s`,
              onClick: () => void run(() => startQuestionTimer(game.questionIndex)),
              tone: 'gold' as const,
            }
          : timerRunning
            ? {
                label: 'หมดเวลาทันที',
                onClick: () => void run(lockQuestion),
                tone: 'sea' as const,
              }
            : phase === 'waiting'
              ? {
                  label: 'แสดงเฉลย · คิดคะแนนอัตโนมัติ',
                  onClick: () => void run(showReveal),
                  tone: 'gold' as const,
                }
              : phase === 'reveal'
                ? {
                    label: 'ไปกระดานคะแนน',
                    onClick: () => void run(showScores),
                    tone: 'gold' as const,
                  }
                : phase === 'scores' && game
                  ? {
                      label: nextQuestionLabel(game.questionIndex),
                      onClick: () => void run(() => nextQuestion(game.questionIndex)),
                      tone: 'gold' as const,
                    }
                  : phase === 'finished'
                    ? {
                        label: 'เริ่มเกมใหม่',
                        onClick: confirmResetGame,
                        tone: 'gold' as const,
                      }
                    : null

  const hostActions = (
    <div className="flex w-full flex-wrap gap-2">
      <button
        type="button"
        disabled={busy || !primaryAction}
        onClick={primaryAction?.onClick}
        className={`${
          primaryAction?.tone === 'sea' ? 'btn-sea' : 'btn-gold'
        } h-12 min-h-12 w-full flex-1 rounded-xl px-4 text-base font-semibold sm:w-72 sm:flex-none`}
      >
        {primaryAction?.label ?? '—'}
      </button>
      <button
        type="button"
        disabled={busy || phase === 'lobby'}
        onClick={confirmResetGame}
        className="btn-sea h-12 min-h-12 w-[7.5rem] shrink-0 rounded-xl px-3 text-sm font-semibold"
      >
        รีเซ็ตเกม
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={confirmResetAll}
        className="btn-sea h-12 min-h-12 w-[7.5rem] shrink-0 rounded-xl px-3 text-sm font-semibold"
      >
        Reset All
      </button>
    </div>
  )

  async function onJumpQuestion() {
    const n = Number(jumpTarget)
    if (!Number.isInteger(n) || n < 1 || n > TOTAL_QUESTIONS) {
      setError(`เลือกข้อ 1–${TOTAL_QUESTIONS}`)
      return
    }
    const index = n - 1
    if (game && game.questionIndex === index && phase !== 'lobby' && phase !== 'finished') {
      const ok = window.confirm(`อยู่ข้อ ${n} อยู่แล้ว ต้องการเริ่มรอบเดิมพันข้อนี้อีกครั้งไหม?`)
      if (!ok) return
    } else {
      const ok = window.confirm(
        `ข้ามไปข้อ ${n}/${TOTAL_QUESTIONS}?\n\nจะเข้าหน้าวางเดิมพันของข้อนั้นทันที`,
      )
      if (!ok) return
    }
    await run(() => jumpToQuestion(index))
  }

  return (
    <main className="pirate-scene sea-grain mx-auto min-h-dvh max-w-3xl px-4 py-6 pb-36 sm:pb-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-pirate-red)]">
          Host · คุมจอใหญ่
        </p>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <Link
            to="/display/all"
            className="text-sm text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-ocean)]"
            target="_blank"
            rel="noreferrer"
          >
            จอ TV
          </Link>
          <Link
            to="/display/other-devices"
            className="text-sm text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-ocean)]"
            target="_blank"
            rel="noreferrer"
          >
            iPad / อื่นๆ
          </Link>
        </div>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="parchment panel mb-5 rounded-2xl p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
              สถานะเกม
            </p>
            <h2 className="font-display mt-1 text-2xl text-[var(--color-ocean-deep)]">
              {statusLabel}
            </h2>
            {game && phase !== 'lobby' && (
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                {questionProgressLabel(game.questionIndex)}
                {question
                  ? ` · ×${formatMultiplier(question.multiplier)}${
                      phase === 'betting' || phase === 'question' || phase === 'waiting'
                        ? ` · ${question.durationSec}s`
                        : ''
                    }`
                  : ''}
              </p>
            )}
          </div>
          {phase === 'betting' && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.4)] px-4 py-2 text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                เดิมพันแล้ว
              </p>
              <p className="font-score text-2xl text-[var(--color-ocean-deep)]">
                {betTeamsCount}/{TEAM_IDS.length}
              </p>
            </div>
          )}
          {timerPending && (
            <div className="rounded-xl bg-[rgba(240,192,64,0.28)] px-4 py-2 text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                ตัวจับเวลา
              </p>
              <p className="font-score text-lg text-[var(--color-ocean-deep)]">ยังไม่เริ่ม</p>
            </div>
          )}
          {timerRunning && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.4)] px-4 py-2 text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                เหลือ
              </p>
              <p className="font-score text-2xl text-[var(--color-ocean-deep)]">
                {Math.ceil(left / 1000)}s
              </p>
            </div>
          )}
          {(phase === 'question' || phase === 'waiting') && (
            <>
              <div className="rounded-xl bg-[rgba(255,255,255,0.4)] px-4 py-2 text-center">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                  เดิมพันแล้ว
                </p>
                <p className="font-score text-2xl text-[var(--color-ocean-deep)]">
                  {betTeamsCount}/{TEAM_IDS.length}
                </p>
              </div>
              <div className="rounded-xl bg-[rgba(255,255,255,0.4)] px-4 py-2 text-center">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                  ตอบแล้ว
                </p>
                <p className="font-score text-2xl text-[var(--color-ocean-deep)]">
                  {answeredTeamsCount}/{TEAM_IDS.length}
                </p>
              </div>
            </>
          )}
          {phase === 'scores' && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.4)] px-4 py-2 text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                คิดคะแนนแล้ว
              </p>
              <p className="font-score text-2xl text-[var(--color-ocean-deep)]">
                {doneCount}/{TEAM_IDS.length}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 hidden flex-wrap gap-2 sm:flex">{hostActions}</div>

        {question &&
          (phase === 'betting' ||
            phase === 'question' ||
            phase === 'waiting' ||
            phase === 'reveal') && (
            <div className="mt-4 rounded-xl border border-dashed border-[rgba(42,24,16,0.14)] px-4 py-3">
              <p className="text-sm text-[var(--color-ink-muted)]">
                โจทย์ · ×{formatMultiplier(question.multiplier)} · {question.durationSec}s
              </p>
              <p className="mt-1 font-display text-lg text-[var(--color-ocean-deep)]">
                {question.prompt}
              </p>
              {(phase === 'reveal' || phase === 'waiting') && (
                <p className="mt-2 text-sm text-[var(--color-success)]">
                  เฉลย: {question.answerLabel}
                </p>
              )}
              {phase === 'betting' && game && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold text-[var(--color-ink-muted)]">
                    กลุ่มที่ลงเดิมพันแล้ว (ไม่แสดงยอด)
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                    {TEAM_IDS.map((id) => {
                      const placed = game.teamBets[id] != null
                      return (
                        <div
                          key={id}
                          className={`rounded-lg py-2 text-center text-sm font-bold ${
                            placed
                              ? 'bg-[rgba(45,138,94,0.18)] text-[var(--color-success)]'
                              : 'bg-[rgba(42,24,16,0.06)] text-[var(--color-ink-muted)]'
                          }`}
                        >
                          {id}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {(phase === 'question' || phase === 'waiting') && game && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold text-[var(--color-ink-muted)]">
                    คำตอบที่เลือก
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                    {TEAM_IDS.map((id) => {
                      const choice = game.teamChoices[id]
                      const placed = game.teamBets[id] != null
                      return (
                        <div
                          key={id}
                          className={`rounded-lg py-1.5 text-center text-xs font-bold ${
                            choice
                              ? 'bg-[rgba(45,138,94,0.18)] text-[var(--color-success)]'
                              : placed
                                ? 'bg-[rgba(240,192,64,0.22)] text-[var(--color-ocean-deep)]'
                                : 'bg-[rgba(42,24,16,0.06)] text-[var(--color-ink-muted)]'
                          }`}
                          title={
                            choice
                              ? `เลือก ${choice}`
                              : placed
                                ? 'เดิมพันแล้ว · ยังไม่ตอบ'
                                : 'ยังไม่เดิมพัน'
                          }
                        >
                          {id}
                          {choice ? `·${choice}` : placed ? '·✓' : ''}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        {phase === 'scores' && game && (
          <div className="mt-4 grid grid-cols-8 gap-2">
            {TEAM_IDS.map((id) => {
              const scored = Boolean(game.scoredTeams[id])
              return (
                <div
                  key={id}
                  className={`rounded-lg py-2 text-center text-sm font-bold ${
                    scored
                      ? 'bg-[rgba(45,138,94,0.18)] text-[var(--color-success)]'
                      : 'bg-[rgba(42,24,16,0.06)] text-[var(--color-ink-muted)]'
                  }`}
                >
                  {id}
                </div>
              )
            })}
          </div>
        )}
      </motion.section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(42,24,16,0.12)] bg-[rgba(244,228,200,0.96)] px-4 py-3 shadow-[0_-8px_24px_rgba(26,40,60,0.12)] backdrop-blur sm:hidden">
        <div className="mx-auto max-w-3xl pr-16">{hostActions}</div>
      </div>

      <section className="parchment panel mb-5 rounded-2xl p-5">
        <h2 className="font-display text-lg text-[var(--color-ocean-deep)]">
          ข้ามไปข้อ
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          กระโดดไปหน้าวางเดิมพันของข้อที่เลือก · ไม่คิดคะแนนรอบปัจจุบัน
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[10rem] flex-1">
            <span className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)]">
              เลือกข้อ
            </span>
            <select
              value={jumpTarget}
              onChange={(e) => setJumpTarget(e.target.value)}
              className="input-field py-2 text-base"
            >
              {QUESTIONS.map((q) => (
                <option key={q.id} value={String(q.number)}>
                  ข้อ {q.number}/{TOTAL_QUESTIONS}
                  {game && game.questionIndex === q.number - 1 ? ' · ตอนนี้' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onJumpQuestion()}
            className="btn-gold rounded-xl px-5 py-3 font-semibold"
          >
            ข้ามไปข้อ {jumpTarget}
          </button>
        </div>
      </section>

      <section className="parchment panel rounded-2xl p-5">
        <h2 className="font-display text-lg text-[var(--color-ocean-deep)]">
          ตั้งคะแนน / รีเซ็ตทีม
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          แก้คะแนนทีมตรงๆ หรือรีเซ็ตกลับค่าเริ่มต้น (ค่าเริ่มต้น {DEFAULT_STARTING_SCORE})
        </p>
        <div className="mt-4 space-y-3">
          {TEAM_IDS.map((id) => {
            const team = teams[id]
            return (
              <div
                key={id}
                className="rounded-xl border border-[rgba(42,24,16,0.1)] bg-[rgba(255,255,255,0.28)] px-3 py-3"
              >
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-base text-[var(--color-ocean-deep)]">
                    {team?.name ?? `ทีม ${id}`}
                  </p>
                  <p className="font-score text-sm text-[var(--color-ink-muted)]">
                    ตอนนี้ {team ? formatScore(team.score) : '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    min={0}
                    value={scoreDrafts[id] ?? ''}
                    onChange={(e) =>
                      setScoreDrafts((d) => ({ ...d, [id]: e.target.value }))
                    }
                    className="input-field min-w-0 flex-1 py-2 text-base"
                    placeholder="คะแนน"
                  />
                  <button
                    type="button"
                    disabled={busy || !team}
                    onClick={() => void onSetScore(id)}
                    className="btn-ocean rounded-lg px-3 py-2 text-sm font-semibold"
                  >
                    ตั้งคะแนน
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={resetDrafts[id] ?? String(DEFAULT_STARTING_SCORE)}
                    onChange={(e) =>
                      setResetDrafts((d) => ({ ...d, [id]: e.target.value }))
                    }
                    className="input-field w-28 py-2 text-base"
                    placeholder="เริ่มต้น"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void onResetTeam(id)}
                    className="btn-sea rounded-lg px-3 py-2 text-sm font-semibold"
                  >
                    รีเซ็ตทีม
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {error && (
        <p className="mt-4 text-center text-[var(--color-danger)]">{error}</p>
      )}
    </main>
  )
}
