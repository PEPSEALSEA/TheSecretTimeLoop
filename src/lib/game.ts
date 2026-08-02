import { onValue, ref, set, update, type Unsubscribe } from 'firebase/database'
import { db } from './firebase'
import { getQuestion, QUESTIONS, type ChoiceId } from './questions'
import { TEAM_IDS } from './scoring'

export type GamePhase = 'lobby' | 'question' | 'waiting' | 'reveal' | 'scores' | 'finished'

export type GameState = {
  phase: GamePhase
  questionIndex: number
  endsAt: number | null
  scoredTeams: Record<string, boolean>
  teamChoices: Record<string, ChoiceId>
}

export const DEFAULT_GAME: GameState = {
  phase: 'lobby',
  questionIndex: 0,
  endsAt: null,
  scoredTeams: {},
  teamChoices: {},
}

const CHOICE_IDS: ChoiceId[] = ['ก', 'ข', 'ค', 'ง']

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

function normalizeGame(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_GAME }
  const data = raw as Partial<GameState>
  return {
    phase: data.phase ?? 'lobby',
    questionIndex: typeof data.questionIndex === 'number' ? data.questionIndex : 0,
    endsAt: typeof data.endsAt === 'number' ? data.endsAt : null,
    scoredTeams:
      data.scoredTeams && typeof data.scoredTeams === 'object' ? data.scoredTeams : {},
    teamChoices: normalizeChoices(data.teamChoices),
  }
}

export function answeredCount(game: GameState): number {
  return TEAM_IDS.filter((id) => Boolean(game.teamChoices[id])).length
}

export async function markTeamChoice(teamId: string, choice: ChoiceId): Promise<void> {
  await update(gameRef(), { [`teamChoices/${teamId}`]: choice })
}

export function subscribeGame(onData: (game: GameState) => void): Unsubscribe {
  return onValue(gameRef(), (snap) => {
    onData(snap.exists() ? normalizeGame(snap.val()) : { ...DEFAULT_GAME })
  })
}

export function scoredCount(game: GameState): number {
  return TEAM_IDS.filter((id) => game.scoredTeams[id]).length
}

export function effectivePhase(game: GameState, now = Date.now()): GamePhase {
  if (game.phase === 'question' && game.endsAt != null && now >= game.endsAt) {
    return 'waiting'
  }
  return game.phase
}

export async function startGame(): Promise<void> {
  const q = getQuestion(0)
  if (!q) {
    await set(gameRef(), { ...DEFAULT_GAME, phase: 'finished' })
    return
  }
  await set(gameRef(), {
    phase: 'question',
    questionIndex: 0,
    endsAt: Date.now() + q.durationSec * 1000,
    scoredTeams: {},
    teamChoices: {},
  } satisfies GameState)
}

export async function lockQuestion(): Promise<void> {
  await update(gameRef(), { phase: 'waiting', endsAt: Date.now() })
}

export async function showReveal(): Promise<void> {
  await update(gameRef(), { phase: 'reveal' })
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
    } satisfies GameState)
    return
  }
  await set(gameRef(), {
    phase: 'question',
    questionIndex: next,
    endsAt: Date.now() + q.durationSec * 1000,
    scoredTeams: {},
    teamChoices: {},
  } satisfies GameState)
}

export async function resetGame(): Promise<void> {
  await set(gameRef(), { ...DEFAULT_GAME })
}

export function questionProgressLabel(index: number): string {
  return `ข้อ ${index + 1}/${QUESTIONS.length}`
}
