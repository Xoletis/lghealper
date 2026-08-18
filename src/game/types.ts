import type { Team } from './roles'

export interface Player {
  id: string
  name: string
  seat: number
  roleId?: string
  alive: boolean
}

export type GamePhase = 'players' | 'roles' | 'reveal' | 'night' | 'day' | 'ended'

export type DaySubPhase = 'result' | 'vote' | 'vote-result'

export interface GameState {
  phase: GamePhase
  players: Player[]
  wolvesCount: number
  round: number
  nightStepIndex: number
  daySubPhase: DaySubPhase
  lastNightVictimId: string | null
  lastVoteVictimId: string | null
  winner: Team | null
}

export const initialGameState: GameState = {
  phase: 'players',
  players: [],
  wolvesCount: 1,
  round: 0,
  nightStepIndex: 0,
  daySubPhase: 'result',
  lastNightVictimId: null,
  lastVoteVictimId: null,
  winner: null,
}
