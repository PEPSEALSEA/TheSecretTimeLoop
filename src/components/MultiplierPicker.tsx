import { MULTIPLIERS } from '../lib/scoring'

type Props = {
  value: number
  onChange: (value: number) => void
}

export function MultiplierPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {MULTIPLIERS.map((m) => {
        const active = value === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`rounded-lg px-2 py-3 text-lg font-bold transition ${
              active
                ? 'btn-gold shadow-[0_0_0_2px_rgba(240,208,120,0.6)]'
                : 'btn-sea'
            }`}
          >
            ×{m.toFixed(1)}
          </button>
        )
      })}
    </div>
  )
}
