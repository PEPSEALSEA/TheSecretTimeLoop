import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  effectivePhase,
  lockQuestion,
  nextQuestion,
  questionProgressLabel,
  resetGame,
  scoredCount,
  showReveal,
  showScores,
  startGame,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { QUESTIONS, getQuestion } from '../lib/questions'
import { TEAM_IDS } from '../lib/scoring'
import { remainingMs, useNow } from '../lib/timer'

const phaseLabel: Record<string, string> = {
  lobby: 'รอเริ่ม',
  question: 'กำลังจับเวลา',
  waiting: 'หมดเวลา · รอเปิดเฉลย',
  reveal: 'แสดงเฉลย',
  scores: 'รอ staff แก้คะแนน',
  finished: 'จบเกม',
}

export function Admin() {
  const [game, setGame] = useState<GameState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => subscribeGame(setGame), [])

  const phase = game ? effectivePhase(game) : 'lobby'
  const question = game ? getQuestion(game.questionIndex) : null
  const timerActive = phase === 'question' && game?.endsAt != null
  const now = useNow(timerActive || phase === 'waiting')
  const left = remainingMs(game?.endsAt ?? null, now)
  const doneCount = game ? scoredCount(game) : 0

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

  return (
    <main className="pirate-scene sea-grain mx-auto min-h-dvh max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-pirate-red)]">
          Host · คุมจอใหญ่
        </p>
        <Link
          to="/display/all"
          className="text-sm text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-ocean)]"
          target="_blank"
          rel="noreferrer"
        >
          เปิดจอโชว์
        </Link>
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
              {phaseLabel[phase] ?? phase}
            </h2>
            {game && phase !== 'lobby' && (
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                {questionProgressLabel(game.questionIndex)}
                {question ? ` · ${question.durationSec}s` : ''}
              </p>
            )}
          </div>
          {phase === 'question' && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.4)] px-4 py-2 text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                เหลือ
              </p>
              <p className="font-score text-2xl text-[var(--color-ocean-deep)]">
                {Math.ceil(left / 1000)}s
              </p>
            </div>
          )}
          {phase === 'scores' && (
            <div className="rounded-xl bg-[rgba(255,255,255,0.4)] px-4 py-2 text-center">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
                staff แก้แล้ว
              </p>
              <p className="font-score text-2xl text-[var(--color-ocean-deep)]">
                {doneCount}/{TEAM_IDS.length}
              </p>
            </div>
          )}
        </div>

        {question && (phase === 'question' || phase === 'waiting' || phase === 'reveal') && (
          <div className="mt-4 rounded-xl border border-dashed border-[rgba(42,24,16,0.14)] px-4 py-3">
            <p className="text-sm text-[var(--color-ink-muted)]">โจทย์</p>
            <p className="mt-1 font-display text-lg text-[var(--color-ocean-deep)]">
              {question.prompt}
            </p>
            {(phase === 'reveal' || phase === 'waiting') && (
              <p className="mt-2 text-sm text-[var(--color-success)]">
                เฉลย: {question.answer}
              </p>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {phase === 'lobby' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(startGame)}
              className="btn-gold rounded-xl px-5 py-3 font-semibold"
            >
              เริ่มเกมข้อ 1
            </button>
          )}

          {phase === 'question' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(lockQuestion)}
              className="btn-sea rounded-xl px-5 py-3 font-semibold"
            >
              หมดเวลาทันที
            </button>
          )}

          {phase === 'waiting' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(showReveal)}
              className="btn-gold rounded-xl px-5 py-3 font-semibold"
            >
              แสดงเฉลย
            </button>
          )}

          {phase === 'reveal' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(showScores)}
              className="btn-gold rounded-xl px-5 py-3 font-semibold"
            >
              ไปกระดานคะแนน
            </button>
          )}

          {phase === 'scores' && game && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => nextQuestion(game.questionIndex))}
              className="btn-gold rounded-xl px-5 py-3 font-semibold"
            >
              {game.questionIndex + 1 >= QUESTIONS.length
                ? 'จบเกม'
                : `ข้อต่อไป (${doneCount}/${TEAM_IDS.length})`}
            </button>
          )}

          {phase === 'finished' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(resetGame)}
              className="btn-gold rounded-xl px-5 py-3 font-semibold"
            >
              เริ่มเกมใหม่
            </button>
          )}

          {phase !== 'lobby' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(resetGame)}
              className="btn-sea rounded-xl px-4 py-3 text-sm font-semibold"
            >
              รีเซ็ตเกม
            </button>
          )}
        </div>
      </motion.section>

      <section className="parchment panel rounded-2xl p-5">
        <h2 className="font-display text-lg text-[var(--color-ocean-deep)]">ลิงก์ staff 8 โต๊ะ</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          แต่ละคนเปิดค้างไว้ที่โต๊ะตัวเอง — ไม่ต้องอยู่ในหน้านี้
        </p>
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {TEAM_IDS.map((id) => (
            <Link
              key={id}
              to={`/staff/${id}`}
              className="btn-ocean rounded-xl py-3 text-center text-lg font-bold no-underline"
              target="_blank"
              rel="noreferrer"
            >
              {id}
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <p className="mt-4 text-center text-[var(--color-danger)]">{error}</p>
      )}
    </main>
  )
}
