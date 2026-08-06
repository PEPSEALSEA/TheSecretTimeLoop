import { useEffect, useRef } from 'react'

const activeVideos = new Set<HTMLVideoElement>()

export function stopAllAnswerVideos(): void {
  for (const el of activeVideos) {
    el.pause()
    el.removeAttribute('src')
    el.load()
  }
  activeVideos.clear()
}

type Props = {
  src: string
  className?: string
}

export function AnswerVideo({ src, className = '' }: Props) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let cancelled = false
    let bootstrapped = false
    activeVideos.add(el)

    const tryPlay = (fromStart: boolean) => {
      if (cancelled) return
      el.muted = true
      el.defaultMuted = true
      if (fromStart) {
        try {
          el.currentTime = 0
        } catch {
          /* ignore seek before metadata */
        }
      }
      if (!el.paused && !el.ended) return
      const playAttempt = el.play()
      if (playAttempt) {
        void playAttempt.catch(() => {})
      }
    }

    const onReady = () => {
      if (bootstrapped || cancelled) return
      bootstrapped = true
      tryPlay(true)
    }

    const onPointer = () => {
      if (cancelled || !el.paused) return
      tryPlay(false)
    }

    el.muted = true
    el.defaultMuted = true
    el.loop = true
    el.playsInline = true
    el.preload = 'auto'
    el.src = src
    el.load()

    el.addEventListener('canplay', onReady)
    el.addEventListener('loadeddata', onReady)
    document.addEventListener('pointerdown', onPointer)

    return () => {
      cancelled = true
      el.removeEventListener('canplay', onReady)
      el.removeEventListener('loadeddata', onReady)
      document.removeEventListener('pointerdown', onPointer)
      activeVideos.delete(el)
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
  }, [src])

  return (
    <video
      ref={ref}
      className={className}
      controls
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  )
}
