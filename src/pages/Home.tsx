import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { TEAM_IDS } from '../lib/scoring'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
}

export function Home() {
  return (
    <main className="sea-grain mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 md:py-14">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 text-center md:mb-14"
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.42em] text-[var(--color-brass)]/80 md:text-sm">
          Live Score Desk
        </p>
        <h1 className="font-display text-[clamp(2.4rem,7vw,4.6rem)] leading-[1.1] text-[var(--color-brass-soft)]">
          The Secret Time Loop
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[var(--color-mist)] md:text-lg">
          พี่สตาฟเลือกโต๊ะทีม · ทีวีแสดงคะแนนแบบเรียลไทม์
        </p>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-7"
        >
          <Link
            to="/display/all"
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base no-underline md:text-lg"
          >
            กระดานคะแนนรวม
          </Link>
        </motion.div>
      </motion.header>

      <motion.section
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="panel mb-6 rounded-2xl p-5 md:p-7"
      >
        <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl text-[var(--color-brass)] md:text-2xl">
              โต๊ะพี่สตาฟ
            </h2>
            <p className="mt-1 text-sm text-[var(--color-mist)]">
              แตะทีมเพื่อเปิดหน้าแอดมินของโต๊ะนั้น
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TEAM_IDS.map((id, i) => (
            <motion.div key={id} custom={i + 2} variants={fadeUp} initial="hidden" animate="show">
              <Link
                to={`/admin/${id}`}
                className="btn-gold flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-5 text-center no-underline"
              >
                <span className="text-xs font-semibold uppercase tracking-widest opacity-70">
                  Admin
                </span>
                <span className="font-display text-2xl md:text-3xl">ทีม {id}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section
        custom={4}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="panel rounded-2xl p-5 md:p-7"
      >
        <h2 className="font-display text-xl text-[var(--color-brass)] md:text-2xl">หน้าโชว์ทีวี</h2>
        <p className="mt-1 mb-5 text-sm text-[var(--color-mist)]">
          เปิดทีละทีมบนจอใหญ่ หรือใช้กระดานรวมด้านบน
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {TEAM_IDS.map((id) => (
            <Link
              key={id}
              to={`/display/${id}`}
              className="btn-sea rounded-xl py-3.5 text-center text-lg font-semibold no-underline"
            >
              {id}
            </Link>
          ))}
        </div>
      </motion.section>
    </main>
  )
}
