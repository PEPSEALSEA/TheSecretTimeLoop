import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedScore } from '../components/AnimatedScore'
import { MultiplierPicker } from '../components/MultiplierPicker'
import {
  effectivePhase,
  lockQuestion,
  markTeamScored,
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
import {
  DEFAULT_STARTING_SCORE,
  TEAM_IDS,
  applyRound,
  formatDelta,
  formatScore,
  type RoundResult,
  type TeamState,
} from '../lib/scoring'
import { playRoundSound, unlockAudio } from '../lib/sounds'
import {
  ensureAllTeams,
  resetTeam,
  setTeamScore,
  submitRound,
  subscribeAllTeams,
} from '../lib/teams'
import { remainingMs, useNow } from '../lib/timer'

export function Admin() {
  const [game, setGame] = useState<GameState | null>(null)
  const [teams, setTeams] = useState<Record<string, TeamState>>({})
  const [teamId, setTeamId] = useState<string>('1')
  const [bet, setBet] = useState('100')
  const [multiplier, setMultiplier] = useState(1.2)
  const [result, setResult] = useState<RoundResult>('correct')
  const [manualScore, setManualScore] = useState('')
  const [startingScore, setStartingScore] = useState(String(DEFAULT_STARTING_SCORE))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const syncedTeam = useRef<string | null>(null)

  useEffect(() => {
    ensureAllTeams().catch((e) => setError(String(e)))
    const unsubGame = subscribeGame(setGame)
    const unsubTeams = subscribeAllTeams(setTeams)
    return () => {
      unsubGame()
      unsubTeams()
    }
  }, [])

  const phase = game ? effectivePhase(game) : 'lobby'
  const question = game ? getQuestion(game.questionIndex) : null
  const timerActive = phase === 'question' && game?.endsAt != null
  const now = useNow(timerActive || phase === 'waiting')
  const left = remainingMs(game?.endsAt ?? null, now)
  const doneCount = game ? scoredCount(game) : 0

  const team = teams[teamId] ?? null

  useEffect(() => {
    if (!team) return
    if (syncedTeam.current === teamId) return
    syncedTeam.current = teamId
    setManualScore(String(Math.round(team.score)))
    setStartingScore(String(team.startingScore))
  }, [teamId, team])

  const betNum = Number(bet)
  const preview = useMemo(() => {
    if (!team || !Number.isFinite(betNum) || betNum <= 0) return null
    return applyRound(team.score, betNum, multiplier, result)
  }, [team, betNum, multiplier, result])

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

  async function afterScoreSave() {
    if (phase === 'scores') {
      await markTeamScored(teamId)
    }
  }

  async function onSubmitRound(e: FormEvent) {
    e.preventDefault()
    unlockAudio()
    if (!Number.isFinite(betNum) || betNum <= 0) {
      setError('กรอกเงินเดิมพันให้ถูกต้อง')
      return
    }
    if (team && betNum > team.score) {
      setError('เดิมพันมากกว่าคะแนนปัจจุบัน')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await submitRound(teamId, betNum, multiplier, result)
      playRoundSound(result)
      await afterScoreSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onSetScore() {
    const score = Number(manualScore)
    if (!Number.isFinite(score) || score < 0) {
      setError('คะแนนที่ตั้งไม่ถูกต้อง')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await setTeamScore(teamId, score)
      await afterScoreSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onReset() {
    const start = Number(startingScore)
    if (!Number.isFinite(start) || start < 0) {
      setError('คะแนนเริ่มต้นไม่ถูกต้อง')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetTeam(teamId, start)
      syncedTeam.current = null
      await afterScoreSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  const phaseLabel: Record<string, string> = {
    lobby: 'รอเริ่ม',
    question: 'กำลังจับเวลา',
    waiting: 'หมดเวลา · รอเปิดเฉลย',
    reveal: 'แสดงเฉลย',
    scores: 'แก้คะแนน',
    finished: 'จบเกม',
  }

  return (
    <main className="pirate-scene sea-grain mx-auto min-h-dvh max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--color-pirate-red)]">
          Staff · แอดมินเกม
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
                แก้แล้ว
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

      {phase === 'scores' && (
        <>
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="parchment panel mb-5 rounded-2xl p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg text-[var(--color-ocean-deep)]">เลือกทีม</h2>
              <p className="font-score text-xl text-[var(--color-ocean-deep)]">
                {doneCount}/{TEAM_IDS.length}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {TEAM_IDS.map((id) => {
                const t = teams[id]
                const active = id === teamId
                const scored = Boolean(game?.scoredTeams[id])
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      syncedTeam.current = null
                      setTeamId(id)
                      setError(null)
                    }}
                    className={`relative rounded-xl px-2 py-3 text-center transition ${
                      active ? 'btn-gold' : 'btn-sea'
                    }`}
                  >
                    {scored && (
                      <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-success)]" />
                    )}
                    <span className="block text-lg font-bold">{id}</span>
                    <span className="mt-0.5 block text-[0.7rem] opacity-80">
                      {t ? formatScore(t.score) : '—'}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.section>

          <motion.header
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="parchment panel mb-5 rounded-2xl p-6 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[var(--color-ink-muted)]">
              กำลังแก้ทีม
            </p>
            <h1 className="font-display mt-2 text-3xl text-[var(--color-ocean-deep)] md:text-4xl">
              {team?.name ?? `ทีม ${teamId}`}
            </h1>
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">คะแนนปัจจุบัน</p>
            {team ? (
              <div className="mt-1">
                <AnimatedScore score={team.score} size="lg" />
              </div>
            ) : (
              <p className="mt-2 text-4xl text-[var(--color-ink-muted)]/35">…</p>
            )}
          </motion.header>

          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmitRound}
            className="parchment panel mb-5 space-y-5 rounded-2xl p-5 md:p-6"
          >
            <h2 className="font-display text-lg text-[var(--color-ocean-deep)]">บันทึกรอบเดิมพัน</h2>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-[var(--color-ink-muted)]">
                เงินเดิมพัน
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                onFocus={unlockAudio}
                className="input-field text-2xl font-semibold"
              />
            </label>

            <div>
              <span className="mb-2 block text-sm font-semibold text-[var(--color-ink-muted)]">
                ตัวคูณ
              </span>
              <MultiplierPicker value={multiplier} onChange={setMultiplier} />
            </div>

            <div>
              <span className="mb-2 block text-sm font-semibold text-[var(--color-ink-muted)]">
                ผลลัพธ์
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResult('correct')}
                  className={`rounded-xl py-4 text-xl font-bold transition ${
                    result === 'correct'
                      ? 'bg-[var(--color-success)] text-white'
                      : 'btn-sea'
                  }`}
                >
                  ถูก
                </button>
                <button
                  type="button"
                  onClick={() => setResult('wrong')}
                  className={`rounded-xl py-4 text-xl font-bold transition ${
                    result === 'wrong' ? 'bg-[var(--color-danger)] text-white' : 'btn-sea'
                  }`}
                >
                  ผิด
                </button>
              </div>
            </div>

            {preview && (
              <div className="rounded-xl bg-[rgba(255,255,255,0.35)] px-4 py-3.5 text-center">
                <p className="text-sm text-[var(--color-ink-muted)]">พรีวิวรอบนี้</p>
                <p
                  className={`mt-1 font-display text-3xl ${
                    preview.delta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                  }`}
                >
                  {formatDelta(preview.delta)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  คะแนนหลังรอบ ≈ {Math.round(preview.nextScore).toLocaleString('th-TH')}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !team}
              className="btn-gold w-full rounded-xl py-4 text-xl"
            >
              {busy ? 'กำลังบันทึก…' : 'ยืนยันรอบนี้'}
            </button>
          </motion.form>

          <section className="parchment panel mb-5 space-y-4 rounded-2xl p-5">
            <h2 className="font-display text-lg text-[var(--color-ocean-deep)]">ตั้งคะแนนตรงๆ</h2>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={manualScore}
                onChange={(e) => setManualScore(e.target.value)}
                className="input-field min-w-0 flex-1 py-2.5 text-lg"
              />
              <button
                type="button"
                disabled={busy || !team}
                onClick={onSetScore}
                className="btn-ocean rounded-xl px-4 py-2 font-semibold"
              >
                ตั้งคะแนน
              </button>
            </div>
          </section>

          <section className="parchment panel rounded-2xl p-5">
            <h2 className="font-display text-lg text-[var(--color-ocean-deep)]">รีเซ็ตทีมนี้</h2>
            <div className="mt-3 flex gap-2">
              <input
                type="number"
                min={0}
                value={startingScore}
                onChange={(e) => setStartingScore(e.target.value)}
                className="input-field min-w-0 flex-1 py-2.5 text-lg"
              />
              <button
                type="button"
                disabled={busy}
                onClick={onReset}
                className="btn-sea rounded-xl px-4 py-2 font-semibold"
              >
                รีเซ็ตทีม
              </button>
            </div>
          </section>
        </>
      )}

      {error && (
        <p className="mt-4 text-center text-[var(--color-danger)]">{error}</p>
      )}
    </main>
  )
}
