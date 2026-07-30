export const LEADERBOARD_IMAGE_FILES = [
  'bg.jpg',
  'title-scroll.png',
  'round-scroll.png',
  'team-card.png',
] as const

export function leaderboardAsset(file: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}ui/leaderboard/${file}`
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

let preloadPromise: Promise<void> | null = null

export function preloadLeaderboardAssets(
  onProgress?: (loaded: number, total: number) => void,
): Promise<void> {
  if (preloadPromise) return preloadPromise

  const urls = LEADERBOARD_IMAGE_FILES.map((file) => leaderboardAsset(file))
  let loaded = 0

  preloadPromise = Promise.all(
    urls.map(async (url) => {
      await preloadImage(url)
      loaded += 1
      onProgress?.(loaded, urls.length)
    }),
  ).then(async () => {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready
    }
  })

  return preloadPromise
}
