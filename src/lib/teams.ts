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
  TEAM_IDS,
  type RoundResult,
  type TeamState,
} from './scoring'

function teamRef(teamId: string) {
  return ref(db, `teams/${teamId}`)
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
  const cache: Record<string, TeamState> = {}
  const unsubs = TEAM_IDS.map((teamId) =>
    subscribeTeam(teamId, (team) => {
      if (team) {
        cache[teamId] = team
      } else {
        delete cache[teamId]
      }
      onData({ ...cache })
    }),
  )
  return () => {
    for (const unsub of unsubs) unsub()
  }
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

export async function ensureAllTeams(startingScore?: number): Promise<void> {
  await Promise.all(TEAM_IDS.map((id) => ensureTeam(id, startingScore)))
}

export async function resetTeam(
  teamId: string,
  startingScore: number,
): Promise<void> {
  await set(teamRef(teamId), createInitialTeam(teamId, startingScore))
}

export async function setTeamScore(
  teamId: string,
  score: number,
): Promise<TeamState> {
  const current = await ensureTeam(teamId)
  const next: TeamState = {
    ...current,
    score,
    updatedAt: Date.now(),
  }
  await set(teamRef(teamId), next)
  return next
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
