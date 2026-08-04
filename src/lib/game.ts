import { onValue, ref, set, update, type Unsubscribe } from 'firebase/database'
import { db } from './firebase'
import { getQuestion, QUESTIONS, type ChoiceId } from './questions'
import { BET_OPTIONS, TEAM_IDS } from './scoring'

export type GamePhase =
  | 'lobby'
  | 'betting'
  | 'question'
  | 'waiting'
  | 'reveal'
  | 'scores'
  | 'finished'

export type GameState = {
  phase: GamePhase
  questionIndex: number
  endsAt: number | null
  scoredTeams: Record<string, boolean>
  teamChoices: Record<string, ChoiceId>
  teamBets: Record<string, number>
}

export const DEFAULT_GAME: GameState = {
  phase: 'lobby',
  questionIndex: 0,
  endsAt: null,
  scoredTeams: {},
  teamChoices: {},
  teamBets: {},
}

const CHOICE_IDS: ChoiceId[] = ['ก', 'ข', 'ค', 'ง']
const BET_SET = new Set<number>(BET_OPTIONS)

function gameRef() {
  return ref(db, 'game')
}

function normalizeChoice(raw: unknown): ChoiceId | null {
  if (typeof raw !== 'string') return null
  return CHOICE_IDS.includes(raw as ChoiceId) ? (raw as ChoiceId) : null
}

function normalizeChoices(raw: unknown): Record<string, ChoiceId> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, ChoiceId> = {}
  for (const [teamId, value] of Object.entries(raw as Record<string, unknown>)) {
    const choice = normalizeChoice(value)
    if (choice) out[teamId] = choice
  }
  return out
}

function normalizeBet(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  const n = Math.round(raw)
  return BET_SET.has(n) ? n : null
}

function normalizeBets(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [teamId, value] of Object.entries(raw as Record<string, unknown>)) {
    const bet = normalizeBet(value)
    if (bet != null) out[teamId] = bet
  }
  return out
}

const PHASES: GamePhase[] = [
  'lobby',
  'betting',
  'question',
  'waiting',
  'reveal',
  'scores',
  'finished',
]

function normalizePhase(raw: unknown): GamePhase {
  if (typeof raw === 'string' && PHASES.includes(raw as GamePhase)) {
    return raw as GamePhase
  }
  return 'lobby'
}

function normalizeGame(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_GAME }
  const data = raw as Partial<GameState>
  const maxIndex = Math.max(0, QUESTIONS.length - 1)
  const rawIndex = typeof data.questionIndex === 'number' ? data.questionIndex : 0
  return {
    phase: normalizePhase(data.phase),
    questionIndex: Math.min(maxIndex, Math.max(0, rawIndex)),
    endsAt: typeof data.endsAt === 'number' ? data.endsAt : null,
    scoredTeams:
      data.scoredTeams && typeof data.scoredTeams === 'object' ? data.scoredTeams : {},
    teamChoices: normalizeChoices(data.teamChoices),
    teamBets: normalizeBets(data.teamBets),
  }
}

export function answeredCount(game: GameState): number {
  return TEAM_IDS.filter((id) => Boolean(game.teamChoices[id])).length
}

export function betCount(game: GameState): number {
  return TEAM_IDS.filter((id) => game.teamBets[id] != null).length
}

export async function markTeamChoice(teamId: string, choice: ChoiceId): Promise<void> {
  await update(gameRef(), { [`teamChoices/${teamId}`]: choice })
}

export async function markTeamBet(teamId: string, bet: number): Promise<void> {
  if (!BET_SET.has(bet)) {
    throw new Error('เดิมพันต้องเป็น 100–500')
  }
  await update(gameRef(), { [`teamBets/${teamId}`]: bet })
}

export function subscribeGame(onData: (game: GameState) => void): Unsubscribe {
  return onValue(gameRef(), (snap) => {
    onData(snap.exists() ? normalizeGame(snap.val()) : { ...DEFAULT_GAME })
  })
}

export function scoredCount(game: GameState): number {
  return TEAM_IDS.filter((id) => game.scoredTeams[id]).length
}

export function effectivePhase(game: GameState): GamePhase {
  return game.phase
}

function freshRound(phase: GamePhase, questionIndex: number): GameState {
  return {
    phase,
    questionIndex,
    endsAt: null,
    scoredTeams: {},
    teamChoices: {},
    teamBets: {},
  }
}

export async function startGame(): Promise<void> {
  const q = getQuestion(0)
  if (!q) {
    await set(gameRef(), { ...DEFAULT_GAME, phase: 'finished' })
    return
  }
  await set(gameRef(), freshRound('betting', 0))
}

export async function openQuestion(): Promise<void> {
  await update(gameRef(), { phase: 'question', endsAt: null })
}

export async function lockQuestion(): Promise<void> {
  await update(gameRef(), { phase: 'waiting', endsAt: null })
}

export async function showReveal(): Promise<void> {
  await update(gameRef(), { phase: 'reveal', endsAt: null })
}

export async function showScores(): Promise<void> {
  await update(gameRef(), { phase: 'scores', scoredTeams: {} })
}

export async function markTeamScored(teamId: string): Promise<void> {
  await update(gameRef(), { [`scoredTeams/${teamId}`]: true })
}

export async function nextQuestion(currentIndex: number): Promise<void> {
  const next = currentIndex + 1
  const q = getQuestion(next)
  if (!q) {
    await set(gameRef(), {
      phase: 'finished',
      questionIndex: currentIndex,
      endsAt: null,
      scoredTeams: {},
      teamChoices: {},
      teamBets: {},
    } satisfies GameState)
    return
  }
  await set(gameRef(), freshRound('betting', next))
}

export async function resetGame(): Promise<void> {
  await set(gameRef(), { ...DEFAULT_GAME })
}

export function questionProgressLabel(index: number): string {
  return `ข้อ ${index + 1}/${QUESTIONS.length}`
}

export function nextQuestionLabel(currentIndex: number): string {
  const next = currentIndex + 1
  if (next >= QUESTIONS.length) return `จบเกม (ครบ ${QUESTIONS.length} ข้อ)`
  return `ข้อต่อไป (${next + 1}/${QUESTIONS.length})`
}
