import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AnimatedScore } from '../components/AnimatedScore'
import {
  answeredCount,
  betCount,
  effectivePhase,
  markTeamBet,
  markTeamChoice,
  markTeamScored,
  questionProgressLabel,
  scoredCount,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { getQuestion, type ChoiceId } from '../lib/questions'
import {
  BET_OPTIONS,
  DEFAULT_STARTING_SCORE,
  TEAM_IDS,
  formatMultiplier,
  formatScore,
  type TeamState,
} from '../lib/scoring'
import { unlockAudio } from '../lib/sounds'
import {
  ensureTeam,
  resetTeam,
  setTeamScore,
  subscribeTeam,
} from '../lib/teams'

export function StaffTeam() {
  const { teamId = '' } = useParams()
  const valid = TEAM_IDS.includes(teamId as (typeof TEAM_IDS)[number])

  const [game, setGame] = useState<GameState | null>(null)
  const [team, setTeam] = useState<TeamState | null>(null)
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

  useEffect(() => {
    if (!team) return
    setManualScore(String(Math.round(team.score)))
  }, [team])

  const phase = game ? effectivePhase(game) : 'lobby'
  const canBet =
    phase === 'betting' || phase === 'question' || phase === 'waiting'
  const canChoose = phase === 'question' || phase === 'waiting'
  const canPlay = canBet
  const canScore = phase === 'scores'
  const alreadyScored = Boolean(game?.scoredTeams[teamId])
  const selectedChoice = game?.teamChoices[teamId] ?? null
  const selectedBet = game?.teamBets[teamId] ?? null
  const doneCount = game ? scoredCount(game) : 0
  const answeredTeamsCount = game ? answeredCount(game) : 0
  const betTeamsCount = game ? betCount(game) : 0
  const question = game ? getQuestion(game.questionIndex) : null

  if (!valid) return <Navigate to="/" replace />

  async function afterSave() {
    if (canScore) {
      await markTeamScored(teamId)
      setSavedFlash(true)
      window.setTimeout(() => setSavedFlash(false), 1200)
    }
  }

  async function onPickChoice(choice: ChoiceId) {
    if (!canChoose) return
    unlockAudio()
    setBusy(true)
    setError(null)
    try {
      await markTeamChoice(teamId, choice)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onPickBet(amount: number) {
    if (!canBet) return
    if (team && amount > team.score) {
      setError('เดิมพันมากกว่าคะแนนปัจจุบัน')
      return
    }
    unlockAudio()
    setBusy(true)
    setError(null)
    try {
      await markTeamBet(teamId, amount)
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

  const statusText = canScore
    ? 'คะแนนอัปเดตแล้ว · รอข้อต่อไป'
    : phase === 'betting'
      ? selectedBet != null
        ? `เดิมพัน ${formatScore(selectedBet)} · รอเปิดตัวเลือก`
        : 'วางเดิมพัน (ยังไม่มีตัวเลือก)'
      : canChoose
        ? selectedChoice && selectedBet != null
          ? `เลือก ${selectedChoice} · เดิมพัน ${formatScore(selectedBet)}`
          : selectedChoice
            ? `เลือก ${selectedChoice} แล้ว · เลือกเดิมพัน`
            : selectedBet != null
              ? `เดิมพัน ${formatScore(selectedBet)} · เลือกคำตอบ`
              : 'เลือกคำตอบ + วางเดิมพัน'
        : phase === 'reveal'
          ? 'คะแนนอัปเดตอัตโนมัติ · รอเปิดกระดาน'
          : 'รอเริ่ม'

  return (
    <main className="pirate-scene sea-grain mx-auto min-h-dvh max-w-md px-3 py-4 text-[0.95rem]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[var(--color-pirate-red)]">
          Staff · โต๊ะ {teamId}
        </p>
        <p className="font-score text-base text-[var(--color-ocean-deep)]">
          {canScore
            ? `${doneCount}/${TEAM_IDS.length}`
            : canPlay
              ? `${betTeamsCount}/${TEAM_IDS.length} เดิมพัน`
              : `${doneCount}/${TEAM_IDS.length}`}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="parchment panel mb-3 rounded-xl p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
              สถานะรอบนี้
            </p>
            <p className="mt-0.5 font-display text-lg text-[var(--color-ocean-deep)]">
              {statusText}
            </p>
            {game && phase !== 'lobby' && (
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                {questionProgressLabel(game.questionIndex)}
                {question ? ` · ×${formatMultiplier(question.multiplier)}` : ''}
              </p>
            )}
          </div>
          {(phase === 'reveal' || phase === 'scores') && alreadyScored && (
            <span className="rounded-full bg-[rgba(45,138,94,0.18)] px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
              อัปเดตแล้ว
            </span>
          )}
        </div>
        {(phase === 'reveal' || phase === 'scores') && (
          <div className="mt-2 rounded-lg bg-[rgba(255,255,255,0.35)] px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)]">
            <p>
              {selectedBet != null
                ? `เดิมพัน ${formatScore(selectedBet)}${
                    selectedChoice ? ` · เลือก ${selectedChoice}` : ' · ไม่ได้เลือกคำตอบ'
                  }`
                : 'ทีมนี้ยังไม่ได้วางเดิมพัน'}
            </p>
            <p className="mt-1">เฉลยดูที่จอใหญ่เท่านั้น · staff ไม่แสดงผลถูก/ผิด</p>
          </div>
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

      {canPlay && question && (
        <section className="parchment panel mb-3 space-y-3 rounded-xl p-4">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
              โจทย์ · ×{formatMultiplier(question.multiplier)}
            </p>
            <p className="mt-1 font-display text-base leading-snug text-[var(--color-ocean-deep)]">
              {question.prompt}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-muted)]">
              เงินเดิมพัน
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {BET_OPTIONS.map((amount) => {
                const active = selectedBet === amount
                const overBudget = Boolean(team && amount > team.score)
                return (
                  <button
                    key={amount}
                    type="button"
                    disabled={busy || overBudget}
                    onClick={() => void onPickBet(amount)}
                    className={`rounded-lg border-2 py-2.5 text-sm font-bold transition ${
                      active
                        ? 'border-[var(--color-gold)] bg-[rgba(240,192,64,0.28)] text-[var(--color-ocean-deep)]'
                        : overBudget
                          ? 'cursor-not-allowed border-[rgba(42,24,16,0.08)] bg-[rgba(42,24,16,0.04)] text-[var(--color-ink-muted)] opacity-50'
                          : 'border-[rgba(42,24,16,0.12)] bg-[rgba(255,255,255,0.28)] text-[var(--color-ocean-deep)] hover:border-[rgba(26,90,138,0.35)]'
                    }`}
                  >
                    {amount}
                  </button>
                )
              })}
            </div>
          </div>

          {canChoose ? (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--color-ink-muted)]">ตัวเลือก</p>
                {question.choices.map((choice) => {
                  const active = selectedChoice === choice.id
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={busy}
                      onClick={() => void onPickChoice(choice.id)}
                      className={`w-full rounded-xl border-2 px-3 py-2.5 text-left transition ${
                        active
                          ? 'border-[var(--color-gold)] bg-[rgba(240,192,64,0.28)]'
                          : 'border-[rgba(42,24,16,0.12)] bg-[rgba(255,255,255,0.28)] hover:border-[rgba(26,90,138,0.35)]'
                      }`}
                    >
                      <span className="font-display text-lg text-[var(--color-ocean-deep)]">
                        {choice.id}.
                      </span>{' '}
                      <span className="text-sm leading-snug text-[var(--color-ink)]">
                        {choice.text}
                      </span>
                    </button>
                  )
                })}
              </div>

              <p className="text-center text-xs text-[var(--color-ink-muted)]">
                เดิมพัน {betTeamsCount}/{TEAM_IDS.length} · ตอบ {answeredTeamsCount}/
                {TEAM_IDS.length} · แก้ได้จนกว่า host กดแสดงเฉลย
              </p>
            </>
          ) : (
            <p className="text-center text-xs text-[var(--color-ink-muted)]">
              เดิมพันแล้ว {betTeamsCount}/{TEAM_IDS.length} ทีม · รอ host เปิดตัวเลือก
            </p>
          )}
        </section>
      )}

      {phase === 'reveal' && (
        <section className="parchment panel mb-3 rounded-xl p-4">
          <p className="font-display text-lg text-[var(--color-ocean-deep)]">
            คะแนนอัปเดตแล้ว
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            รอ host เปิดกระดานคะแนน · ดูเฉลยที่จอใหญ่เท่านั้น
          </p>
        </section>
      )}

      {canScore ? (
        <>
          <section className="parchment panel mb-3 rounded-xl p-4">
            <p className="font-display text-lg text-[var(--color-ocean-deep)]">
              คิดคะแนนอัตโนมัติแล้ว
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              ไม่ต้องกดยืนยัน · แก้คะแนนด้านล่างได้ถ้าจำเป็น
            </p>
          </section>

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
      ) : (
        !canPlay &&
        phase !== 'reveal' && (
          <section className="parchment panel rounded-xl p-5 text-center">
            <p className="font-display text-xl text-[var(--color-ocean-deep)]">เปิดค้างไว้ได้เลย</p>
            <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
              พอ host เปิดรอบเดิมพัน จะมีปุ่มเดิมพันให้กดตรงนี้
            </p>
          </section>
        )
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-[var(--color-danger)]">{error}</p>
      )}
    </main>
  )
}
