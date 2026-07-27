import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatedScore } from '../components/AnimatedScore'
import { MultiplierPicker } from '../components/MultiplierPicker'
import {
  DEFAULT_STARTING_SCORE,
  applyRound,
  formatDelta,
  type RoundResult,
  type TeamState,
} from '../lib/scoring'
import { playRoundSound, unlockAudio } from '../lib/sounds'
import { ensureTeam, resetTeam, submitRound, subscribeTeam } from '../lib/teams'

export function AdminTeam() {
  const { teamId = '1' } = useParams()
  const [team, setTeam] = useState<TeamState | null>(null)
  const [bet, setBet] = useState('100')
  const [multiplier, setMultiplier] = useState(1.2)
  const [result, setResult] = useState<RoundResult>('correct')
  const [startingScore, setStartingScore] = useState(String(DEFAULT_STARTING_SCORE))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ensureTeam(teamId)
      .then((t) => {
        if (alive) setStartingScore(String(t.startingScore))
      })
      .catch((e) => setError(String(e)))
    const unsub = subscribeTeam(teamId, setTeam)
    return () => {
      alive = false
      unsub()
    }
  }, [teamId])

  const betNum = Number(bet)
  const preview = useMemo(() => {
    if (!team || !Number.isFinite(betNum) || betNum <= 0) return null
    return applyRound(team.score, betNum, multiplier, result)
  }, [team, betNum, multiplier, result])

  async function onSubmit(e: FormEvent) {
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
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="sea-grain mx-auto min-h-dvh max-w-xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/" className="text-sm text-[var(--color-gold-400)] no-underline">
          ← หน้าแรก
        </Link>
        <Link
          to={`/display/${teamId}`}
          className="text-sm text-[var(--color-foam)]/70 no-underline"
          target="_blank"
          rel="noreferrer"
        >
          เปิดหน้าโชว์
        </Link>
      </div>

      <header className="panel-wood mb-5 rounded-2xl p-5 text-center">
        <h1 className="font-display text-3xl text-[var(--color-gold-300)]">
          {team?.name ?? `ทีม ${teamId}`}
        </h1>
        <p className="mt-1 text-sm text-white/60">คะแนนปัจจุบัน</p>
        {team ? (
          <AnimatedScore score={team.score} size="lg" />
        ) : (
          <p className="text-4xl text-white/40">…</p>
        )}
      </header>

      <form onSubmit={onSubmit} className="panel-wood space-y-5 rounded-2xl p-5">
        <label className="block">
          <span className="mb-1 block text-sm text-white/70">เงินเดิมพัน</span>
          <input
            type="number"
            min={1}
            step={1}
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            onFocus={unlockAudio}
            className="w-full rounded-lg border border-[var(--color-gold-400)]/30 bg-[var(--color-sea-950)]/70 px-4 py-3 text-2xl text-[var(--color-foam)] outline-none focus:border-[var(--color-gold-400)]"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm text-white/70">ตัวคูณ</span>
          <MultiplierPicker value={multiplier} onChange={setMultiplier} />
        </div>

        <div>
          <span className="mb-2 block text-sm text-white/70">ผลลัพธ์</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setResult('correct')}
              className={`rounded-lg py-4 text-xl font-bold ${
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
              className={`rounded-lg py-4 text-xl font-bold ${
                result === 'wrong' ? 'bg-[var(--color-danger)] text-white' : 'btn-sea'
              }`}
            >
              ผิด
            </button>
          </div>
        </div>

        {preview && (
          <div className="rounded-lg bg-black/25 px-4 py-3 text-center">
            <p className="text-sm text-white/60">พรีวิวรอบนี้</p>
            <p
              className={`text-2xl font-bold ${
                preview.delta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
              }`}
            >
              {formatDelta(preview.delta)}
            </p>
            <p className="text-sm text-white/70">
              คะแนนหลังรอบ ≈ {Math.round(preview.nextScore).toLocaleString('th-TH')}
            </p>
          </div>
        )}

        {error && <p className="text-center text-[var(--color-danger)]">{error}</p>}

        <button type="submit" disabled={busy || !team} className="btn-gold w-full rounded-xl py-4 text-xl">
          {busy ? 'กำลังบันทึก…' : 'ยืนยัน / ถัดไป'}
        </button>
      </form>

      <section className="panel-wood mt-5 rounded-2xl p-5">
        <h2 className="font-display mb-3 text-xl text-[var(--color-gold-400)]">ตั้งค่าเริ่มต้น</h2>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={startingScore}
            onChange={(e) => setStartingScore(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/15 bg-[var(--color-sea-950)]/70 px-3 py-2 text-lg outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={onReset}
            className="btn-sea rounded-lg px-4 py-2 font-semibold"
          >
            รีเซ็ตทีม
          </button>
        </div>
        <p className="mt-2 text-xs text-white/50">รีเซ็ตจะล้างประวัติและตั้งคะแนนใหม่ตามค่านี้</p>
      </section>
    </main>
  )
}
