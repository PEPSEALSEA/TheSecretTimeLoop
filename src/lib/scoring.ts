export const MULTIPLIERS = [0.5, 0.7, 0.8, 1, 1.1, 1.2, 1.3, 1.5] as const

export type Multiplier = (typeof MULTIPLIERS)[number]
export type RoundResult = 'correct' | 'wrong'

export type RoundHistoryEntry = {
  bet: number
  multiplier: number
  result: RoundResult
  delta: number
  scoreAfter: number
  choice?: string
  at: number
}

export type LastRound = {
  bet: number
  multiplier: number
  result: RoundResult
  delta: number
  choice?: string
}

export type TeamState = {
  name: string
  score: number
  startingScore: number
  updatedAt: number
  lastRound: LastRound | null
  history: RoundHistoryEntry[]
}

export const TEAM_IDS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const
export type TeamId = (typeof TEAM_IDS)[number]
export const DEFAULT_STARTING_SCORE = 2000
export const BET_OPTIONS = [100, 200, 300, 400, 500] as const
export type BetOption = (typeof BET_OPTIONS)[number]

/** Wrong: score - bet. Correct: score + (bet * multiplier) */
export function computeDelta(bet: number, multiplier: number, result: RoundResult): number {
  if (result === 'wrong') return -bet
  return bet * multiplier
}

export function applyRound(
  score: number,
  bet: number,
  multiplier: number,
  result: RoundResult,
): { nextScore: number; delta: number } {
  const delta = computeDelta(bet, multiplier, result)
  return { nextScore: score + delta, delta }
}

export function createInitialTeam(
  teamId: string,
  startingScore = DEFAULT_STARTING_SCORE,
): TeamState {
  return {
    name: `ทีม ${teamId}`,
    score: startingScore,
    startingScore,
    updatedAt: Date.now(),
    lastRound: null,
    history: [],
  }
}

export function formatScore(n: number): string {
  return Math.round(n).toLocaleString('th-TH')
}

export function formatDelta(delta: number): string {
  const rounded = Math.round(delta)
  if (rounded > 0) return `+${rounded.toLocaleString('th-TH')}`
  return rounded.toLocaleString('th-TH')
}

export function formatMultiplier(m: number): string {
  return Number.isInteger(m) ? String(m) : m.toFixed(1)
}
