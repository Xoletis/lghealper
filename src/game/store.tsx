import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { initialGameState, type GameResult, type GameState, type Player } from './types'
import {
  applyNightEffect,
  applyVoteElimination,
  assignRoles,
  avengeOldKnight,
  cascadeLoverDeaths,
  checkWinner,
  clampRoleCounts,
  enforceChaperonRequiresHunter,
  getNeutralWinners,
  getNightOrderHolders,
  getNightSequence,
  hasWolfRole,
  isHostileCluster,
  isImmuneToWolfKill,
  killPlayer,
  playerTeam,
  resolveGame,
  stealRole,
  transformWildChildren,
  triggersRevenge,
  type GameResolution,
} from './engine'
import { CONFIGURABLE_ROLES } from './roles'

type Action =
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'RENAME_PLAYER'; id: string; name: string }
  | { type: 'MOVE_SEAT'; id: string; direction: 'up' | 'down' }
  | { type: 'CONFIRM_PLAYERS' }
  | { type: 'BACK_TO_PLAYERS' }
  | { type: 'SET_ROLE_COUNT'; roleId: string; count: number }
  | { type: 'DISTRIBUTE_ROLES' }
  | { type: 'START_GAME' }
  | { type: 'SELECT_NIGHT_TARGET'; targetId: string | null }
  | { type: 'WITCH_ACT'; heal: boolean; poisonTargetId: string | null }
  | { type: 'RESOLVE_SELF_PROTECT'; use: boolean; holderId: string }
  | { type: 'CHOOSE_LOVERS'; ids: string[] }
  | { type: 'CHOOSE_CHIEN_LOUP'; choice: 'chien' | 'loup' }
  | { type: 'STEAL_ROLE'; targetId: string | null }
  | { type: 'CHARM_TARGETS'; ids: string[] }
  | { type: 'RESOLVE_BONUS_KILL'; targetId: string | null }
  | { type: 'RESOLVE_WHITE_WOLF_KILL'; targetId: string | null }
  | { type: 'RESOLVE_INFECTION'; infect: boolean }
  | { type: 'RESOLVE_HUNTER_REVENGE'; targetId: string | null }
  | { type: 'RESOLVE_SISTERS_VISION' }
  | { type: 'CONTINUE_TO_VOTE' }
  | { type: 'CAST_VOTE'; targetId: string | null }
  | { type: 'CONTINUE_TO_NEXT_NIGHT' }
  | { type: 'NEW_GAME' }
  | { type: 'RESET_ALL' }

function resequenceSeats(players: Player[]): Player[] {
  return players.map((p, i) => ({ ...p, seat: i }))
}

function toGameResult(resolution: GameResolution, players: Player[], loverIds: string[]): GameResult {
  return {
    team: resolution.team,
    neutralWinnerIds: getNeutralWinners(players, loverIds).map((p) => p.id),
    loversWin: resolution.loversWin,
    loverWinnerIds: resolution.loversWin ? loverIds : [],
    soloWin: resolution.soloWin,
    soloWinnerId: resolution.soloWinnerId,
    angeWin: resolution.angeWin,
    angeWinnerId: resolution.angeWinnerId,
    flutistWin: resolution.flutistWin,
    flutistWinnerId: resolution.flutistWinnerId,
  }
}

/**
 * Deaths from a night are only "final" once every role has acted (the Sorcière may
 * still save the Loups-Garous' victim). So the reactive powers that key off a death —
 * the Survivant's protection, the Garde's chosen target, then the Ancien's spare
 * life, then Cupidon's lover cascade, then the Chasseur's revenge — are checked
 * here, at dawn, against every death from the night just finished, not the instant
 * each individual kill happens. Protection was already decided blind at the start
 * of the night (see RESOLVE_SELF_PROTECT): anyone who armed it and ends up among
 * tonight's victims is simply revived here, before the lover cascade or revenge
 * triggers ever see them.
 */
function startDeathTriggers(state: GameState, players: Player[], lastNightVictimIds: string[]): GameState {
  const savedIds = new Set(
    lastNightVictimIds.filter((id) => players.find((p) => p.id === id)?.protectionArmed),
  )
  // The Garde's protection applies regardless of whether he himself also died
  // tonight — it was already committed earlier in the night, before any kill
  // resolved. Several Gardes (if configured) each protect independently.
  for (const guard of players.filter((p) => p.roleId === 'garde' && p.guardProtectedId)) {
    if (lastNightVictimIds.includes(guard.guardProtectedId!)) savedIds.add(guard.guardProtectedId!)
  }
  let resolvedPlayers = players
  let survivingVictimIds = lastNightVictimIds
  if (savedIds.size > 0) {
    resolvedPlayers = players.map((p) => (savedIds.has(p.id) ? { ...p, alive: true } : p))
    survivingVictimIds = lastNightVictimIds.filter((id) => !savedIds.has(id))
  }

  // The Chaperon Rouge silently survives ANY night kill for as long as the Chasseur
  // is alive — checked here, at the same point and the same way as the Ancien's
  // spare life just below (only against tonight's primary victims, not against a
  // cascade death that follows, e.g. the Vieux Chevalier's revenge). If the
  // Chasseur himself is one of tonight's victims, he's no longer alive by this
  // point (his death was already applied earlier in the night), so this correctly
  // stops protecting her — including for his own revenge-kill target, resolved
  // separately in RESOLVE_HUNTER_REVENGE.
  const hunterAlive = resolvedPlayers.some((p) => p.alive && p.roleId === 'chasseur')
  const chaperonSavedIds = new Set(
    survivingVictimIds.filter((id) => hunterAlive && resolvedPlayers.find((p) => p.id === id)?.roleId === 'chaperon-rouge'),
  )
  if (chaperonSavedIds.size > 0) {
    resolvedPlayers = resolvedPlayers.map((p) => (chaperonSavedIds.has(p.id) ? { ...p, alive: true } : p))
    survivingVictimIds = survivingVictimIds.filter((id) => !chaperonSavedIds.has(id))
  }

  // The Ancien silently survives a night kill while he still has lives left — no
  // reveal, no trace: revived and quietly dropped from tonight's victim list, as if
  // never targeted, one life spent. Once both are gone, a further night kill takes
  // normally (falls through, never reaching this check again since he'd be dead).
  const elderSavedIds = new Set(
    survivingVictimIds.filter((id) => {
      const p = resolvedPlayers.find((pl) => pl.id === id)
      return p?.roleId === 'ancien' && (p.elderLivesRemaining ?? 0) > 0
    }),
  )
  if (elderSavedIds.size > 0) {
    resolvedPlayers = resolvedPlayers.map((p) =>
      elderSavedIds.has(p.id) ? { ...p, alive: true, elderLivesRemaining: (p.elderLivesRemaining ?? 1) - 1 } : p,
    )
    survivingVictimIds = survivingVictimIds.filter((id) => !elderSavedIds.has(id))
  }

  const cascaded = resolveNightCascades(state, resolvedPlayers, survivingVictimIds)
  return startRevengeChecks(state, cascaded.players, cascaded.victimIds)
}

/**
 * Applies every automatic reactive death that can follow from tonight's victims,
 * repeating until nothing new triggers: a lover's heartbreak, then the Vieux
 * Chevalier's revenge (if he was one of the victims) — which can itself trigger a
 * fresh round of heartbreak if the avenged killer turns out to also be a lover.
 * Finally, any Enfant Sauvage whose model is now dead turns into a Loup-Garou.
 * Shared by both places a night's deaths get finalized (a normal dawn, and a
 * hunter-revenge chain still resolving) so the Chevalier's revenge fires either way.
 */
function resolveNightCascades(
  state: GameState,
  players: Player[],
  victimIds: string[],
): { players: Player[]; victimIds: string[] } {
  const lovers = cascadeLoverDeaths(players, state.loverIds, victimIds)
  const avenged = avengeOldKnight(lovers.players, lovers.victimIds, state.nightKillerIds)
  const final = cascadeLoverDeaths(avenged.players, state.loverIds, avenged.victimIds)
  return { players: transformWildChildren(final.players), victimIds: final.victimIds }
}

function startRevengeChecks(state: GameState, players: Player[], lastNightVictimIds: string[]): GameState {
  const resolution = resolveGame(players, state.loverIds, state.round)
  if (resolution) {
    return {
      ...state,
      players,
      winner: toGameResult(resolution, players, state.loverIds),
      phase: 'ended',
      pendingRevenge: null,
      revengeQueue: [],
    }
  }
  const triggerIds = lastNightVictimIds.filter((id) => triggersRevenge(players, id))
  if (triggerIds.length > 0) {
    const [first, ...rest] = triggerIds
    return { ...state, players, lastNightVictimIds, pendingRevenge: { hunterId: first, cause: 'night' }, revengeQueue: rest }
  }
  return finishNight(state, players, lastNightVictimIds)
}

/**
 * The night is fully resolved: build the day-result state, and decide whether it
 * should open with the Sœurs' vision reveal — set here (but not shown until the MJ
 * actually starts the following night, see NightPhase.tsx) when exactly one Sœur
 * died this night from an attributable kill (see nightKillerIds) and her sister is
 * still alive to be told who did it. A group kill only ever needs to name one of
 * its members, so the first candidate does fine.
 */
function finishNight(state: GameState, players: Player[], lastNightVictimIds: string[]): GameState {
  const deadSister = players.find(
    (p) => !p.alive && p.roleId === 'soeur' && lastNightVictimIds.includes(p.id) && state.nightKillerIds[p.id]?.length,
  )
  const survivor = deadSister ? players.find((p) => p.alive && p.roleId === 'soeur') : undefined
  const killerName = deadSister
    ? players.find((p) => p.id === state.nightKillerIds[deadSister.id][0])?.name
    : undefined
  const pendingSistersVision = deadSister && survivor && killerName ? { survivorId: survivor.id, killerName } : null
  return {
    ...state,
    players,
    phase: 'day',
    daySubPhase: 'result',
    lastNightVictimIds,
    pendingRevenge: null,
    revengeQueue: [],
    pendingSistersVision,
  }
}

/**
 * Finishes resolving the current night step: advance to the next role, or reach
 * dawn. "Next" is found by nightOrder, not by bumping the raw array index by one —
 * a night action can change the sequence's composition anywhere in it, not just
 * append at the end: a kill can remove the last holder of an UPCOMING role (the
 * wolves killing the Sorcière), or the Chien-Loup's choice can turn him into a role
 * someone else already holds, which deletes his own slot without adding a new one.
 * Either way, the array can shrink or reshuffle around the current position, so
 * "index + 1" can land on the wrong step (or none at all). Re-deriving the
 * completed step's nightOrder from the OLD sequence and searching the FRESH one for
 * the first step after it is robust to all of that.
 */
function finishNightStep(state: GameState, players: Player[], lastNightVictimIds: string[]): GameState {
  const completedSequence = getNightSequence(state.players, state.round)
  const completedOrder = completedSequence[state.nightStepIndex]?.nightOrder ?? -Infinity
  const sequence = getNightSequence(players, state.round)
  const nextIndex = sequence.findIndex((r) => (r.nightOrder ?? Infinity) > completedOrder)
  if (nextIndex === -1) {
    return startDeathTriggers(state, players, lastNightVictimIds)
  }
  // Mid-sequence only: an early, non-final check so an already-decided main
  // conflict doesn't wait on the rest of the night's roles. Deaths from THIS
  // night aren't final yet (the Sorcière may still act), so no lover cascade
  // and no cross-camp lovers override here — those only apply at dawn.
  const winner = checkWinner(players)
  if (winner) {
    return {
      ...state,
      players,
      winner: toGameResult(
        {
          team: winner,
          loversWin: false,
          soloWin: false,
          soloWinnerId: null,
          angeWin: false,
          angeWinnerId: null,
          flutistWin: false,
          flutistWinnerId: null,
        },
        players,
        state.loverIds,
      ),
      phase: 'ended',
      pendingRevenge: null,
      revengeQueue: [],
    }
  }
  return { ...state, players, nightStepIndex: nextIndex, lastNightVictimIds, pendingRevenge: null, revengeQueue: [] }
}

/** Finishes resolving a village vote: back to a result screen, or end the game. */
function finishVote(state: GameState, players: Player[], lastVoteVictimIds: string[]): GameState {
  const resolution = resolveGame(players, state.loverIds, state.round)
  if (resolution) {
    return {
      ...state,
      players,
      winner: toGameResult(resolution, players, state.loverIds),
      phase: 'ended',
      pendingRevenge: null,
    }
  }
  return { ...state, players, daySubPhase: 'vote-result', lastVoteVictimIds, pendingRevenge: null }
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const name = action.name.trim()
      if (!name) return state
      const player: Player = {
        id: crypto.randomUUID(),
        name,
        seat: state.players.length,
        alive: true,
      }
      return { ...state, players: [...state.players, player] }
    }
    case 'REMOVE_PLAYER': {
      const players = resequenceSeats(state.players.filter((p) => p.id !== action.id))
      const roleCounts = enforceChaperonRequiresHunter(clampRoleCounts(state.roleCounts, players.length))
      return { ...state, players, roleCounts }
    }
    case 'RENAME_PLAYER': {
      const players = state.players.map((p) => (p.id === action.id ? { ...p, name: action.name } : p))
      return { ...state, players }
    }
    case 'MOVE_SEAT': {
      const index = state.players.findIndex((p) => p.id === action.id)
      if (index === -1) return state
      const swapWith = action.direction === 'up' ? index - 1 : index + 1
      if (swapWith < 0 || swapWith >= state.players.length) return state
      const players = [...state.players]
      ;[players[index], players[swapWith]] = [players[swapWith], players[index]]
      return { ...state, players: resequenceSeats(players) }
    }
    case 'CONFIRM_PLAYERS': {
      if (state.players.length < 3) return state
      const roleCounts = enforceChaperonRequiresHunter(clampRoleCounts(state.roleCounts, state.players.length))
      return { ...state, phase: 'roles', roleCounts }
    }
    case 'BACK_TO_PLAYERS': {
      return { ...state, phase: 'players' }
    }
    case 'SET_ROLE_COUNT': {
      const role = CONFIGURABLE_ROLES.find((r) => r.id === action.roleId)
      if (!role) return state
      const total = state.players.length
      const otherSum = CONFIGURABLE_ROLES.filter((r) => r.id !== role.id).reduce(
        (sum, r) => sum + (state.roleCounts[r.id] ?? 0),
        0,
      )
      const max = Math.max(role.minCount, total - otherSum)
      let count = Math.min(Math.max(role.minCount, action.count), max)
      if (role.pairOnly) count -= count % 2

      let roleCounts = { ...state.roleCounts, [role.id]: count }

      // The Chaperon Rouge can only ever be configured alongside the Chasseur (her
      // whole protection leans on his being alive — see her description in
      // roles.ts). Bringing her in for the first time auto-adds one Chasseur if
      // there isn't one already, stealing the seat back out of her own count if the
      // table's already full; dropping the Chasseur to zero drops her back out too.
      // The other paths that can zero out the Chasseur (e.g. removing a player) go
      // through enforceChaperonRequiresHunter (engine.ts) instead.
      if (role.id === 'chaperon-rouge' && count > 0 && (roleCounts['chasseur'] ?? 0) === 0) {
        const used = Object.values(roleCounts).reduce((sum, c) => sum + c, 0)
        roleCounts =
          used < total ? { ...roleCounts, chasseur: 1 } : { ...roleCounts, [role.id]: count - 1 }
      }
      if (role.id === 'chasseur' && count === 0) {
        roleCounts = enforceChaperonRequiresHunter(roleCounts)
      }

      return { ...state, roleCounts }
    }
    case 'DISTRIBUTE_ROLES': {
      const players = assignRoles(state.players, state.roleCounts)
      return { ...state, players, phase: 'reveal' }
    }
    case 'START_GAME': {
      return {
        ...state,
        players: state.players.map((p) => ({ ...p, protectionArmed: false, protectionDecided: false })),
        phase: 'night',
        round: 1,
        nightStepIndex: 0,
        lastNightVictimIds: [],
        wolfVictimId: null,
        assassinVictimId: null,
        pendingRevenge: null,
        revengeQueue: [],
        pendingBonusKill: false,
        pendingWhiteWolfKill: false,
        pendingInfection: false,
        nightKillerIds: {},
        pendingSistersVision: null,
        revealedElderId: null,
        corbeauTargetId: null,
      }
    }
    case 'SELECT_NIGHT_TARGET': {
      const sequence = getNightSequence(state.players, state.round)
      const role = sequence[state.nightStepIndex]
      let players = role ? applyNightEffect(state.players, role, action.targetId) : state.players
      // The Renard's check failed (nobody hostile in the targeted cluster) — he
      // loses his power for the rest of the game. A skip (no target) never fails.
      if (role?.id === 'renard' && action.targetId && !isHostileCluster(state.players, action.targetId)) {
        players = players.map((p) => (p.roleId === 'renard' && p.alive ? { ...p, hasLostFoxPower: true } : p))
      }
      // The Garde's choice is stored on himself, not applied to the target — the
      // actual protection (the target's death having no effect) is resolved at
      // dawn, in startDeathTriggers, alongside the Survivant's self-protect.
      if (role?.id === 'garde' && action.targetId) {
        players = players.map((p) =>
          p.roleId === 'garde' && p.alive ? { ...p, guardProtectedId: action.targetId! } : p,
        )
      }
      // The Corbeau's pick isn't applied to anyone tonight — it's just remembered
      // for the day that follows, as a reminder that this player starts the vote
      // with two votes already against them (purely a table rule; the app doesn't
      // itself add votes). Reset at the start of every night.
      const corbeauTargetId = role?.id === 'corbeau' ? action.targetId : state.corbeauTargetId
      // A kill only "took" if the target actually ended up dead — an immune target
      // (e.g. the Assassin against a wolf kill, see applyNightEffect) stays alive,
      // so it must not be recorded as a victim or tracked as anyone's night target.
      const killedId =
        role?.nightEffect === 'kill' &&
        action.targetId &&
        players.find((p) => p.id === action.targetId)?.alive === false
          ? action.targetId
          : null
      // Two independent night roles (e.g. the wolves and the Assassin) can now
      // target the same victim in the same night — don't record them twice, or a
      // revenge trigger further down would see that id twice and double-prompt.
      const lastNightVictimIds =
        killedId && !state.lastNightVictimIds.includes(killedId)
          ? [...state.lastNightVictimIds, killedId]
          : state.lastNightVictimIds
      const wolfVictimId = killedId && role?.team === 'loups' ? killedId : state.wolfVictimId
      const assassinVictimId = killedId && role?.team === 'solitaire' ? killedId : state.assassinVictimId
      // Whoever acted this step (the whole pack for a joint wolf kill, just the
      // Assassin for his own) is "the killer" — for the Sœurs' vision, a group kill
      // only ever needs to name one of its members, so the first holder does fine.
      // The victim themselves is excluded from the candidates: the pack can now
      // target one of its own (see loup-garou's targetFilter), and a wolf killed by
      // its own pack must never be named as its own killer.
      const nightKillerIds =
        killedId && role
          ? {
              ...state.nightKillerIds,
              [killedId]: getNightOrderHolders(state.players, role)
                .filter((p) => p.id !== killedId)
                .map((p) => p.id),
            }
          : state.nightKillerIds

      // The wolves' joint kill (shared by Loup-Garou and Grand Méchant Loup, see
      // getNightSequence's dedup by nightOrder) just resolved. Up to three
      // independent extra steps can follow it, shown one after another: the Père
      // Infect's one-time infection of the victim just killed (see RESOLVE_INFECTION
      // — checked first, since it can undo that very kill), the Grand Méchant Loup's
      // bonus victim (once a wolf has ever died by vote), and the Loup Blanc's
      // periodic solo kill (every even round) — see RESOLVE_BONUS_KILL — before the
      // night can move on to the next role.
      const isWolfPackStep = role?.team === 'loups' && role?.nightEffect === 'kill'
      const bigBadWolfAlive = players.some((p) => p.alive && p.roleId === 'grand-mechant-loup')
      const whiteWolfAlive = players.some((p) => p.alive && p.roleId === 'loup-blanc')
      const infectFatherAlive = players.some((p) => p.alive && p.roleId === 'pere-infect' && !p.hasInfected)
      const pendingBonusKill = isWolfPackStep && state.bigBadWolfUnlocked && bigBadWolfAlive
      const pendingWhiteWolfKill = isWolfPackStep && whiteWolfAlive && state.round % 2 === 0
      const pendingInfection = isWolfPackStep && infectFatherAlive && !!killedId
      if (pendingInfection || pendingBonusKill || pendingWhiteWolfKill) {
        return {
          ...state,
          players,
          wolfVictimId,
          assassinVictimId,
          lastNightVictimIds,
          nightKillerIds,
          corbeauTargetId,
          pendingInfection,
          pendingBonusKill,
          pendingWhiteWolfKill,
        }
      }

      return finishNightStep(
        { ...state, wolfVictimId, assassinVictimId, nightKillerIds, corbeauTargetId },
        players,
        lastNightVictimIds,
      )
    }
    case 'WITCH_ACT': {
      let players = state.players
      let lastNightVictimIds = state.lastNightVictimIds

      // She can normally only heal the wolves' victim. In a game with no
      // Loup-Garou-team role at all, her potion works on the Assassin's victim
      // instead — otherwise it would never have anything to do.
      const healTargetId = hasWolfRole(state.players) ? state.wolfVictimId : state.assassinVictimId
      if (action.heal && healTargetId) {
        const savedId = healTargetId
        players = players.map((p) => (p.id === savedId ? { ...p, alive: true } : p))
        lastNightVictimIds = lastNightVictimIds.filter((id) => id !== savedId)
      }
      let nightKillerIds = state.nightKillerIds
      if (action.poisonTargetId) {
        const poisonedId = action.poisonTargetId
        players = players.map((p) => (p.id === poisonedId ? { ...p, alive: false } : p))
        lastNightVictimIds = [...lastNightVictimIds, poisonedId]
        const sorciere = state.players.find((p) => p.roleId === 'sorciere')
        nightKillerIds = { ...nightKillerIds, [poisonedId]: sorciere ? [sorciere.id] : [] }
      }
      if (action.heal || action.poisonTargetId) {
        players = players.map((p) =>
          p.roleId === 'sorciere'
            ? {
                ...p,
                hasHealPotion: action.heal ? false : p.hasHealPotion,
                hasPoisonPotion: action.poisonTargetId ? false : p.hasPoisonPotion,
              }
            : p,
        )
      }
      return finishNightStep({ ...state, nightKillerIds }, players, lastNightVictimIds)
    }
    case 'RESOLVE_SELF_PROTECT': {
      const sequence = getNightSequence(state.players, state.round)
      const role = sequence[state.nightStepIndex]
      let players = state.players.map((p) =>
        p.id === action.holderId
          ? {
              ...p,
              protectionDecided: true,
              ...(action.use
                ? { protectionArmed: true, protectionCharges: (p.protectionCharges ?? 1) - 1 }
                : {}),
            }
          : p,
      )
      // Several players can hold the same self-protect role at once (e.g. an Ange
      // who became a Survivant, alongside a separately-configured real Survivant) —
      // only move on once every alive holder has been asked tonight.
      const stillPending = role
        ? players.some((p) => p.alive && p.roleId === role.id && !p.protectionDecided)
        : false
      if (stillPending) {
        return { ...state, players }
      }
      return finishNightStep(state, players, state.lastNightVictimIds)
    }
    case 'CHOOSE_LOVERS': {
      return finishNightStep({ ...state, loverIds: action.ids }, state.players, state.lastNightVictimIds)
    }
    case 'CHOOSE_CHIEN_LOUP': {
      // A straight roleId swap into a real Chien or Loup-Garou — he inherits that
      // role's power, team and win condition wholesale, no separate mechanism
      // needed. forcedAura is the one permanent exception: whatever he becomes,
      // the Chien's sensing power must always read him as neutre.
      const newRoleId = action.choice === 'chien' ? 'chien' : 'loup-garou'
      const players = state.players.map((p) =>
        p.roleId === 'chien-loup' ? { ...p, roleId: newRoleId, forcedAura: 'neutre' as const } : p,
      )
      return finishNightStep(state, players, state.lastNightVictimIds)
    }
    case 'STEAL_ROLE': {
      if (!action.targetId) {
        return finishNightStep(state, state.players, state.lastNightVictimIds)
      }
      // If the target was one half of Cupidon's couple, the bond follows the role,
      // not the person — the Voleur now stands in for them in that couple; the
      // robbed player (now a plain Survivant) drops out of it entirely.
      const voleurId = state.players.find((p) => p.roleId === 'voleur')?.id
      const loverIds = voleurId
        ? state.loverIds.map((id) => (id === action.targetId ? voleurId : id))
        : state.loverIds
      const players = stealRole(state.players, action.targetId)
      return finishNightStep({ ...state, loverIds }, players, state.lastNightVictimIds)
    }
    case 'CHARM_TARGETS': {
      const players = state.players.map((p) => (action.ids.includes(p.id) ? { ...p, charmed: true } : p))
      // A charm can never be undone, unlike a kill — so it's safe (and necessary)
      // to check for the Joueur de Flûte's win right here, mid-sequence, rather
      // than waiting for dawn the way the other special wins do.
      const resolution = resolveGame(players, state.loverIds, state.round)
      if (resolution) {
        return {
          ...state,
          players,
          winner: toGameResult(resolution, players, state.loverIds),
          phase: 'ended',
          pendingRevenge: null,
          revengeQueue: [],
        }
      }
      return finishNightStep(state, players, state.lastNightVictimIds)
    }
    case 'RESOLVE_SISTERS_VISION': {
      return { ...state, pendingSistersVision: null }
    }
    case 'RESOLVE_INFECTION': {
      if (!state.pendingInfection) return state
      const otherExtrasPending = state.pendingBonusKill || state.pendingWhiteWolfKill

      if (!action.infect) {
        if (otherExtrasPending) return { ...state, pendingInfection: false }
        return finishNightStep({ ...state, pendingInfection: false }, state.players, state.lastNightVictimIds)
      }

      // Infecting undoes the kill: the victim is revived, counts as 'loups' for
      // every win/target purpose from now on (see roleTeamOf in engine.ts), but
      // keeps their own roleId — same powers, same aura, invisible to the Voyante.
      // wolfVictimId is cleared so the Sorcière isn't later asked to "heal" someone
      // who's already alive again.
      const victimId = state.wolfVictimId
      if (!victimId) return { ...state, pendingInfection: false }
      const players = state.players.map((p) => {
        if (p.id === victimId) return { ...p, alive: true, infectedTeam: 'loups' as const }
        if (p.roleId === 'pere-infect') return { ...p, hasInfected: true }
        return p
      })
      const lastNightVictimIds = state.lastNightVictimIds.filter((id) => id !== victimId)
      if (otherExtrasPending) {
        return { ...state, players, wolfVictimId: null, lastNightVictimIds, pendingInfection: false }
      }
      return finishNightStep(
        { ...state, players, wolfVictimId: null, pendingInfection: false },
        players,
        lastNightVictimIds,
      )
    }
    case 'RESOLVE_BONUS_KILL': {
      if (!state.pendingBonusKill) return state
      const immune = !!action.targetId && isImmuneToWolfKill(state.players, action.targetId)
      const players = action.targetId && !immune ? killPlayer(state.players, action.targetId) : state.players
      const lastNightVictimIds =
        action.targetId && !immune ? [...state.lastNightVictimIds, action.targetId] : state.lastNightVictimIds
      const gmlKiller = state.players.find((p) => p.alive && p.roleId === 'grand-mechant-loup')
      const nightKillerIds =
        action.targetId && !immune
          ? { ...state.nightKillerIds, [action.targetId]: gmlKiller ? [gmlKiller.id] : [] }
          : state.nightKillerIds
      // The Loup Blanc's periodic kill (if it's also pending this night) still
      // needs its own screen — don't advance the night step until that's done too.
      if (state.pendingWhiteWolfKill) {
        return { ...state, pendingBonusKill: false, players, lastNightVictimIds, nightKillerIds }
      }
      return finishNightStep({ ...state, pendingBonusKill: false, nightKillerIds }, players, lastNightVictimIds)
    }
    case 'RESOLVE_WHITE_WOLF_KILL': {
      if (!state.pendingWhiteWolfKill) return state
      const players = action.targetId ? killPlayer(state.players, action.targetId) : state.players
      const lastNightVictimIds = action.targetId
        ? [...state.lastNightVictimIds, action.targetId]
        : state.lastNightVictimIds
      const whiteWolf = state.players.find((p) => p.alive && p.roleId === 'loup-blanc')
      const nightKillerIds = action.targetId
        ? { ...state.nightKillerIds, [action.targetId]: whiteWolf ? [whiteWolf.id] : [] }
        : state.nightKillerIds
      return finishNightStep({ ...state, pendingWhiteWolfKill: false, nightKillerIds }, players, lastNightVictimIds)
    }
    case 'RESOLVE_HUNTER_REVENGE': {
      if (!state.pendingRevenge) return state
      const cause = state.pendingRevenge.cause
      // A vote-cause revenge (the hunter died by vote) is itself a vote-sourced
      // kill, so the Ancien is immune to it the same way — a night-cause revenge
      // kills normally here; his spare lives are checked later, at dawn.
      const players = action.targetId
        ? cause === 'vote'
          ? applyVoteElimination(state.players, action.targetId)
          : killPlayer(state.players, action.targetId)
        : state.players

      if (cause === 'night') {
        const lastNightVictimIds = action.targetId
          ? [...state.lastNightVictimIds, action.targetId]
          : state.lastNightVictimIds
        const hunterId = state.pendingRevenge.hunterId
        const nightKillerIds = action.targetId
          ? { ...state.nightKillerIds, [action.targetId]: [hunterId] }
          : state.nightKillerIds
        const cascaded = resolveNightCascades({ ...state, nightKillerIds }, players, lastNightVictimIds)
        const resolution = resolveGame(cascaded.players, state.loverIds, state.round)
        if (resolution) {
          return {
            ...state,
            players: cascaded.players,
            winner: toGameResult(resolution, cascaded.players, state.loverIds),
            phase: 'ended',
            pendingRevenge: null,
            revengeQueue: [],
          }
        }
        const cascadeExtra = cascaded.victimIds.filter(
          (id) => !lastNightVictimIds.includes(id) && triggersRevenge(cascaded.players, id),
        )
        const queue = [...state.revengeQueue, ...cascadeExtra]
        if (queue.length > 0) {
          const [next, ...rest] = queue
          return {
            ...state,
            players: cascaded.players,
            lastNightVictimIds: cascaded.victimIds,
            pendingRevenge: { hunterId: next, cause: 'night' },
            revengeQueue: rest,
            nightKillerIds,
          }
        }
        return finishNight({ ...state, nightKillerIds }, cascaded.players, cascaded.victimIds)
      }

      const lastVoteVictimIds = action.targetId
        ? [...state.lastVoteVictimIds, action.targetId]
        : state.lastVoteVictimIds
      const cascaded = cascadeLoverDeaths(players, state.loverIds, lastVoteVictimIds)
      const transformedPlayers = transformWildChildren(cascaded.players)
      const cascadeExtra = cascaded.victimIds.filter(
        (id) => !lastVoteVictimIds.includes(id) && triggersRevenge(transformedPlayers, id),
      )
      const queue = [...state.revengeQueue, ...cascadeExtra]
      if (queue.length > 0) {
        const [next, ...rest] = queue
        return {
          ...state,
          players: transformedPlayers,
          lastVoteVictimIds: cascaded.victimIds,
          pendingRevenge: { hunterId: next, cause: 'vote' },
          revengeQueue: rest,
        }
      }
      return finishVote(state, transformedPlayers, cascaded.victimIds)
    }
    case 'CONTINUE_TO_VOTE': {
      return { ...state, daySubPhase: 'vote' }
    }
    case 'CAST_VOTE': {
      // The Ancien is never actually removed by a vote, no matter how many times
      // he's chosen — just revealed. Handled entirely separately from the normal
      // kill/cascade pipeline below: no death occurs, so nothing here can trigger a
      // lover's heartbreak, a revenge, or a win check.
      const votedElder =
        action.targetId && state.players.find((p) => p.id === action.targetId)?.roleId === 'ancien'
      if (votedElder) {
        return { ...state, daySubPhase: 'vote-result', revealedElderId: action.targetId }
      }

      // A wolf eliminated by the village vote unlocks the Grand Méchant Loup's bonus
      // kill for the rest of the game — checked before he actually dies below, since
      // his role stays the same either way.
      const bigBadWolfUnlocked =
        state.bigBadWolfUnlocked ||
        (action.targetId ? playerTeam(state.players, action.targetId) === 'loups' : false)
      const nextState = { ...state, bigBadWolfUnlocked }

      const players = action.targetId ? killPlayer(state.players, action.targetId) : state.players
      const lastVoteVictimIds = action.targetId ? [...state.lastVoteVictimIds, action.targetId] : state.lastVoteVictimIds
      const cascaded = cascadeLoverDeaths(players, state.loverIds, lastVoteVictimIds)
      const transformedPlayers = transformWildChildren(cascaded.players)

      const triggerIds = cascaded.victimIds.filter((id) => triggersRevenge(transformedPlayers, id))
      if (triggerIds.length > 0) {
        const [first, ...rest] = triggerIds
        return {
          ...nextState,
          players: transformedPlayers,
          lastVoteVictimIds: cascaded.victimIds,
          pendingRevenge: { hunterId: first, cause: 'vote' },
          revengeQueue: rest,
        }
      }
      return finishVote(nextState, transformedPlayers, cascaded.victimIds)
    }
    case 'CONTINUE_TO_NEXT_NIGHT': {
      // The Ange's fate is decided by how round 1 went: if he made it to the end of
      // that round alive, his win condition has failed and he quietly becomes a
      // Survivant for the rest of the game (dying during round 1 itself is instead
      // caught as an immediate win in resolveGame, before this action ever fires).
      const players = state.players.map((p) => {
        const base = { ...p, protectionArmed: false, protectionDecided: false }
        if (state.round === 1 && p.alive && p.roleId === 'ange') {
          return { ...base, roleId: 'survivant', protectionCharges: 2 }
        }
        return base
      })
      return {
        ...state,
        players,
        phase: 'night',
        round: state.round + 1,
        nightStepIndex: 0,
        daySubPhase: 'result',
        lastNightVictimIds: [],
        lastVoteVictimIds: [],
        wolfVictimId: null,
        assassinVictimId: null,
        revengeQueue: [],
        pendingBonusKill: false,
        pendingWhiteWolfKill: false,
        pendingInfection: false,
        nightKillerIds: {},
        // pendingSistersVision deliberately NOT reset here: it was set at dawn by
        // finishNight, for the very night about to start, and NightPhase.tsx
        // consumes and clears it (see RESOLVE_SISTERS_VISION) once shown.
        revealedElderId: null,
        corbeauTargetId: null,
      }
    }
    case 'NEW_GAME': {
      const players = resequenceSeats(
        state.players.map((p) => ({
          ...p,
          alive: true,
          roleId: undefined,
          hasHealPotion: undefined,
          hasPoisonPotion: undefined,
          protectionCharges: undefined,
          protectionArmed: undefined,
          protectionDecided: undefined,
          forcedAura: undefined,
          wildChildModelId: undefined,
          infectedTeam: undefined,
          hasInfected: undefined,
          elderLivesRemaining: undefined,
          hasLostFoxPower: undefined,
          charmed: undefined,
          guardProtectedId: undefined,
        })),
      )
      return { ...initialGameState, phase: 'roles', players, roleCounts: state.roleCounts }
    }
    case 'RESET_ALL': {
      return initialGameState
    }
    default:
      return state
  }
}

const GameContext = createContext<{ state: GameState; dispatch: React.Dispatch<Action> } | null>(null)

const STORAGE_KEY = 'lg-game-state'

function loadInitial(): GameState {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return initialGameState
  try {
    return { ...initialGameState, ...JSON.parse(stored) } as GameState
  } catch {
    return initialGameState
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
