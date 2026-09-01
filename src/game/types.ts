import type { Aura, MainTeam } from './roles'
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
  /** Whether this self-protect holder has already been asked tonight (yes or no) — lets several simultaneous holders (e.g. two Survivant-role players) each get their own prompt instead of only the first being asked. Reset alongside protectionArmed at the start of every night. */
  protectionDecided?: boolean
  /** Set once, permanently, when a role locks in a fixed aura regardless of what it later becomes: the Chien-Loup ('neutre', once he picks an identity) and the Enfant Sauvage ('claire', for life, even once he turns into a real Loup-Garou). Overrides the role's own aura wherever a player's aura is looked up. */
  forcedAura?: Aura
  /** Enfant Sauvage only: the other player randomly assigned as their role model at role distribution, revealed alongside their own role. If this player dies, the Enfant Sauvage becomes a Loup-Garou (see transformWildChildren in engine.ts). */
  wildChildModelId?: string
  /** Set when the Père Infect infects this player: they now count as this team for every win/target/headcount purpose (see roleTeamOf in engine.ts), while keeping their own roleId — same powers, same aura, invisible to the Voyante. */
  infectedTeam?: MainTeam
  /** Père Infect only: whether he's already spent his one-per-game infection. */
  hasInfected?: boolean
  /** Ancien only: starts at 2. Each night kill against him while this is above 0 is silently absorbed — he's revived and quietly dropped from that night's victim list, so nothing ever shows he was targeted — and this ticks down by one (see startDeathTriggers in store.tsx). Once it hits 0, a night kill finally takes normally. */
  elderLivesRemaining?: number
  /** Renard only: set permanently the first time his night check comes back empty (nobody hostile in the targeted cluster) — from then on he never gets another turn (see NightPhase.tsx and SELECT_NIGHT_TARGET in store.tsx). */
  hasLostFoxPower?: boolean
  /** Set permanently once the Joueur de Flûte charms this player. Never cleared. */
  charmed?: boolean
  /** Garde only: who he's currently protecting (updated every night he acts, never reset between nights) — the target is immune to any night kill that night, and excluded from tomorrow's choice since he can't protect the same person two nights running. */
  guardProtectedId?: string
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
 * soloWin is true when a 'solitaire' role (the Assassin, the Loup Blanc) ended the
 * game as the last one left among non-neutral players — takes priority over
 * everything else, same reasoning; the winning role's own name/icon is what tells
 * the EndScreen which solitaire it was, not a separate flag per role. angeWin is
 * true when the Ange was eliminated during round 1 — the single highest-priority
 * result, since it ends the game outright the instant it happens. flutistWin is
 * true when the Joueur de Flûte has charmed every living player but himself —
 * checked the instant it becomes true, night or day, since nothing can ever undo a
 * charm the way a kill can be healed.
 */
export interface GameResult {
  team: MainTeam
  neutralWinnerIds: string[]
  loversWin: boolean
  loverWinnerIds: string[]
  soloWin: boolean
  soloWinnerId: string | null
  angeWin: boolean
  angeWinnerId: string | null
  flutistWin: boolean
  flutistWinnerId: string | null
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
  /** The wolves' joint kill just resolved, it's an even round, and the Loup Blanc still needs to pick (or skip) his periodic solo victim before the night can continue. */
  pendingWhiteWolfKill: boolean
  /** The wolves' joint kill just resolved with a victim, and the (not-yet-spent) Père Infect still needs to decide whether to infect them before the night can continue. */
  pendingInfection: boolean
  /** victimId -> ids of every player considered responsible for that night's kill (all of a group kill's members, e.g. the wolf pack; a single id for a solo actor). Only set for an actual night kill — never a day vote, never a lover's heartbreak death. Powers the Sœurs' vision and the Vieux Chevalier's revenge. Reset at the start of every night. */
  nightKillerIds: Record<string, string[]>
  /** Set at dawn when exactly one Sœur died this night from an attributable kill and her sister is still alive. Shown as a reveal screen at the very start of the next night, before the normal sequence, then cleared. */
  pendingSistersVision: { survivorId: string; killerName: string } | null
  /** Set for the rest of the current day's vote-result screen when the village just voted out the Ancien: his role is revealed there, but he was never actually killed (see CAST_VOTE in store.tsx) — he's not in lastVoteVictimIds at all, so no cascade or revenge ever sees this as a death. Reset at the start of every night. */
  revealedElderId: string | null
  /** Corbeau only: who he designated tonight (or null if he chose to give no votes) — shown as a reminder for the rest of the day, since that player starts the day's vote with two votes already against them. Reset at the start of every night. */
  corbeauTargetId: string | null
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
  pendingWhiteWolfKill: false,
  pendingInfection: false,
  nightKillerIds: {},
  pendingSistersVision: null,
  revealedElderId: null,
  corbeauTargetId: null,
  winner: null,
}
