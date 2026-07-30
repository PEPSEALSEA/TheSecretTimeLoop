import { motion } from 'framer-motion'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AnimatedScore } from '../components/AnimatedScore'
import { MultiplierPicker } from '../components/MultiplierPicker'
import {
  effectivePhase,
  markTeamScored,
  questionProgressLabel,
  scoredCount,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { getQuestion } from '../lib/questions'
import {
  DEFAULT_STARTING_SCORE,
  TEAM_IDS,
  applyRound,
  formatDelta,
  type RoundResult,
  type TeamState,
} from '../lib/scoring'
import { playRoundSound, unlockAudio } from '../lib/sounds'
import {
  ensureTeam,
  resetTeam,
  setTeamScore,
  submitRound,
  subscribeTeam,
} from '../lib/teams'

export function StaffTeam() {
  const { teamId = '' } = useParams()
  const valid = TEAM_IDS.includes(teamId as (typeof TEAM_IDS)[number])

  const [game, setGame] = useState<GameState | null>(null)
  const [team, setTeam] = useState<TeamState | null>(null)
  const [bet, setBet] = useState('100')
  const [multiplier, setMultiplier] = useState(1.2)
  const [result, setResult] = useState<RoundResult>('correct')
  const [manualScore, setManualScore] = useState('')
  const [startingScore, setStartingScore] = useState(String(DEFAULT_STARTING_SCORE))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (!valid) return
    ensureTeam(teamId)
      .then((t) => {
        setStartingScore(String(t.startingScore))
        setManualScore(String(Math.round(t.score)))
      })
      .catch((e) => setError(String(e)))
    const unsubTeam = subscribeTeam(teamId, setTeam)
    const unsubGame = subscribeGame(setGame)
    return () => {
      unsubTeam()
      unsubGame()
    }
  }, [teamId, valid])

  const phase = game ? effectivePhase(game) : 'lobby'
  const canScore = phase === 'scores'
  const alreadyScored = Boolean(game?.scoredTeams[teamId])
  const doneCount = game ? scoredCount(game) : 0
  const question = game ? getQuestion(game.questionIndex) : null

  const betNum = Number(bet)
  const preview = useMemo(() => {
    if (!team || !Number.isFinite(betNum) || betNum <= 0) return null
    return applyRound(team.score, betNum, multiplier, result)
  }, [team, betNum, multiplier, result])

  if (!valid) return <Navigate to="/" replace />

  async function afterSave() {
    if (canScore) {
      await markTeamScored(teamId)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1200)
    }
  }

  async function onSubmitRound(e: FormEvent) {
    e.preventDefault()
    if (!canScore) return
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
      await afterSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onSetScore() {
    if (!canScore) return
    const score = Number(manualScore)
    if (!Number.isFinite(score) || score < 0) {
      setError('คะแนนที่ตั้งไม่ถูกต้อง')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await setTeamScore(teamId, score)
      await afterSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onReset() {
    if (!canScore) return
    const start = Number(startingScore)
    if (!Number.isFinite(start) || start < 0) {
      setError('คะแนนเริ่มต้นไม่ถูกต้อง')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await resetTeam(teamId, start)
      await afterSave()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="pirate-scene sea-grain mx-auto min-h-dvh max-w-md px-3 py-4 text-[0.95rem]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[var(--color-pirate-red)]">
          Staff · โต๊ะ {teamId}
        </p>
        <p className="font-score text-base text-[var(--color-ocean-deep)]">
          {doneCount}/{TEAM_IDS.length}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="parchment panel mb-3 rounded-xl p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
              สถานะรอบนี้
            </p>
            <p className="mt-0.5 font-display text-lg text-[var(--color-ocean-deep)]">
              {canScore
                ? alreadyScored
                  ? 'บันทึกแล้ว · รอข้อต่อไป'
                  : 'ถึงตาแก้คะแนน'
                : 'รอช่วงแก้คะแนน'}
            </p>
            {game && phase !== 'lobby' && (
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                {questionProgressLabel(game.questionIndex)}
              </p>
            )}
          </div>
          {alreadyScored && (
            <span className="rounded-full bg-[rgba(45,138,94,0.18)] px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
              เสร็จแล้ว
            </span>
          )}
        </div>
        {question && (phase === 'reveal' || phase === 'scores') && (
          <p className="mt-2 rounded-lg bg-[rgba(255,255,255,0.35)] px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)]">
            เฉลย: <span className="font-semibold text-[var(--color-success)]">{question.answer}</span>
          </p>
        )}
      </motion.div>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`parchment panel mb-3 rounded-xl p-4 text-center ${
          savedFlash ? 'panel-glow' : ''
        }`}
      >
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-[var(--color-ink-muted)]">
          คะแนนทีมนี้
        </p>
        <h1 className="font-display mt-1 text-2xl text-[var(--color-ocean-deep)]">
          {team?.name ?? `ทีม ${teamId}`}
        </h1>
        {team ? (
          <div className="mt-1">
            <AnimatedScore score={team.score} size="md" />
          </div>
        ) : (
          <p className="mt-1 text-3xl text-[var(--color-ink-muted)]/35">…</p>
        )}
      </motion.header>

      {!canScore ? (
        <section className="parchment panel rounded-xl p-5 text-center">
          <p className="font-display text-xl text-[var(--color-ocean-deep)]">เปิดค้างไว้ได้เลย</p>
          <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
            พอ host เปิดหน้ากระดานคะแนน ฟอร์มแก้คะแนนจะโผล่ที่นี่อัตโนมัติ
          </p>
        </section>
      ) : (
        <>
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmitRound}
            className="parchment panel mb-3 space-y-3 rounded-xl p-4"
          >
            <h2 className="font-display text-base text-[var(--color-ocean-deep)]">บันทึกรอบเดิมพัน</h2>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)]">
                เงินเดิมพัน
              </span>
              <input
                type="number"
                min={1}
                step={1}
                value={bet}
                onChange={(e) => setBet(e.target.value)}
                onFocus={unlockAudio}
                className="input-field py-2 text-xl font-semibold"
              />
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-muted)]">
                ตัวคูณ
              </span>
              <MultiplierPicker value={multiplier} onChange={setMultiplier} />
            </div>

            <div>
              <span className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-muted)]">
                ผลลัพธ์
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResult('correct')}
                  className={`rounded-lg py-2.5 text-base font-bold transition ${
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
                  className={`rounded-lg py-2.5 text-base font-bold transition ${
                    result === 'wrong' ? 'bg-[var(--color-danger)] text-white' : 'btn-sea'
                  }`}
                >
                  ผิด
                </button>
              </div>
            </div>

            {preview && (
              <div className="rounded-lg bg-[rgba(255,255,255,0.35)] px-3 py-2.5 text-center">
                <p className="text-xs text-[var(--color-ink-muted)]">พรีวิวรอบนี้</p>
                <p
                  className={`mt-0.5 font-display text-2xl ${
                    preview.delta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                  }`}
                >
                  {formatDelta(preview.delta)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                  คะแนนหลังรอบ ≈ {Math.round(preview.nextScore).toLocaleString('th-TH')}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !team}
              className="btn-gold w-full rounded-lg py-3 text-lg"
            >
              {busy ? 'กำลังบันทึก…' : 'ยืนยันรอบนี้'}
            </button>
          </motion.form>

          <section className="parchment panel mb-3 space-y-2 rounded-xl p-4">
            <h2 className="font-display text-base text-[var(--color-ocean-deep)]">ตั้งคะแนนตรงๆ</h2>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={manualScore}
                onChange={(e) => setManualScore(e.target.value)}
                className="input-field min-w-0 flex-1 py-2 text-base"
              />
              <button
                type="button"
                disabled={busy || !team}
                onClick={onSetScore}
                className="btn-ocean rounded-lg px-3 py-2 text-sm font-semibold"
              >
                ตั้งคะแนน
              </button>
            </div>
          </section>

          <section className="parchment panel rounded-xl p-4">
            <h2 className="font-display text-base text-[var(--color-ocean-deep)]">รีเซ็ตทีมนี้</h2>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min={0}
                value={startingScore}
                onChange={(e) => setStartingScore(e.target.value)}
                className="input-field min-w-0 flex-1 py-2 text-base"
              />
              <button
                type="button"
                disabled={busy}
                onClick={onReset}
                className="btn-sea rounded-lg px-3 py-2 text-sm font-semibold"
              >
                รีเซ็ตทีม
              </button>
            </div>
          </section>
        </>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-[var(--color-danger)]">{error}</p>
      )}
    </main>
  )
}
