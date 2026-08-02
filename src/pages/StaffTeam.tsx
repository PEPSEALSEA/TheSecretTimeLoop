import { motion } from 'framer-motion'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { AnimatedScore } from '../components/AnimatedScore'
import {
  answeredCount,
  effectivePhase,
  markTeamChoice,
  markTeamScored,
  questionProgressLabel,
  scoredCount,
  subscribeGame,
  type GameState,
} from '../lib/game'
import {
  getQuestion,
  isCorrectChoice,
  type ChoiceId,
} from '../lib/questions'
import {
  DEFAULT_STARTING_SCORE,
  TEAM_IDS,
  applyRound,
  formatDelta,
  formatMultiplier,
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
  const canChoose = phase === 'question' || phase === 'waiting'
  const canScore = phase === 'scores'
  const alreadyScored = Boolean(game?.scoredTeams[teamId])
  const selectedChoice = game?.teamChoices[teamId] ?? null
  const doneCount = game ? scoredCount(game) : 0
  const answeredTeamsCount = game ? answeredCount(game) : 0
  const question = game ? getQuestion(game.questionIndex) : null
  const multiplier = question?.multiplier ?? 1
  const isCorrect = question ? isCorrectChoice(question, selectedChoice) : false
  const result = isCorrect ? 'correct' : 'wrong'

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

  async function onSubmitRound(e: FormEvent) {
    e.preventDefault()
    if (!canScore || !question) return
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
      await submitRound(
        teamId,
        betNum,
        multiplier,
        result,
        selectedChoice ?? undefined,
      )
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
          {canScore
            ? `${doneCount}/${TEAM_IDS.length}`
            : canChoose
              ? `${answeredTeamsCount}/${TEAM_IDS.length}`
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
              {canScore
                ? alreadyScored
                  ? 'บันทึกแล้ว · รอข้อต่อไป'
                  : 'ใส่เดิมพันแล้วกดยืนยัน'
                : canChoose
                  ? selectedChoice
                    ? `เลือก ${selectedChoice} แล้ว`
                    : 'เลือกคำตอบ'
                  : phase === 'reveal'
                    ? 'ดูเฉลย · รอเปิดกระดาน'
                    : 'รอเริ่ม'}
            </p>
            {game && phase !== 'lobby' && (
              <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                {questionProgressLabel(game.questionIndex)}
                {question ? ` · ×${formatMultiplier(question.multiplier)}` : ''}
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
          <div className="mt-2 rounded-lg bg-[rgba(255,255,255,0.35)] px-2.5 py-1.5 text-xs text-[var(--color-ink-muted)]">
            <p>
              เฉลย:{' '}
              <span className="font-semibold text-[var(--color-success)]">
                {question.answerLabel}
              </span>
            </p>
            {selectedChoice && (
              <p className="mt-1">
                ทีมเลือก {selectedChoice}{' '}
                <span
                  className={
                    isCorrect
                      ? 'font-semibold text-[var(--color-success)]'
                      : 'font-semibold text-[var(--color-danger)]'
                  }
                >
                  ({isCorrect ? 'ถูก' : 'ผิด'})
                </span>
              </p>
            )}
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

      {canChoose && question && (
        <section className="parchment panel mb-3 space-y-3 rounded-xl p-4">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-[var(--color-ink-muted)]">
              โจทย์ · ×{formatMultiplier(question.multiplier)}
            </p>
            <p className="mt-1 font-display text-base leading-snug text-[var(--color-ocean-deep)]">
              {question.prompt}
            </p>
          </div>
          <div className="space-y-2">
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
            ตอบแล้ว {answeredTeamsCount}/{TEAM_IDS.length} ทีม · เปลี่ยน choice ได้จนกว่า host
            เปิดเฉลย
          </p>
        </section>
      )}

      {phase === 'reveal' && question && (
        <section className="parchment panel mb-3 rounded-xl p-4">
          <p className="font-display text-lg text-[var(--color-ocean-deep)]">รอเปิดกระดานคะแนน</p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {selectedChoice
              ? `เลือก ${selectedChoice} แล้ว · ตอน scores ใส่เดิมพันเพื่อคิดคะแนน`
              : 'ทีมนี้ยังไม่ได้เลือกคำตอบ จะถือว่าผิดเมื่อใส่เดิมพัน'}
          </p>
        </section>
      )}

      {canScore ? (
        <>
          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={onSubmitRound}
            className="parchment panel mb-3 space-y-3 rounded-xl p-4"
          >
            <h2 className="font-display text-base text-[var(--color-ocean-deep)]">
              เดิมพันรอบนี้
            </h2>

            <div className="rounded-lg bg-[rgba(255,255,255,0.35)] px-3 py-2 text-sm">
              <p className="text-[var(--color-ink-muted)]">
                ตัวคูณข้อนี้: <strong>×{formatMultiplier(multiplier)}</strong>
              </p>
              <p className="mt-0.5 text-[var(--color-ink-muted)]">
                คำตอบ:{' '}
                {selectedChoice ? (
                  <>
                    {selectedChoice}{' '}
                    <strong className={isCorrect ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
                      ({isCorrect ? 'ถูก' : 'ผิด'})
                    </strong>
                  </>
                ) : (
                  <strong className="text-[var(--color-danger)]">ไม่ได้เลือก · ผิด</strong>
                )}
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                {isCorrect
                  ? 'สูตรถูก: คะแนน − เดิมพัน + (เดิมพัน × ตัวคูณ)'
                  : 'สูตรผิด: คะแนน − เดิมพัน'}
              </p>
            </div>

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
              disabled={busy || !team || alreadyScored}
              className="btn-gold w-full rounded-lg py-3 text-lg"
            >
              {alreadyScored ? 'บันทึกแล้ว' : busy ? 'กำลังบันทึก…' : 'ยืนยันเดิมพัน'}
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
      ) : (
        !canChoose && phase !== 'reveal' && (
          <section className="parchment panel rounded-xl p-5 text-center">
            <p className="font-display text-xl text-[var(--color-ocean-deep)]">เปิดค้างไว้ได้เลย</p>
            <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
              พอ host เริ่มโจทย์ จะมี choice ให้กดตรงนี้
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
