import NumberFlow from '@number-flow/react'
import { motion } from 'framer-motion'

type Props = {
  score: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  flash?: boolean
}

const sizeClass = {
  sm: 'text-3xl md:text-4xl',
  md: 'text-5xl',
  lg: 'text-6xl md:text-7xl',
  xl: 'text-[clamp(3.5rem,12vw,8.5rem)]',
} as const

export function AnimatedScore({ score, size = 'lg', className = '', flash }: Props) {
  return (
    <motion.span
      animate={flash ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`font-score inline-flex items-baseline text-[var(--color-ocean-deep)] drop-shadow-[0_2px_0_rgba(255,255,255,0.75)] ${sizeClass[size]} ${className}`}
    >
      <NumberFlow
        value={Math.round(score)}
        locales="th-TH"
        transformTiming={{ duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        spinTiming={{ duration: 650, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        opacityTiming={{ duration: 280, easing: 'ease-out' }}
      />
    </motion.span>
  )
}
