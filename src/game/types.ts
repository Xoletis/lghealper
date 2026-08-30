import type { MainTeam } from './roles'
import { defaultRoleCounts } from './roles'

export interface Player {
  id: string
  name: string
  seat: number
  roleId?: string
  alive: boolean
  /** Sorcière only: whether she can still use her life/death potion this game. */
  hasHealPotion?: boolean
  hasPoisonPotion?: boolean
  /** Remaining times this player can block a night kill against themselves (e.g. Survivant). */
  protectionCharges?: number
  /** Whether this player committed to blocking a night kill against themselves THIS night — decided blind at the start of the night, before knowing who's targeted. Consumes a charge as soon as it's set, win or lose. */
  protectionArmed?: boolean
}

export type GamePhase = 'players' | 'roles' | 'reveal' | 'night' | 'day' | 'ended'

export type DaySubPhase = 'result' | 'vote' | 'vote-result'

/** A role with onDeathEffect 'revenge-kill' just died; the MJ must pick one more victim before the game continues. */
export interface PendingRevenge {
  hunterId: string
  cause: 'night' | 'vote'
}

/**
 * village/loups is the main conflict's winner; neutralWinnerIds are whoever separately
 * met their own objective. loversWin is true only when Cupidon's couple spanned two
 * opposing camps and ended up the last two standing — their own private victory,
 * which takes priority over the village/loups result in the UI (see EndScreen).
 * assassinWin is true when a 'solitaire' role (the Assassin) ended the game as the
 * sole survivor — takes priority over everything else, same reasoning.
 */
export interface GameResult {
  team: MainTeam
  neutralWinnerIds: string[]
  loversWin: boolean
  loverWinnerIds: string[]
  assassinWin: boolean
  assassinWinnerId: string | null
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
  /** Who the Loups-Garous chose this night, so the Sorcière can decide whether to save them. */
  wolfVictimId: string | null
  /** Who the Assassin chose this night — the Sorcière can only save them instead of the wolves' victim in a game with no Loup-Garou role at all (see hasWolfRole in engine.ts). */
  assassinVictimId: string | null
  pendingRevenge: PendingRevenge | null
  /** Other deaths from this same night still waiting to be checked for a revenge trigger, once pendingRevenge clears. */
  revengeQueue: string[]
  /** The two players Cupidon linked (night 1 only). Empty until then, persists for the whole game after. */
  loverIds: string[]
  /** True once a Loup-Garou-team player has been eliminated by a village vote — unlocks the Grand Méchant Loup's bonus kill, for the rest of the game. */
  bigBadWolfUnlocked: boolean
  /** The wolves' joint kill just resolved and the Grand Méchant Loup still needs to pick (or skip) his bonus victim before the night can continue. */
  pendingBonusKill: boolean
  winner: GameResult | null
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
  wolfVictimId: null,
  assassinVictimId: null,
  pendingRevenge: null,
  revengeQueue: [],
  loverIds: [],
  bigBadWolfUnlocked: false,
  pendingBonusKill: false,
  winner: null,
}
