import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { formatScore } from '../lib/scoring'

type Props = {
  score: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClass = {
  sm: 'text-3xl',
  md: 'text-5xl',
  lg: 'text-7xl md:text-8xl',
  xl: 'text-[clamp(4rem,14vw,9rem)]',
} as const

export function AnimatedScore({ score, size = 'lg', className = '' }: Props) {
  const spring = useSpring(score, { stiffness: 120, damping: 18 })
  const display = useTransform(spring, (v) => formatScore(v))

  useEffect(() => {
    spring.set(score)
  }, [score, spring])

  return (
    <motion.span
      key={score}
      initial={{ scale: 1.08, opacity: 0.85 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={`font-display tracking-wide text-[var(--color-gold-300)] drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] ${sizeClass[size]} ${className}`}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  )
}
