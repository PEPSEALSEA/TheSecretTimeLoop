import { motion } from 'framer-motion'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatedScore } from '../components/AnimatedScore'
import { MultiplierPicker } from '../components/MultiplierPicker'
import {
  DEFAULT_STARTING_SCORE,
  TEAM_IDS,
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
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link to="/" className="text-sm text-[var(--color-brass)] no-underline hover:text-[var(--color-brass-soft)]">
          ← หน้าแรก
        </Link>
        <div className="flex gap-4 text-sm">
          <Link
            to="/display/all"
            className="text-[var(--color-mist)] no-underline hover:text-[var(--color-brass)]"
          >
            กระดานรวม
          </Link>
          <Link
            to={`/display/${teamId}`}
            className="text-[var(--color-mist)] no-underline hover:text-[var(--color-brass)]"
            target="_blank"
            rel="noreferrer"
          >
            เปิดหน้าโชว์
          </Link>
        </div>
      </div>

      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel mb-5 rounded-2xl p-6 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-mist)]">
          Staff Admin · โต๊ะ {teamId}
        </p>
        <h1 className="font-display mt-2 text-3xl text-[var(--color-brass-soft)] md:text-4xl">
          {team?.name ?? `ทีม ${teamId}`}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-mist)]">คะแนนปัจจุบัน</p>
        {team ? (
          <div className="mt-1">
            <AnimatedScore score={team.score} size="lg" />
          </div>
        ) : (
          <p className="mt-2 text-4xl text-white/30">…</p>
        )}
      </motion.header>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        onSubmit={onSubmit}
        className="panel space-y-5 rounded-2xl p-5 md:p-6"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[var(--color-mist)]">
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
          <span className="mb-2 block text-sm font-medium text-[var(--color-mist)]">ตัวคูณ</span>
          <MultiplierPicker value={multiplier} onChange={setMultiplier} />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-[var(--color-mist)]">ผลลัพธ์</span>
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
          <div className="rounded-xl bg-black/30 px-4 py-3.5 text-center">
            <p className="text-sm text-[var(--color-mist)]">พรีวิวรอบนี้</p>
            <p
              className={`mt-1 font-display text-3xl ${
                preview.delta >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
              }`}
            >
              {formatDelta(preview.delta)}
            </p>
            <p className="mt-1 text-sm text-[var(--color-mist)]">
              คะแนนหลังรอบ ≈ {Math.round(preview.nextScore).toLocaleString('th-TH')}
            </p>
          </div>
        )}

        {error && <p className="text-center text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={busy || !team}
          className="btn-gold w-full rounded-xl py-4 text-xl"
        >
          {busy ? 'กำลังบันทึก…' : 'ยืนยัน / ถัดไป'}
        </button>
      </motion.form>

      <section className="panel mt-5 rounded-2xl p-5">
        <h2 className="font-display text-lg text-[var(--color-brass)]">ตั้งค่าเริ่มต้น</h2>
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
        <p className="mt-2 text-xs text-[var(--color-mist)]">
          รีเซ็ตจะล้างประวัติและตั้งคะแนนใหม่ตามค่านี้
        </p>
      </section>

      <nav className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-8">
        {TEAM_IDS.map((id) => (
          <Link
            key={id}
            to={`/admin/${id}`}
            className={`rounded-lg py-2 text-center text-sm font-semibold no-underline ${
              id === teamId ? 'btn-gold' : 'btn-sea'
            }`}
          >
            {id}
          </Link>
        ))}
      </nav>
    </main>
  )
}
