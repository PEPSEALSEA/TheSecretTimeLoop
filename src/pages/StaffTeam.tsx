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
  questionProgressLabel,
  scoredCount,
  subscribeGame,
  type GameState,
} from '../lib/game'
import { getQuestion, type ChoiceId } from '../lib/questions'
import {
  BET_OPTIONS,
  TEAM_IDS,
  formatMultiplier,
  formatScore,
  getTeamName,
  type TeamState,
} from '../lib/scoring'
import { unlockAudio } from '../lib/sounds'
import { ensureTeam, subscribeTeam } from '../lib/teams'
import { useNow } from '../lib/timer'

export function StaffTeam() {
  const { teamId = '' } = useParams()
  const valid = TEAM_IDS.includes(teamId as (typeof TEAM_IDS)[number])

  const [game, setGame] = useState<GameState | null>(null)
  const [team, setTeam] = useState<TeamState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!valid) return
    ensureTeam(teamId).catch((e) => setError(String(e)))
    const unsubTeam = subscribeTeam(teamId, setTeam)
    const unsubGame = subscribeGame(setGame)
    return () => {
      unsubTeam()
      unsubGame()
    }
  }, [teamId, valid])

  const clockActive =
    game != null && game.phase !== 'lobby' && game.phase !== 'finished'
  const now = useNow(clockActive)
  const phase = game ? effectivePhase(game, now) : 'lobby'
  const canBet =
    phase === 'betting' || phase === 'question' || phase === 'waiting'
  const canChoose = phase === 'question' || phase === 'waiting'
  const canPlay = canBet
  const canScore = phase === 'scores'
  const selectedChoice = game?.teamChoices[teamId] ?? null
  const selectedBet = game?.teamBets[teamId] ?? null
  const doneCount = game ? scoredCount(game) : 0
  const answeredTeamsCount = game ? answeredCount(game) : 0
  const betTeamsCount = game ? betCount(game) : 0
  const question = game ? getQuestion(game.questionIndex) : null

  if (!valid) return <Navigate to="/" replace />

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
        : phase === 'reveal' || phase === 'revealVideo'
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
        </div>
      </motion.div>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="parchment panel mb-3 rounded-xl p-4 text-center"
      >
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-[var(--color-ink-muted)]">
          คะแนนทีมนี้
        </p>
        <h1 className="font-display mt-1 text-2xl text-[var(--color-ocean-deep)]">
          {getTeamName(teamId)}
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
            {question.promptAfterImage && (
              <p className="mt-2 font-display text-base leading-snug text-[var(--color-ocean-deep)]">
                {question.promptAfterImage}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink-muted)]">
              เงินเดิมพัน
            </p>
            <div className="grid grid-cols-5 gap-2">
              {BET_OPTIONS.map((amount) => {
                const active = selectedBet === amount
                const overBudget = Boolean(team && amount > team.score)
                return (
                  <button
                    key={amount}
                    type="button"
                    disabled={busy || overBudget}
                    onClick={() => void onPickBet(amount)}
                    aria-pressed={active}
                    className={`flex min-h-12 w-full items-center justify-center rounded-xl border-2 px-1 py-2 text-sm font-bold leading-none transition ${
                      active
                        ? 'border-[var(--color-gold)] bg-[rgba(240,192,64,0.28)] text-[var(--color-ocean-deep)] shadow-[inset_0_0_0_1px_rgba(240,192,64,0.35)]'
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

          <div>
            {canChoose ? (
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
                      aria-pressed={active}
                      className={`flex w-full items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition ${
                        active
                          ? 'border-[var(--color-gold)] bg-[rgba(240,192,64,0.28)] shadow-[inset_0_0_0_1px_rgba(240,192,64,0.35)]'
                          : 'border-[rgba(42,24,16,0.12)] bg-[rgba(255,255,255,0.28)] hover:border-[rgba(26,90,138,0.35)]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-base leading-none ${
                          active
                            ? 'bg-[rgba(240,192,64,0.45)] text-[var(--color-ocean-deep)]'
                            : 'bg-[rgba(42,24,16,0.08)] text-[var(--color-ocean-deep)]'
                        }`}
                      >
                        {choice.id}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-sm leading-snug text-[var(--color-ink)]">
                        {choice.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex min-h-[8rem] items-center justify-center rounded-xl border border-dashed border-[rgba(42,24,16,0.14)] bg-[rgba(255,255,255,0.18)] px-4 py-6 text-center text-sm text-[var(--color-ink-muted)]">
                รอ host เปิดตัวเลือก
              </div>
            )}
          </div>

          <p className="text-center text-xs text-[var(--color-ink-muted)]">
            {canChoose
              ? `เดิมพัน ${betTeamsCount}/${TEAM_IDS.length} · ตอบ ${answeredTeamsCount}/${TEAM_IDS.length} · แก้ได้จนกว่า host กดแสดงเฉลย`
              : `เดิมพันแล้ว ${betTeamsCount}/${TEAM_IDS.length} ทีม · รอ host เปิดตัวเลือก`}
          </p>
        </section>
      )}

      {(phase === 'reveal' || phase === 'revealVideo') && (
        <section className="parchment panel mb-3 rounded-xl p-4">
          <p className="font-display text-lg text-[var(--color-ocean-deep)]">
            คะแนนอัปเดตแล้ว
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {phase === 'revealVideo'
              ? 'กำลังเล่นวิดีโอเฉลยบนจอใหญ่ · รอ host เปิดเฉลยข้อความ'
              : 'รอ host เปิดกระดานคะแนน · ดูเฉลยที่จอใหญ่เท่านั้น'}
          </p>
        </section>
      )}

      {canScore ? (
        <section className="parchment panel mb-3 rounded-xl p-4">
          <p className="font-display text-lg text-[var(--color-ocean-deep)]">
            คิดคะแนนอัตโนมัติแล้ว
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            รอ host เปิดข้อต่อไป · ถ้าต้องแก้คะแนนให้แก้ที่หน้า admin
          </p>
        </section>
      ) : (
        !canPlay &&
        phase !== 'reveal' &&
        phase !== 'revealVideo' && (
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
