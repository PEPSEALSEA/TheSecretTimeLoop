import {
  get,
  onValue,
  ref,
  set,
  type Unsubscribe,
} from 'firebase/database'
import { db } from './firebase'
import {
  applyRound,
  createInitialTeam,
  type RoundResult,
  type TeamState,
} from './scoring'

function teamRef(teamId: string) {
  return ref(db, `teams/${teamId}`)
}

function teamsRootRef() {
  return ref(db, 'teams')
}

export function subscribeTeam(
  teamId: string,
  onData: (team: TeamState | null) => void,
): Unsubscribe {
  return onValue(teamRef(teamId), (snap) => {
    onData(snap.exists() ? (snap.val() as TeamState) : null)
  })
}

export function subscribeAllTeams(
  onData: (teams: Record<string, TeamState>) => void,
): Unsubscribe {
  return onValue(teamsRootRef(), (snap) => {
    onData(snap.exists() ? (snap.val() as Record<string, TeamState>) : {})
  })
}

export async function ensureTeam(
  teamId: string,
  startingScore?: number,
): Promise<TeamState> {
  const snap = await get(teamRef(teamId))
  if (snap.exists()) return snap.val() as TeamState
  const initial = createInitialTeam(teamId, startingScore)
  await set(teamRef(teamId), initial)
  return initial
}

export async function resetTeam(
  teamId: string,
  startingScore: number,
): Promise<void> {
  await set(teamRef(teamId), createInitialTeam(teamId, startingScore))
}

export async function submitRound(
  teamId: string,
  bet: number,
  multiplier: number,
  result: RoundResult,
): Promise<TeamState> {
  const current = await ensureTeam(teamId)
  const { nextScore, delta } = applyRound(current.score, bet, multiplier, result)
  const at = Date.now()
  const historyEntry = {
    bet,
    multiplier,
    result,
    delta,
    scoreAfter: nextScore,
    at,
  }
  const next: TeamState = {
    ...current,
    score: nextScore,
    updatedAt: at,
    lastRound: { bet, multiplier, result, delta },
    history: [...(current.history ?? []), historyEntry],
  }
  await set(teamRef(teamId), next)
  return next
}
