import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { initialGameState, type GameResult, type GameState, type Player } from './types'
import {
  applyNightEffect,
  assignRoles,
  cascadeLoverDeaths,
  checkWinner,
  clampRoleCounts,
  getNeutralWinners,
  getNightOrderHolders,
  getNightSequence,
  hasWolfRole,
  isImmuneToWolfKill,
  killPlayer,
  playerTeam,
  resolveGame,
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
  | { type: 'RESOLVE_BONUS_KILL'; targetId: string | null }
  | { type: 'RESOLVE_WHITE_WOLF_KILL'; targetId: string | null }
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
  }
}

/**
 * Deaths from a night are only "final" once every role has acted (the Sorcière may
 * still save the Loups-Garous' victim). So the reactive powers that key off a death —
 * the Survivant's protection, then Cupidon's lover cascade, then the Chasseur's
 * revenge — are checked here, at dawn, against every death from the night just
 * finished, not the instant each individual kill happens. Protection was already
 * decided blind at the start of the night (see RESOLVE_SELF_PROTECT): anyone who
 * armed it and ends up among tonight's victims is simply revived here, before the
 * lover cascade or revenge triggers ever see them.
 */
function startDeathTriggers(state: GameState, players: Player[], lastNightVictimIds: string[]): GameState {
  const savedIds = new Set(
    lastNightVictimIds.filter((id) => players.find((p) => p.id === id)?.protectionArmed),
  )
  let resolvedPlayers = players
  let survivingVictimIds = lastNightVictimIds
  if (savedIds.size > 0) {
    resolvedPlayers = players.map((p) => (savedIds.has(p.id) ? { ...p, alive: true } : p))
    survivingVictimIds = lastNightVictimIds.filter((id) => !savedIds.has(id))
  }
  const cascaded = cascadeLoverDeaths(resolvedPlayers, state.loverIds, survivingVictimIds)
  return startRevengeChecks(state, cascaded.players, cascaded.victimIds)
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
 * died this night from an attributable kill (see nightKillerNames) and her sister
 * is still alive to be told who did it.
 */
function finishNight(state: GameState, players: Player[], lastNightVictimIds: string[]): GameState {
  const deadSister = players.find(
    (p) => !p.alive && p.roleId === 'soeur' && lastNightVictimIds.includes(p.id) && state.nightKillerNames[p.id],
  )
  const survivor = deadSister ? players.find((p) => p.alive && p.roleId === 'soeur') : undefined
  const pendingSistersVision =
    deadSister && survivor ? { survivorId: survivor.id, killerName: state.nightKillerNames[deadSister.id] } : null
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
      const roleCounts = clampRoleCounts(state.roleCounts, players.length)
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
      const roleCounts = clampRoleCounts(state.roleCounts, state.players.length)
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
      return { ...state, roleCounts: { ...state.roleCounts, [role.id]: count } }
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
        nightKillerNames: {},
        pendingSistersVision: null,
      }
    }
    case 'SELECT_NIGHT_TARGET': {
      const sequence = getNightSequence(state.players, state.round)
      const role = sequence[state.nightStepIndex]
      const players = role ? applyNightEffect(state.players, role, action.targetId) : state.players
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
      const nightKillerNames =
        killedId && role
          ? {
              ...state.nightKillerNames,
              [killedId]: getNightOrderHolders(state.players, role).find((p) => p.id !== killedId)?.name ?? role.name,
            }
          : state.nightKillerNames

      // The wolves' joint kill (shared by Loup-Garou and Grand Méchant Loup, see
      // getNightSequence's dedup by nightOrder) just resolved. Two independent
      // extra steps can follow it: the Grand Méchant Loup's bonus victim (once a
      // wolf has ever died by vote) and the Loup Blanc's periodic solo kill (every
      // even round) — shown one after the other (see RESOLVE_BONUS_KILL) before the
      // night can move on to the next role.
      const isWolfPackStep = role?.team === 'loups' && role?.nightEffect === 'kill'
      const bigBadWolfAlive = players.some((p) => p.alive && p.roleId === 'grand-mechant-loup')
      const whiteWolfAlive = players.some((p) => p.alive && p.roleId === 'loup-blanc')
      const pendingBonusKill = isWolfPackStep && state.bigBadWolfUnlocked && bigBadWolfAlive
      const pendingWhiteWolfKill = isWolfPackStep && whiteWolfAlive && state.round % 2 === 0
      if (pendingBonusKill || pendingWhiteWolfKill) {
        return {
          ...state,
          players,
          wolfVictimId,
          assassinVictimId,
          lastNightVictimIds,
          nightKillerNames,
          pendingBonusKill,
          pendingWhiteWolfKill,
        }
      }

      return finishNightStep({ ...state, wolfVictimId, assassinVictimId, nightKillerNames }, players, lastNightVictimIds)
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
      let nightKillerNames = state.nightKillerNames
      if (action.poisonTargetId) {
        const poisonedId = action.poisonTargetId
        players = players.map((p) => (p.id === poisonedId ? { ...p, alive: false } : p))
        lastNightVictimIds = [...lastNightVictimIds, poisonedId]
        nightKillerNames = {
          ...nightKillerNames,
          [poisonedId]: state.players.find((p) => p.roleId === 'sorciere')?.name ?? 'Sorcière',
        }
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
      return finishNightStep({ ...state, nightKillerNames }, players, lastNightVictimIds)
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
    case 'RESOLVE_SISTERS_VISION': {
      return { ...state, pendingSistersVision: null }
    }
    case 'RESOLVE_BONUS_KILL': {
      if (!state.pendingBonusKill) return state
      const immune = !!action.targetId && isImmuneToWolfKill(state.players, action.targetId)
      const players = action.targetId && !immune ? killPlayer(state.players, action.targetId) : state.players
      const lastNightVictimIds =
        action.targetId && !immune ? [...state.lastNightVictimIds, action.targetId] : state.lastNightVictimIds
      const nightKillerNames =
        action.targetId && !immune
          ? {
              ...state.nightKillerNames,
              [action.targetId]:
                state.players.find((p) => p.alive && p.roleId === 'grand-mechant-loup')?.name ?? 'Grand Méchant Loup',
            }
          : state.nightKillerNames
      // The Loup Blanc's periodic kill (if it's also pending this night) still
      // needs its own screen — don't advance the night step until that's done too.
      if (state.pendingWhiteWolfKill) {
        return { ...state, pendingBonusKill: false, players, lastNightVictimIds, nightKillerNames }
      }
      return finishNightStep({ ...state, pendingBonusKill: false, nightKillerNames }, players, lastNightVictimIds)
    }
    case 'RESOLVE_WHITE_WOLF_KILL': {
      if (!state.pendingWhiteWolfKill) return state
      const players = action.targetId ? killPlayer(state.players, action.targetId) : state.players
      const lastNightVictimIds = action.targetId
        ? [...state.lastNightVictimIds, action.targetId]
        : state.lastNightVictimIds
      const nightKillerNames = action.targetId
        ? {
            ...state.nightKillerNames,
            [action.targetId]: state.players.find((p) => p.alive && p.roleId === 'loup-blanc')?.name ?? 'Loup Blanc',
          }
        : state.nightKillerNames
      return finishNightStep({ ...state, pendingWhiteWolfKill: false, nightKillerNames }, players, lastNightVictimIds)
    }
    case 'RESOLVE_HUNTER_REVENGE': {
      if (!state.pendingRevenge) return state
      const cause = state.pendingRevenge.cause
      const players = action.targetId ? killPlayer(state.players, action.targetId) : state.players

      if (cause === 'night') {
        const lastNightVictimIds = action.targetId
          ? [...state.lastNightVictimIds, action.targetId]
          : state.lastNightVictimIds
        const hunterId = state.pendingRevenge.hunterId
        const nightKillerNames = action.targetId
          ? {
              ...state.nightKillerNames,
              [action.targetId]: state.players.find((p) => p.id === hunterId)?.name ?? 'Chasseur',
            }
          : state.nightKillerNames
        const cascaded = cascadeLoverDeaths(players, state.loverIds, lastNightVictimIds)
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
            nightKillerNames,
          }
        }
        return finishNight({ ...state, nightKillerNames }, cascaded.players, cascaded.victimIds)
      }

      const lastVoteVictimIds = action.targetId
        ? [...state.lastVoteVictimIds, action.targetId]
        : state.lastVoteVictimIds
      const cascaded = cascadeLoverDeaths(players, state.loverIds, lastVoteVictimIds)
      const cascadeExtra = cascaded.victimIds.filter(
        (id) => !lastVoteVictimIds.includes(id) && triggersRevenge(cascaded.players, id),
      )
      const queue = [...state.revengeQueue, ...cascadeExtra]
      if (queue.length > 0) {
        const [next, ...rest] = queue
        return {
          ...state,
          players: cascaded.players,
          lastVoteVictimIds: cascaded.victimIds,
          pendingRevenge: { hunterId: next, cause: 'vote' },
          revengeQueue: rest,
        }
      }
      return finishVote(state, cascaded.players, cascaded.victimIds)
    }
    case 'CONTINUE_TO_VOTE': {
      return { ...state, daySubPhase: 'vote' }
    }
    case 'CAST_VOTE': {
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

      const triggerIds = cascaded.victimIds.filter((id) => triggersRevenge(cascaded.players, id))
      if (triggerIds.length > 0) {
        const [first, ...rest] = triggerIds
        return {
          ...nextState,
          players: cascaded.players,
          lastVoteVictimIds: cascaded.victimIds,
          pendingRevenge: { hunterId: first, cause: 'vote' },
          revengeQueue: rest,
        }
      }
      return finishVote(nextState, cascaded.players, cascaded.victimIds)
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
        nightKillerNames: {},
        // pendingSistersVision deliberately NOT reset here: it was set at dawn by
        // finishNight, for the very night about to start, and NightPhase.tsx
        // consumes and clears it (see RESOLVE_SISTERS_VISION) once shown.
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
