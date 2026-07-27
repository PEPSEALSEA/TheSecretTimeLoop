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
            className={`rounded-xl px-2 py-3 text-base font-bold transition md:text-lg ${
              active ? 'btn-gold' : 'btn-sea'
            }`}
          >
            ×{m.toFixed(1)}
          </button>
        )
      })}
    </div>
  )
}
