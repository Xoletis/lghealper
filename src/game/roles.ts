export type Team = 'village' | 'loups'

export type NightAction = 'choose-target' | 'none'

export interface RoleDef {
  id: string
  name: string
  team: Team
  /**
   * Position in the night wake-up order. `null` = this role never wakes at night.
   * Values are spaced (100, 200, 300, ...) so a new role can be inserted between
   * two existing ones just by picking a value in between (e.g. 150 goes between
   * 100 and 200) without renumbering anything else.
   */
  nightOrder: number | null
  nightAction: NightAction
  nightPrompt?: string
  description: string
}

export const ROLES: RoleDef[] = [
  {
    id: 'villageois',
    name: 'Villageois',
    team: 'village',
    nightOrder: null,
    nightAction: 'none',
    description: "Aucun pouvoir particulier. Doit démasquer les Loups-Garous pendant les votes.",
  },
  {
    id: 'loup-garou',
    name: 'Loup-Garou',
    team: 'loups',
    nightOrder: 100,
    nightAction: 'choose-target',
    nightPrompt: 'Les Loups-Garous se réveillent et désignent une victime.',
    description: 'Chaque nuit, les Loups-Garous se concertent pour éliminer un villageois.',
  },
]

export function getRole(roleId: string | undefined): RoleDef | undefined {
  return ROLES.find((r) => r.id === roleId)
}

export function getTeam(roleId: string | undefined): Team | undefined {
  return getRole(roleId)?.team
}
