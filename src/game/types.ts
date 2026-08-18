import type { Team } from './roles'
import { defaultRoleCounts } from './roles'

export interface Player {
  id: string
  name: string
  seat: number
  roleId?: string
  alive: boolean
}

export type GamePhase = 'players' | 'roles' | 'reveal' | 'night' | 'day' | 'ended'

export type DaySubPhase = 'result' | 'vote' | 'vote-result'

/** A role with onDeathEffect 'revenge-kill' just died; the MJ must pick one more victim before the game continues. */
export interface PendingRevenge {
  hunterId: string
  cause: 'night' | 'vote'
}

export interface GameState {
  phase: GamePhase
  players: Player[]
  /** roleId -> count, for configurable roles only. Remaining players get the fill role. */
  roleCounts: Record<string, number>
  round: number
  nightStepIndex: number
  daySubPhase: DaySubPhase
  /** Everyone who died last night, in the order they died (a night kill, then a hunter's revenge, etc). */
  lastNightVictimIds: string[]
  /** Everyone who died from the last vote, in order (the voted player, then a hunter's revenge). */
  lastVoteVictimIds: string[]
  pendingRevenge: PendingRevenge | null
  winner: Team | null
}

export const initialGameState: GameState = {
  phase: 'players',
  players: [],
  roleCounts: defaultRoleCounts(),
  round: 0,
  nightStepIndex: 0,
  daySubPhase: 'result',
  lastNightVictimIds: [],
  lastVoteVictimIds: [],
  pendingRevenge: null,
  winner: null,
}
