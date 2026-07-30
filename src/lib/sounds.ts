import { Howl } from 'howler'
import type { RoundResult } from './scoring'

function toneDataUri(freq: number, durationMs: number, type: 'sine' | 'square' = 'sine'): string {
  const sampleRate = 22050
  const samples = Math.floor((sampleRate * durationMs) / 1000)
  const data = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(data)

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples * 2, true)

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const env = Math.min(1, i / 200) * Math.min(1, (samples - i) / 800)
    const wave =
      type === 'square'
        ? Math.sign(Math.sin(2 * Math.PI * freq * t))
        : Math.sin(2 * Math.PI * freq * t)
    view.setInt16(44 + i * 2, Math.floor(wave * env * 0.35 * 32767), true)
  }

  const bytes = new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return `data:audio/wav;base64,${btoa(binary)}`
}

const correctHigh = new Howl({ src: [toneDataUri(659.25, 220)], volume: 0.5 })
const correctLow = new Howl({ src: [toneDataUri(523.25, 180)], volume: 0.5 })
const wrongHowl = new Howl({ src: [toneDataUri(220, 280, 'square')], volume: 0.4 })
const boardLow = new Howl({ src: [toneDataUri(784, 110)], volume: 0.38 })
const boardHigh = new Howl({ src: [toneDataUri(988, 140)], volume: 0.38 })
const boardFanfare = new Howl({ src: [toneDataUri(1174.66, 180)], volume: 0.32 })

let unlocked = false

export function unlockAudio(): void {
  if (unlocked) return
  unlocked = true
  correctLow.mute(true)
  correctLow.play()
  correctLow.stop()
  correctLow.mute(false)
}

export function playRoundSound(result: RoundResult): void {
  unlockAudio()
  if (result === 'correct') {
    correctLow.play()
    window.setTimeout(() => correctHigh.play(), 140)
  } else {
    wrongHowl.play()
  }
}

/** Short chime when the scoreboard receives a live score update. */
export function playScoreboardUpdateSound(): void {
  unlockAudio()
  boardLow.play()
  window.setTimeout(() => boardHigh.play(), 80)
}

/** Slightly richer chime when leaderboard order changes on the all-teams board. */
export function playLeaderboardChangeSound(): void {
  unlockAudio()
  boardLow.play()
  window.setTimeout(() => boardHigh.play(), 70)
  window.setTimeout(() => boardFanfare.play(), 150)
}
