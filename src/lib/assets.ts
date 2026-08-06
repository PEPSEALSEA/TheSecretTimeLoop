export const LEADERBOARD_IMAGE_FILES = [
  'bg.jpg',
  'title-scroll.png',
  'round-scroll.png',
  'team-card.png',
  'content-card.png',
  'status-board.png',
] as const

export const QUESTION_IMAGE_FILES = [
  'q2-donut.png',
  'q3-states.png',
  'q5-magnus.png',
  'q6-inertia.png',
  'q7-wifi.png',
  'q8-sky.png',
  'q11-doppler.png',
  'q13-candles.png',
  'q15-voice.png',
  'q18-anc.png',
  'q18-anc-answer.png',
] as const

export const QUESTION_VIDEO_FILES = [
  'q10-balloon.mp4',
  'q13-candles-answer.mp4',
] as const

export function leaderboardAsset(file: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}ui/leaderboard/${file}`
}

export function questionImageAsset(file: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}ui/questions/${file}`
}

export function questionVideoAsset(file: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}ui/questions/${file}`
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(() => resolve()).catch(() => resolve())
        return
      }
      resolve()
    }
    img.onerror = () => resolve()
    img.src = src
  })
}

function preloadVideo(src: string): Promise<void> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.oncanplaythrough = null
      video.onerror = null
      video.removeAttribute('src')
      video.load()
      resolve()
    }
    const timer = window.setTimeout(done, 45000)
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.oncanplaythrough = () => done()
    video.onerror = () => done()
    video.src = src
  })
}

let preloadPromise: Promise<void> | null = null

export function preloadLeaderboardAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (preloadPromise) return preloadPromise

  const imageUrls = [
    ...LEADERBOARD_IMAGE_FILES.map((file) => leaderboardAsset(file)),
    ...QUESTION_IMAGE_FILES.map((file) => questionImageAsset(file)),
  ]
  const videoUrls = QUESTION_VIDEO_FILES.map((file) => questionVideoAsset(file))
  const total = imageUrls.length + videoUrls.length
  let loaded = 0

  const tick = async (work: Promise<void>) => {
    await work
    loaded += 1
    onProgress?.(loaded, total)
  }

  preloadPromise = Promise.all([
    ...imageUrls.map((url) => tick(preloadImage(url))),
    ...videoUrls.map((url) => tick(preloadVideo(url))),
  ]).then(async () => {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready
    }
  })

  return preloadPromise
}
