import { Link } from 'react-router-dom'
import { TEAM_IDS } from '../lib/scoring'

export function Home() {
  return (
    <main className="sea-grain mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 md:py-12">
      <header className="mb-10 text-center">
        <p className="mb-2 text-sm uppercase tracking-[0.35em] text-[var(--color-gold-400)]/80">
          Pirate Score Desk
        </p>
        <h1 className="font-display text-5xl text-[var(--color-gold-300)] md:text-7xl">
          The Secret Time Loop
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base text-[var(--color-foam)]/80 md:text-lg">
          เครื่องมือคิดคะแนนรอบเดิมพัน — พี่สตาฟกรอกที่โต๊ะ ทีวีโชว์คะแนนแบบเรียลไทม์
        </p>
      </header>

      <section className="mb-8 panel-wood rounded-2xl p-5 md:p-6">
        <h2 className="font-display mb-4 text-2xl text-[var(--color-gold-400)]">หน้าพี่สตาฟ</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {TEAM_IDS.map((id) => (
            <Link
              key={id}
              to={`/admin/${id}`}
              className="btn-gold rounded-lg py-3 text-center text-lg no-underline"
            >
              {id}
            </Link>
          ))}
        </div>
      </section>

      <section className="panel-wood rounded-2xl p-5 md:p-6">
        <h2 className="font-display mb-4 text-2xl text-[var(--color-gold-400)]">หน้าโชว์ (ทีวี)</h2>
        <div className="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {TEAM_IDS.map((id) => (
            <Link
              key={id}
              to={`/display/${id}`}
              className="btn-sea rounded-lg py-3 text-center text-lg no-underline"
            >
              {id}
            </Link>
          ))}
        </div>
        <Link
          to="/display/all"
          className="btn-gold inline-flex rounded-lg px-5 py-3 text-base no-underline"
        >
          ดูทุกทีม
        </Link>
      </section>
    </main>
  )
}
