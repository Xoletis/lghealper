import { ROLES, CONFIGURABLE_ROLES, FILL_ROLE, type RoleDef, type Team } from './roles'
import type { Player } from './types'

/** Roles that wake at night, in order, restricted to ones with a living player. */
export function getNightSequence(players: Player[]): RoleDef[] {
  const aliveRoleIds = new Set(players.filter((p) => p.alive).map((p) => p.roleId))
  return ROLES.filter((r) => r.nightOrder !== null && aliveRoleIds.has(r.id)).sort(
    (a, b) => (a.nightOrder as number) - (b.nightOrder as number),
  )
}

/** Valid targets for a night-action role, based on its targetFilter. */
export function getNightTargets(players: Player[], role: RoleDef): Player[] {
  const alive = players.filter((p) => p.alive)
  switch (role.targetFilter) {
    case 'exclude-own-team':
      return alive.filter((p) => roleTeamOf(p) !== role.team)
    case 'exclude-own-role':
      return alive.filter((p) => p.roleId !== role.id)
    case 'all':
      return alive
  }
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

export function assignRoles(players: Player[], roleCounts: Record<string, number>): Player[] {
  const roleIds: string[] = []
  for (const role of CONFIGURABLE_ROLES) {
    const count = roleCounts[role.id] ?? 0
    for (let i = 0; i < count; i++) roleIds.push(role.id)
  }
  const fillCount = players.length - roleIds.length
  for (let i = 0; i < fillCount; i++) roleIds.push(FILL_ROLE!.id)

  const shuffled = shuffle(roleIds)
  return players.map((p, i) => ({ ...p, roleId: shuffled[i], alive: true }))
}

/** Applies a night-action role's effect to its chosen target. */
export function applyNightEffect(players: Player[], role: RoleDef, targetId: string | null): Player[] {
  if (!targetId || role.nightEffect !== 'kill') return players
  return players.map((p) => (p.id === targetId ? { ...p, alive: false } : p))
}

export function killPlayer(players: Player[], targetId: string): Player[] {
  return players.map((p) => (p.id === targetId ? { ...p, alive: false } : p))
}

/** Whether killing this player should pause the game for a revenge pick (e.g. the Hunter). */
export function triggersRevenge(players: Player[], victimId: string): boolean {
  const role = ROLES.find((r) => r.id === players.find((p) => p.id === victimId)?.roleId)
  return role?.onDeathEffect === 'revenge-kill'
}

/**
 * Clamps configured role counts to fit a (possibly reduced) player count, allocating
 * capacity to roles in the order they're declared so results stay predictable.
 */
export function clampRoleCounts(roleCounts: Record<string, number>, playerCount: number): Record<string, number> {
  const result: Record<string, number> = {}
  let remaining = playerCount
  for (const role of CONFIGURABLE_ROLES) {
    const wanted = roleCounts[role.id] ?? role.defaultCount
    const count = Math.min(Math.max(role.minCount, wanted), Math.max(role.minCount, remaining))
    result[role.id] = count
    remaining -= count
  }
  return result
}
