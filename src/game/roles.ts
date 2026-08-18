export type Team = 'village' | 'loups'

export type NightAction = 'choose-target' | 'none' | 'witch'

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
  nightPrompt?: string
  description: string
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
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    description: "Aucun pouvoir particulier. Doit démasquer les Loups-Garous pendant les votes.",
  },
  {
    id: 'chasseur',
    name: 'Chasseur',
    icon: '🏹',
    team: 'village',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 1,
    nightOrder: null, // ne se réveille jamais la nuit
    nightAction: 'none',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'revenge-kill', // à sa mort (nuit ou vote), il emporte un joueur avec lui
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
    minCount: 1,
    nightOrder: 50, // avant les Loups-Garous (100)
    nightAction: 'choose-target',
    nightEffect: 'none', // ne tue pas : le MJ voit juste le rôle de la cible
    targetFilter: 'exclude-own-role', // ne peut pas se regarder elle-même
    onDeathEffect: 'none',
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
    defaultCount: 1,
    minCount: 1,
    nightOrder: 100,
    nightAction: 'choose-target',
    nightEffect: 'kill',
    targetFilter: 'exclude-own-team', // ne peut pas tuer un autre loup
    onDeathEffect: 'none',
    nightPrompt: 'Les Loups-Garous se réveillent et désignent une victime.',
    description: 'Chaque nuit, les Loups-Garous se concertent pour éliminer un villageois.',
  },
  {
    id: 'sorciere',
    name: 'Sorcière',
    icon: '🧪',
    team: 'village',
    configurable: true,
    fill: false,
    defaultCount: 1,
    minCount: 1,
    nightOrder: 150, // après les Loups-Garous (100), pour voir leur victime
    // Écran entièrement dédié (deux potions à usage unique par partie) : ne suit pas
    // le système générique choose-target / nightEffect, voir WitchNight.tsx et le
    // reducer (action WITCH_ACT) dans store.tsx.
    nightAction: 'witch',
    nightEffect: 'none',
    targetFilter: 'all',
    onDeathEffect: 'none',
    nightPrompt: 'La Sorcière se réveille.',
    description:
      "Possède une potion de vie (sauve la victime des Loups-Garous) et une potion de mort (élimine un joueur de son choix), chacune utilisable une seule fois par partie.",
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
