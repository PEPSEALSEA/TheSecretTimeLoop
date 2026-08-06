import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export function Home() {
  return (
    <main className="pirate-scene sea-grain mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 md:py-14">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="mb-10 text-center md:mb-14"
      >
        <p className="font-pirate mb-2 text-[clamp(1.4rem,4vw,2rem)] text-[var(--color-ocean-deep)]">
          The Secret Time Loop
        </p>
        <h1 className="font-display title-glow text-[clamp(2.2rem,7vw,4.2rem)] leading-[1.08]">
          กระดานทองสมรภูมิโจรสลัด
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[var(--color-ink-muted)] md:text-lg">
          เปิดบนทีวีเพื่อดูทองทุกทีมแบบเรียลไทม์
        </p>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/display/all"
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base no-underline md:text-lg"
          >
            กระดาน TV (1920×1080)
          </Link>
          <Link
            to="/display/other-devices"
            className="btn-gold inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base no-underline md:text-lg"
          >
            กระดาน iPad / อุปกรณ์อื่น
          </Link>
        </motion.div>
      </motion.header>
    </main>
  )
}
