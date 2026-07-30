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
      className={`fixed right-4 top-4 z-40 min-w-[7.5rem] rounded-2xl border px-4 py-3 text-center shadow-lg backdrop-blur md:right-8 md:top-8 ${
        urgent
          ? 'border-[rgba(185,28,28,0.45)] bg-[rgba(185,28,28,0.18)]'
          : 'border-[rgba(42,24,16,0.16)] bg-[rgba(244,228,200,0.92)]'
      }`}
    >
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.28em] text-[var(--color-ink-muted)]">
        เวลา
      </p>
      <p
        className={`font-score mt-1 text-3xl leading-none md:text-4xl ${
          urgent ? 'text-[var(--color-danger)]' : 'text-[var(--color-ocean-deep)]'
        }`}
      >
        {formatTimer(remainingMs)}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${
            urgent ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-gold)]'
          }`}
          style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }}
        />
      </div>
    </div>
  )
}
