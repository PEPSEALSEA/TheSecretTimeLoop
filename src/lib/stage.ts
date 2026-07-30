import { useEffect, useState } from 'react'

const STAGE_W = 1920
const STAGE_H = 1080

export function useStageScale(width = STAGE_W, height = STAGE_H): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / width, window.innerHeight / height))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [width, height])

  return scale
}

export { STAGE_W, STAGE_H }
