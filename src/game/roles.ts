export type Team = 'village' | 'loups'

export type NightAction = 'choose-target' | 'none'

/** What happens to the chosen target when a 'choose-target' role confirms its pick. */
export type NightEffect = 'kill' | 'none'

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
    description: "Aucun pouvoir particulier. Doit démasquer les Loups-Garous pendant les votes.",
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
    nightPrompt: 'Les Loups-Garous se réveillent et désignent une victime.',
    description: 'Chaque nuit, les Loups-Garous se concertent pour éliminer un villageois.',
  },

  // Pour ajouter un rôle, une seule entrée ici suffit dans la grande majorité des cas
  // (compteur, distribution et écran de nuit s'adaptent automatiquement). Exemple
  // désactivé d'un rôle qui se réveille avant les Loups-Garous et regarde un rôle
  // sans tuer personne :
  //
  // {
  //   id: 'voyante',
  //   name: 'Voyante',
  //   icon: '🔮',
  //   team: 'village',
  //   configurable: true,
  //   fill: false,
  //   defaultCount: 1,
  //   minCount: 1,
  //   nightOrder: 50, // avant les Loups-Garous (100)
  //   nightAction: 'choose-target',
  //   nightEffect: 'none', // ne tue pas, le MJ regarde juste le rôle de la cible
  //   nightPrompt: 'La Voyante se réveille et désigne un joueur dont elle veut voir le rôle.',
  //   description: "Chaque nuit, découvre en secret le rôle d'un joueur.",
  // },
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
