import { ROLES, CONFIGURABLE_ROLES, FILL_ROLE, type MainTeam, type RoleDef, type Team } from './roles'
import type { Player } from './types'

/**
 * Roles that wake at night, in order, restricted to ones with a living player.
 * A role with onlyFirstNight (e.g. Cupidon) is only included when round is 1.
 *
 * Two roles can deliberately share the same nightOrder (e.g. Loup-Garou and Grand
 * Méchant Loup both wake with "the pack") to represent one joint decision instead of
 * two separate ones — only the first (by ROLES declaration order) that still has a
 * living holder represents that step; see getNightOrderHolders for the full holder
 * list of that shared moment.
 */
export function getNightSequence(players: Player[], round: number): RoleDef[] {
  const aliveRoleIds = new Set(players.filter((p) => p.alive).map((p) => p.roleId))
  const eligible = ROLES.filter(
    (r) => r.nightOrder !== null && aliveRoleIds.has(r.id) && (!r.onlyFirstNight || round === 1),
  )
  const seenOrders = new Set<number>()
  const deduped = eligible.filter((r) => {
    const order = r.nightOrder as number
    if (seenOrders.has(order)) return false
    seenOrders.add(order)
    return true
  })
  return deduped.sort((a, b) => (a.nightOrder as number) - (b.nightOrder as number))
}

/** All alive players sharing this night step's exact wake-time (see getNightSequence). */
export function getNightOrderHolders(players: Player[], role: RoleDef): Player[] {
  return players.filter((p) => p.alive && ROLES.find((r) => r.id === p.roleId)?.nightOrder === role.nightOrder)
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

/** The team of the player with this id, if any. */
export function playerTeam(players: Player[], id: string): Team | undefined {
  const p = players.find((pl) => pl.id === id)
  return p ? roleTeamOf(p) : undefined
}

/**
 * Roles with dayCampAlert (e.g. Montreur d'ours) whose alive holder(s) should show
 * their day-start alert right now: at least one living player belongs to a
 * different team than the role's own team.
 */
export function activeCampAlertRoles(players: Player[]): RoleDef[] {
  return ROLES.filter((role) => {
    if (!role.dayCampAlert) return false
    const holderAlive = players.some((p) => p.alive && p.roleId === role.id)
    if (!holderAlive) return false
    return players.some((p) => p.alive && roleTeamOf(p) !== role.team)
  })
}

/**
 * Decides the main village-vs-loups conflict. Neutre-team players (e.g. the
 * Survivant) are never counted on either side: with only wolves and neutrals left
 * the wolves win, and symmetrically for the village — exactly as if the neutrals
 * weren't there.
 */
export function checkWinner(players: Player[]): MainTeam | null {
  const alive = players.filter((p) => p.alive)
  if (alive.length === 0) return null
  const aliveWolves = alive.filter((p) => roleTeamOf(p) === 'loups').length
  const aliveVillage = alive.filter((p) => roleTeamOf(p) === 'village').length
  if (aliveWolves === 0) return 'village'
  if (aliveWolves >= aliveVillage) return 'loups'
  return null
}

/** Neutre-team players whose own objective is met once the main conflict is over. */
export function getNeutralWinners(players: Player[], loverIds: string[]): Player[] {
  return players.filter((p) => {
    const role = ROLES.find((r) => r.id === p.roleId)
    if (!role || role.team !== 'neutre') return false
    if (role.neutralObjective === 'survive') return p.alive
    if (role.neutralObjective === 'couple-survives') {
      return loverIds.length === 2 && loverIds.every((id) => players.find((pl) => pl.id === id)?.alive)
    }
    return false
  })
}

/** Whether Cupidon's couple spans the two opposing camps (Village / Loups-Garous). */
export function areLoversCrossCamp(players: Player[], loverIds: string[]): boolean {
  if (loverIds.length !== 2) return false
  const teamOf = (id: string) => {
    const p = players.find((pl) => pl.id === id)
    return p ? roleTeamOf(p) : undefined
  }
  const [teamA, teamB] = [teamOf(loverIds[0]), teamOf(loverIds[1])]
  return (teamA === 'village' || teamA === 'loups') && (teamB === 'village' || teamB === 'loups') && teamA !== teamB
}

/**
 * When one lover dies, the other dies immediately of grief — whatever the cause of
 * the first death (night kill, poison, vote, a hunter's revenge). Not blockable by
 * any protection charge, matching the classic rule. Safe to call more than once on
 * the same victim list: it only ever fires once per couple.
 */
export function cascadeLoverDeaths(
  players: Player[],
  loverIds: string[],
  victimIds: string[],
): { players: Player[]; victimIds: string[] } {
  if (loverIds.length !== 2) return { players, victimIds }
  const [a, b] = loverIds
  const isAlive = (id: string) => players.find((p) => p.id === id)?.alive ?? false
  if (victimIds.includes(a) && isAlive(b)) {
    return { players: killPlayer(players, b), victimIds: [...victimIds, b] }
  }
  if (victimIds.includes(b) && isAlive(a)) {
    return { players: killPlayer(players, a), victimIds: [...victimIds, a] }
  }
  return { players, victimIds }
}

/**
 * Resolves whether the game is over. A cross-camp couple gets a private win the
 * instant they're the last two REMAINING FROM THE MAIN CONFLICT (village + loups) —
 * exactly the moment checkWinner's head-count would otherwise hand the win to
 * whichever camp has the edge. Other neutrals (e.g. a still-alive Survivant)
 * don't block this, same as they never factor into the normal head-count either.
 */
export function resolveGame(
  players: Player[],
  loverIds: string[],
): { team: MainTeam; loversWin: boolean } | null {
  if (loverIds.length === 2 && areLoversCrossCamp(players, loverIds)) {
    const mainCampAlive = players.filter((p) => {
      if (!p.alive) return false
      const team = roleTeamOf(p)
      return team === 'village' || team === 'loups'
    })
    if (mainCampAlive.length === 2 && loverIds.every((id) => mainCampAlive.some((p) => p.id === id))) {
      return { team: checkWinner(players) ?? 'village', loversWin: true }
    }
  }
  const team = checkWinner(players)
  return team ? { team, loversWin: false } : null
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
  return players.map((p, i) => {
    const roleId = shuffled[i]
    const role = ROLES.find((r) => r.id === roleId)
    const base = {
      ...p,
      roleId,
      alive: true,
      protectionCharges: role && role.nightProtectionCharges > 0 ? role.nightProtectionCharges : undefined,
    }
    return roleId === 'sorciere' ? { ...base, hasHealPotion: true, hasPoisonPotion: true } : base
  })
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
 * Clamps configured role counts to fit a player count. Every role's minCount is
 * reserved first (so a mandatory role, e.g. Loup-Garou, is never squeezed out by
 * optional ones filling up first), then any remaining capacity is handed out, in
 * declaration order, to roles that asked for more than their minimum.
 */
export function clampRoleCounts(roleCounts: Record<string, number>, playerCount: number): Record<string, number> {
  const reserved = CONFIGURABLE_ROLES.reduce((sum, r) => sum + r.minCount, 0)
  let remaining = playerCount - reserved

  const result: Record<string, number> = {}
  for (const role of CONFIGURABLE_ROLES) {
    const wanted = roleCounts[role.id] ?? role.defaultCount
    const extra = Math.max(0, wanted - role.minCount)
    const grantedExtra = Math.max(0, Math.min(extra, remaining))
    result[role.id] = role.minCount + grantedExtra
    remaining -= grantedExtra
  }
  return result
}
