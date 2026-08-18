import { ROLES, type RoleDef, type Team } from './roles'
import type { Player } from './types'

/** Roles that wake at night, in order, restricted to ones with a living player. */
export function getNightSequence(players: Player[]): RoleDef[] {
  const aliveRoleIds = new Set(players.filter((p) => p.alive).map((p) => p.roleId))
  return ROLES.filter((r) => r.nightOrder !== null && aliveRoleIds.has(r.id)).sort(
    (a, b) => (a.nightOrder as number) - (b.nightOrder as number),
  )
}

/** Valid targets for a night-action role: alive players not on that role's own team. */
export function getNightTargets(players: Player[], role: RoleDef): Player[] {
  return players.filter((p) => p.alive && roleTeamOf(p) !== role.team)
}

function roleTeamOf(p: Player): Team | undefined {
  return ROLES.find((r) => r.id === p.roleId)?.team
}

export function checkWinner(players: Player[]): Team | null {
  const alive = players.filter((p) => p.alive)
  const aliveWolves = alive.filter((p) => roleTeamOf(p) === 'loups').length
  const aliveVillage = alive.length - aliveWolves
  if (alive.length === 0) return null
  if (aliveWolves === 0) return 'village'
  if (aliveWolves >= aliveVillage) return 'loups'
  return null
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function assignRoles(players: Player[], wolvesCount: number): Player[] {
  const roleIds = [
    ...Array(wolvesCount).fill('loup-garou'),
    ...Array(players.length - wolvesCount).fill('villageois'),
  ]
  const shuffled = shuffle(roleIds)
  return players.map((p, i) => ({ ...p, roleId: shuffled[i], alive: true }))
}
