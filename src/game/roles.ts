/**
 * 'village' and 'loups' are the two sides of the main conflict (see MainTeam).
 * 'neutre' roles sit outside it entirely: they never count towards either side's
 * win/loss, and instead pursue their own objective (see NeutralObjective).
 * 'solitaire' roles also sit outside the main conflict, but pursue a much harsher
 * objective: being the LAST player alive, period (see resolveGame in engine.ts).
 */
export type Team = 'village' | 'loups' | 'neutre' | 'solitaire'

/** The two sides whose head-count decides when the main conflict ends. */
export type MainTeam = 'village' | 'loups'

export type NightAction = 'choose-target' | 'none' | 'witch' | 'self-protect' | 'choose-couple'

/** What happens to the chosen target when a 'choose-target' role confirms its pick. */
export type NightEffect = 'kill' | 'none'

/**
 * Who can be picked as a target. 'exclude-own-team' keeps a role from targeting its
 * own side (wolves can't kill wolves). 'exclude-own-role' keeps it from targeting
 * itself or another holder of the same role (a seer doesn't look at another seer).
 * 'all' allows any living player.
 */
export type TargetFilter = 'exclude-own-team' | 'exclude-own-role' | 'all'

/**
 * What happens automatically when a player holding this role dies, regardless of
 * how (night kill or day vote). 'revenge-kill' pauses the game to let the MJ pick
 * one more victim before continuing.
 */
export type OnDeathEffect = 'none' | 'revenge-kill'

/** Only relevant for team 'neutre': what this role must achieve to win on its own. */
export type NeutralObjective = 'none' | 'survive' | 'couple-survives'

export interface RoleDef {
  id: string
  name: string
  icon: string
  team: Team

  /** Shown with a +/- counter on the role-setup screen. */
  configurable: boolean
  /** The role that silently receives every player not assigned to a configurable role. Exactly one role should have fill: true. */
  fill: boolean
  /** Starting count on the setup screen. Only used when configurable is true. */
  defaultCount: number
  /** Lower bound for the counter. Only used when configurable is true. */
  minCount: number

  /**
   * Position in the night wake-up order. `null` = this role never wakes at night.
   * Values are spaced (100, 200, 300, ...) so a new role can be inserted between
   * two existing ones just by picking a value in between (e.g. 150 goes between
   * 100 and 200) without renumbering anything else.
   */
  nightOrder: number | null
  /** True for a role that only wakes on the very first night (e.g. Cupidon), never again after. */
  onlyFirstNight: boolean
  nightAction: NightAction
  /**
   * Only relevant when nightAction is 'choose-target'. 'kill' removes the target
   * from the game; 'none' lets the role privately pick someone (e.g. a seer
   * checking a role) without affecting them.
   */
  nightEffect: NightEffect
  /** Only relevant when nightAction is 'choose-target'. */
  targetFilter: TargetFilter
  onDeathEffect: OnDeathEffect
  /** Only relevant for team 'neutre'. Checked once the main conflict ends. */
  neutralObjective: NeutralObjective
  /**
   * How many times, for the whole game, this role can block ANY night kill against
   * itself (wolves, a Sorcière's poison, ...). Only relevant with nightAction
   * 'self-protect': at the start of its night step, the MJ is asked whether this
   * role activates its protection for THAT night — decided blind, without knowing
   * who will be targeted, and a charge is spent the moment it's activated whether
   * or not an attack actually comes. 0 = no such power.
   */
  nightProtectionCharges: number
  /**
   * If true, this role's alive holder gets an automatic textual alert at the start
   * of every day when at least one living player belongs to a different team than
   * this role's own team (e.g. Montreur d'ours: the bear growls if a non-Village
   * player is alive). Purely a derived display — no state, no MJ action needed.
   */
  dayCampAlert: boolean
  /**
   * If true, this role's alive holder can never be killed by a 'loups'-team role's
   * night kill (the main pack kill or the Grand Méchant Loup's bonus kill) — the
   * kill simply has no effect, silently, the same way a wolf attack on a protected
   * Survivant fizzles. Only 'loups'-sourced kills are blocked: votes, poison, a
   * hunter's revenge, and a lover's heartbreak death all still work normally.
   */
  immuneToWolves: boolean
  nightPrompt?: string
  /**
   * Free-text explanation, shown as-is in the compendium. Used by most roles.
   *
   * A role that needs to call out specifics instead sets any of `objective`,
   * `power`, `immunity` — the compendium shows whichever of those are present as
   * separate labeled lines ("Objectif :" / "Pouvoir :" / "Immunité :") instead of
   * one flowing paragraph, and `description` is ignored when any of them is set.
   * - `objective`: team 'neutre' roles, which each pursue their own separate win
   *   condition worth spelling out.
   * - `power` / `immunity`: team 'solitaire' roles. They all share the same
   *   objective (be the sole survivor), so it isn't repeated per role — just the
   *   power, kept brief, and any immunity. Skip interaction specifics here (how it
   *   plays with the Sorcière, Cupidon, etc.) — the app already handles those, the
   *   MJ doesn't need to track them.
   */
  description?: string
  objective?: string
  power?: string
  immunity?: string
}

export const ROLES: RoleDef[] = [
  {
    id: 'villageois',
    name: 'Villageois',
    icon: '🧑‍🌾',
    team: 'village',
    configurable: false,
    fill: true,
    defaultCount: 0,
    minCount: 0,
    nightOrder: null,
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description: "Aucun pouvoir particulier. Doit démasquer les Loups-Garous pendant les votes.",
  },
  {
    id: 'petite-fille',
    name: 'Petite Fille',
    icon: '👧',
    team: 'village',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnelle : peut être désactivée si trop peu de joueurs
    // Pas d'étape dédiée : elle risque un œil pendant que les Loups-Garous se
    // réveillent, mais ça se joue autour de la table (le MJ veille à ce qu'elle ne
    // se fasse pas repérer) — rien à faire côté appli.
    nightOrder: null,
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description:
      "Peut risquer un œil pendant le tour des Loups-Garous pour tenter de repérer qui ils sont. Se joue autour de la table : aucun écran dédié dans l'appli.",
  },
  {
    id: 'chasseur',
    name: 'Chasseur',
    icon: '🏹',
    team: 'village',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnel : peut être désactivé si trop peu de joueurs
    nightOrder: null, // ne se réveille jamais la nuit
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'revenge-kill', // à sa mort (nuit ou vote), il emporte un joueur avec lui
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description: "À sa mort, quelle qu'en soit la cause, élimine immédiatement un autre joueur de son choix.",
  },
  {
    id: 'voyante',
    name: 'Voyante',
    icon: '🔮',
    team: 'village',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnelle : peut être désactivée si trop peu de joueurs
    nightOrder: 50, // avant les Loups-Garous (100)
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'none', // ne tue pas : le MJ voit juste le rôle de la cible
    targetFilter: 'exclude-own-role', // ne peut pas se regarder elle-même
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: 'La Voyante se réveille et désigne un joueur dont elle veut voir le rôle.',
    description: "Chaque nuit, découvre en secret le rôle d'un joueur.",
  },
  {
    id: 'loup-garou',
    name: 'Loup-Garou',
    icon: '🐺',
    team: 'loups',
    configurable: true,
    fill: false,
    defaultCount: 1, // par défaut il y en a toujours au moins un, mais ce n'est plus obligatoire (voir minCount)
    minCount: 0, // peut être descendu à 0 pour une partie sans Loup-Garou, uniquement avec l'Assassin comme menace
    nightOrder: 100,
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'kill',
    targetFilter: 'exclude-own-team', // ne peut pas tuer un autre loup
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: 'Les Loups-Garous se réveillent et désignent une victime.',
    description: 'Chaque nuit, les Loups-Garous se concertent pour éliminer un villageois.',
  },
  {
    id: 'grand-mechant-loup',
    name: 'Grand Méchant Loup',
    icon: '😈',
    team: 'loups',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnel : vient s'ajouter au(x) Loup-Garou classique(s), ne les remplace pas
    // Même nightOrder que le Loup-Garou : il se réveille avec eux et participe à la
    // même désignation de victime (voir getNightOrderHolders / le dédoublonnage par
    // nightOrder dans getNightSequence, engine.ts). Son pouvoir bonus (une seconde
    // victime, une fois débloqué) est géré à part comme une interruption dédiée —
    // voir bigBadWolfUnlocked / pendingBonusKill dans store.tsx et BigBadWolfBonus.tsx.
    nightOrder: 100,
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'kill',
    targetFilter: 'exclude-own-team',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    description:
      "Se réveille avec les autres Loups-Garous et participe normalement à leur désignation d'une victime. Dès qu'un loup meurt d'un vote du village, la nuit suivante (et toutes les suivantes), il peut en plus tuer un villageois de plus, seul.",
  },
  {
    id: 'sorciere',
    name: 'Sorcière',
    icon: '🧪',
    team: 'village',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0, // optionnelle : peut être désactivée si trop peu de joueurs
    nightOrder: 150, // après les Loups-Garous (100), pour voir leur victime
    onlyFirstNight: false,
    // Écran entièrement dédié (deux potions à usage unique par partie) : ne suit pas
    // le système générique choose-target / nightEffect, voir WitchNight.tsx et le
    // reducer (action WITCH_ACT) dans store.tsx.
    nightAction: 'witch',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: 'La Sorcière se réveille.',
    description:
      "Possède une potion de vie (sauve la victime des Loups-Garous) et une potion de mort (élimine un joueur de son choix), chacune utilisable une seule fois par partie.",
  },
  {
    id: 'survivant',
    name: 'Survivant',
    icon: '🛡️',
    team: 'neutre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: 10, // tout premier de la nuit (après Cupidon) : il choisit avant même que les Loups-Garous ne désignent une victime
    onlyFirstNight: false,
    nightAction: 'self-protect',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'survive', // gagne si en vie quand le conflit village/loups se termine
    nightProtectionCharges: 2,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: "Le Survivant se réveille et doit décider, sans savoir qui sera visé cette nuit, s'il active sa protection.",
    objective:
      "Ne compte pour la victoire ni du Village ni des Loups-Garous. Doit simplement survivre jusqu'à la fin de la partie.",
    power:
      "Au début de chaque nuit, doit deviner s'il va être visé : s'il active sa protection (deux fois par partie), rien ne peut le tuer cette nuit-là — mais la charge est dépensée même si personne ne l'attaque finalement.",
  },
  {
    id: 'cupidon',
    name: 'Cupidon',
    icon: '💘',
    team: 'neutre',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: 5, // tout premier de la nuit, avant même le Survivant — et uniquement la nuit 1
    onlyFirstNight: true,
    // Choisit DEUX joueurs (pas une seule cible) : ne suit pas le système générique
    // choose-target, voir le bloc dédié dans NightPhase.tsx et l'action CHOOSE_LOVERS
    // dans store.tsx. Le lien qu'il crée (voir GameState.loverIds) persiste ensuite
    // toute la partie, même si Cupidon meurt.
    nightAction: 'choose-couple',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'couple-survives', // gagne si le couple qu'il a formé est encore vivant à la fin, qu'il soit lui-même en vie ou non
    nightProtectionCharges: 0,
    dayCampAlert: false,
    immuneToWolves: false,
    nightPrompt: "Cupidon se réveille et désigne les deux amoureux (uniquement lors de la première nuit).",
    objective: "Gagne si le couple qu'il a formé est toujours vivant à la fin de la partie, qu'il en fasse partie ou non.",
    power:
      "Lors de la première nuit uniquement, désigne deux joueurs qui tombent amoureux (il peut se choisir lui-même). Si l'un des amoureux meurt, l'autre meurt aussitôt de chagrin. Si le couple réunit deux camps opposés (Village / Loups-Garous), les amoureux ont leur propre victoire : ils gagnent s'ils sont les deux derniers survivants, quel que soit le camp.",
  },
  {
    id: 'montreur-ours',
    name: "Montreur d'ours",
    icon: '🐻',
    team: 'village',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: null, // ne se réveille jamais : son ours réagit de jour, pas de nuit
    onlyFirstNight: false,
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    neutralObjective: 'none',
    nightProtectionCharges: 0,
    // Pas d'action à prendre, juste un indicateur affiché automatiquement en début
    // de journée (voir campAlertActive dans engine.ts et son usage dans DayPhase.tsx).
    dayCampAlert: true,
    immuneToWolves: false,
    description:
      "Au début de chaque journée, son ours grogne (indication affichée dans l'appli) si au moins un joueur vivant d'un camp différent du Village est présent — sans compter les morts.",
  },
  {
    id: 'assassin',
    name: 'Assassin',
    icon: '🗡️',
    team: 'solitaire',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 0,
    nightOrder: 120, // après la meute (100), avant la Sorcière (150) : elle doit voir les deux victimes
    onlyFirstNight: false,
    nightAction: 'choose-target',
    nightEffect: 'kill',
    targetFilter: 'exclude-own-role', // ne peut pas se cibler lui-même
    onDeathEffect: 'none',
    neutralObjective: 'none', // son objectif n'est pas géré comme les 'neutre' : voir resolveGame dans engine.ts
    nightProtectionCharges: 0,
    dayCampAlert: false,
    // Rien ne le tue la nuit venant des Loups-Garous (meute ou bonus du Grand
    // Méchant Loup) : voir isImmuneToWolfKill, utilisé par applyNightEffect et par
    // l'action RESOLVE_BONUS_KILL dans store.tsx. Vote, poison, vengeance du
    // Chasseur et chagrin d'un amoureux le tuent normalement.
    immuneToWolves: true,
    nightPrompt: "L'Assassin se réveille et désigne une victime.",
    power: 'Chaque nuit, tue un joueur de son choix.',
    immunity: 'Loups-Garous.',
  },

  // Pour ajouter un rôle, une seule entrée ici suffit dans la grande majorité des cas :
  // compteur, distribution, ordre de réveil et écran de nuit s'adaptent automatiquement.
  // Exception : un pouvoir avec un état propre (comme les potions de la Sorcière) ou
  // une mécanique qui ne se résume pas à "choisir une cible" demande un vrai écran
  // dédié en plus de l'entrée ici (nightAction: 'witch' est un exemple de ce cas).
]

export function getRole(roleId: string | undefined): RoleDef | undefined {
  return ROLES.find((r) => r.id === roleId)
}

export function getTeam(roleId: string | undefined): Team | undefined {
  return getRole(roleId)?.team
}

export const CONFIGURABLE_ROLES = ROLES.filter((r) => r.configurable)

export const FILL_ROLE = ROLES.find((r) => r.fill)

export function defaultRoleCounts(): Record<string, number> {
  return Object.fromEntries(CONFIGURABLE_ROLES.map((r) => [r.id, r.defaultCount]))
}
