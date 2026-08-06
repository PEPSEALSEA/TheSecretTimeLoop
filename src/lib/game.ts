import {
  onValue,
  ref,
  runTransaction,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { db } from './firebase'
import { getQuestion, QUESTIONS, type ChoiceId } from './questions'
import { BET_OPTIONS, DEFAULT_STARTING_SCORE, TEAM_IDS } from './scoring'
import { applyAllTeamRoundScores, resetAllTeams } from './teams'
import { serverNow } from './timer'

export type GamePhase =
  | 'lobby'
  | 'betting'
  | 'question'
  | 'waiting'
  | 'revealVideo'
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
  'revealVideo',
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

function allTeamsScored(scoredTeams: Record<string, boolean>): boolean {
  return TEAM_IDS.every((id) => Boolean(scoredTeams[id]))
}

function fullScoredTeams(): Record<string, boolean> {
  const scoredTeams: Record<string, boolean> = {}
  for (const id of TEAM_IDS) scoredTeams[id] = true
  return scoredTeams
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

export function effectivePhase(game: GameState, now = serverNow()): GamePhase {
  if (game.phase === 'question' && game.endsAt != null && now >= game.endsAt) {
    return 'waiting'
  }
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
  await update(gameRef(), {
    phase: 'question',
    endsAt: null,
  })
}

export async function startQuestionTimer(questionIndex: number): Promise<void> {
  const q = getQuestion(questionIndex)
  if (!q) return
  await update(gameRef(), {
    phase: 'question',
    endsAt: serverNow() + q.durationSec * 1000,
  })
}

export async function lockQuestion(): Promise<void> {
  await update(gameRef(), { phase: 'waiting', endsAt: serverNow() })
}

export async function lockExpiredQuestion(now = serverNow()): Promise<boolean> {
  const result = await runTransaction(gameRef(), (raw) => {
    if (raw == null) return raw
    const game = normalizeGame(raw)
    if (game.phase !== 'question' || game.endsAt == null || now < game.endsAt) {
      return
    }
    return {
      ...raw,
      phase: 'waiting' as GamePhase,
    }
  })
  return result.committed
}

export async function showReveal(): Promise<void> {
  let applyScores = false
  let teamBets: Record<string, number> = {}
  let teamChoices: Record<string, ChoiceId> = {}
  let questionIndex = 0

  const result = await runTransaction(gameRef(), (raw) => {
    applyScores = false
    teamBets = {}
    teamChoices = {}
    questionIndex = 0

    if (raw == null) return raw
    const game = normalizeGame(raw)

    if (
      game.phase === 'reveal' ||
      game.phase === 'revealVideo' ||
      game.phase === 'scores' ||
      game.phase === 'finished'
    ) {
      return
    }

    const question = getQuestion(game.questionIndex)
    const phase: GamePhase = question?.answerVideo ? 'revealVideo' : 'reveal'
    const alreadyScored = allTeamsScored(game.scoredTeams)

    if (!alreadyScored) {
      applyScores = true
      teamBets = game.teamBets
      teamChoices = game.teamChoices
      questionIndex = game.questionIndex
    }

    return {
      ...raw,
      phase,
      endsAt: null,
      scoredTeams: fullScoredTeams(),
    }
  })

  if (!result.committed || !applyScores) return

  const question = getQuestion(questionIndex)
  if (question) {
    await applyAllTeamRoundScores(teamBets, teamChoices, question)
  }
}

export async function showRevealText(): Promise<void> {
  await update(gameRef(), { phase: 'reveal', endsAt: null })
}

export async function showScores(): Promise<void> {
  await update(gameRef(), { phase: 'scores', scoredTeams: fullScoredTeams() })
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

export async function jumpToQuestion(questionIndex: number): Promise<void> {
  const q = getQuestion(questionIndex)
  if (!q) {
    throw new Error('ไม่พบข้อที่เลือก')
  }
  await set(gameRef(), freshRound('betting', questionIndex))
}

export async function resetGame(): Promise<void> {
  await set(gameRef(), { ...DEFAULT_GAME })
}

export async function resetAll(): Promise<void> {
  await Promise.all([
    set(gameRef(), { ...DEFAULT_GAME }),
    resetAllTeams(DEFAULT_STARTING_SCORE),
  ])
}

export function questionProgressLabel(index: number): string {
  return `ข้อ ${index + 1}/${QUESTIONS.length}`
}

export function nextQuestionLabel(currentIndex: number): string {
  const next = currentIndex + 1
  if (next >= QUESTIONS.length) return `จบเกม (ครบ ${QUESTIONS.length} ข้อ)`
  return `ข้อต่อไป (${next + 1}/${QUESTIONS.length})`
}
