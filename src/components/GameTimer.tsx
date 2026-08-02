type Props = {
  remainingMs: number
  totalMs: number
}

function formatTimer(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function GameTimer({ remainingMs, totalMs }: Props) {
  const ratio = totalMs > 0 ? remainingMs / totalMs : 0
  const urgent = remainingMs <= 5000

  return (
    <div
      className={`dsp-timer ${urgent ? 'dsp-timer-urgent' : ''}`}
      aria-label={`เวลาเหลือ ${formatTimer(remainingMs)}`}
    >
      <p className="dsp-timer-label">เวลา</p>
      <p className="dsp-timer-value">{formatTimer(remainingMs)}</p>
      <div className="dsp-timer-track">
        <div
          className="dsp-timer-fill"
          style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
        />
      </div>
    </div>
  )
}
