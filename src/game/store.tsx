import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { initialGameState, type GameState, type Player } from './types'
import {
  applyNightEffect,
  assignRoles,
  checkWinner,
  clampRoleCounts,
  getNightSequence,
  killPlayer,
  triggersRevenge,
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
  | { type: 'RESOLVE_HUNTER_REVENGE'; targetId: string | null }
  | { type: 'CONTINUE_TO_VOTE' }
  | { type: 'CAST_VOTE'; targetId: string | null }
  | { type: 'CONTINUE_TO_NEXT_NIGHT' }
  | { type: 'NEW_GAME' }
  | { type: 'RESET_ALL' }

function resequenceSeats(players: Player[]): Player[] {
  return players.map((p, i) => ({ ...p, seat: i }))
}

/**
 * Deaths from a night are only "final" once every role has acted (the Sorcière may
 * still save the Loups-Garous' victim). So revenge-on-death powers (the Chasseur) are
 * checked here, at dawn, against every death from the night just finished — not the
 * instant each individual kill happens.
 */
function startDeathTriggers(state: GameState, players: Player[], lastNightVictimIds: string[]): GameState {
  const winner = checkWinner(players)
  if (winner) {
    return { ...state, players, winner, phase: 'ended', pendingRevenge: null, revengeQueue: [] }
  }
  const triggerIds = lastNightVictimIds.filter((id) => triggersRevenge(players, id))
  if (triggerIds.length > 0) {
    const [first, ...rest] = triggerIds
    return { ...state, players, lastNightVictimIds, pendingRevenge: { hunterId: first, cause: 'night' }, revengeQueue: rest }
  }
  return { ...state, players, phase: 'day', daySubPhase: 'result', lastNightVictimIds, pendingRevenge: null, revengeQueue: [] }
}

/** Finishes resolving the current night step: advance to the next role, or reach dawn. */
function finishNightStep(
  state: GameState,
  players: Player[],
  sequenceLength: number,
  lastNightVictimIds: string[],
): GameState {
  const nextIndex = state.nightStepIndex + 1
  if (nextIndex >= sequenceLength) {
    return startDeathTriggers(state, players, lastNightVictimIds)
  }
  const winner = checkWinner(players)
  if (winner) {
    return { ...state, players, winner, phase: 'ended', pendingRevenge: null, revengeQueue: [] }
  }
  return { ...state, players, nightStepIndex: nextIndex, lastNightVictimIds, pendingRevenge: null, revengeQueue: [] }
}

/** Finishes resolving a village vote: back to a result screen, or end the game. */
function finishVote(state: GameState, players: Player[], lastVoteVictimIds: string[]): GameState {
  const winner = checkWinner(players)
  if (winner) {
    return { ...state, players, winner, phase: 'ended', pendingRevenge: null }
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
      return { ...state, phase: 'roles' }
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
      const count = Math.min(Math.max(role.minCount, action.count), max)
      return { ...state, roleCounts: { ...state.roleCounts, [role.id]: count } }
    }
    case 'DISTRIBUTE_ROLES': {
      const players = assignRoles(state.players, state.roleCounts)
      return { ...state, players, phase: 'reveal' }
    }
    case 'START_GAME': {
      return {
        ...state,
        phase: 'night',
        round: 1,
        nightStepIndex: 0,
        lastNightVictimIds: [],
        wolfVictimId: null,
        pendingRevenge: null,
        revengeQueue: [],
      }
    }
    case 'SELECT_NIGHT_TARGET': {
      const sequence = getNightSequence(state.players)
      const role = sequence[state.nightStepIndex]
      const players = role ? applyNightEffect(state.players, role, action.targetId) : state.players
      const killedId = role?.nightEffect === 'kill' && action.targetId ? action.targetId : null
      const lastNightVictimIds = killedId ? [...state.lastNightVictimIds, killedId] : state.lastNightVictimIds
      const wolfVictimId = killedId && role?.team === 'loups' ? killedId : state.wolfVictimId

      return finishNightStep({ ...state, wolfVictimId }, players, sequence.length, lastNightVictimIds)
    }
    case 'WITCH_ACT': {
      const sequence = getNightSequence(state.players)
      let players = state.players
      let lastNightVictimIds = state.lastNightVictimIds

      if (action.heal && state.wolfVictimId) {
        const savedId = state.wolfVictimId
        players = players.map((p) => (p.id === savedId ? { ...p, alive: true } : p))
        lastNightVictimIds = lastNightVictimIds.filter((id) => id !== savedId)
      }
      if (action.poisonTargetId) {
        const poisonedId = action.poisonTargetId
        players = players.map((p) => (p.id === poisonedId ? { ...p, alive: false } : p))
        lastNightVictimIds = [...lastNightVictimIds, poisonedId]
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
      return finishNightStep(state, players, sequence.length, lastNightVictimIds)
    }
    case 'RESOLVE_HUNTER_REVENGE': {
      if (!state.pendingRevenge) return state
      const players = action.targetId ? killPlayer(state.players, action.targetId) : state.players

      if (state.pendingRevenge.cause === 'night') {
        const lastNightVictimIds = action.targetId
          ? [...state.lastNightVictimIds, action.targetId]
          : state.lastNightVictimIds
        const winner = checkWinner(players)
        if (winner) {
          return { ...state, players, winner, phase: 'ended', pendingRevenge: null, revengeQueue: [] }
        }
        if (state.revengeQueue.length > 0) {
          const [next, ...rest] = state.revengeQueue
          return { ...state, players, lastNightVictimIds, pendingRevenge: { hunterId: next, cause: 'night' }, revengeQueue: rest }
        }
        return { ...state, players, phase: 'day', daySubPhase: 'result', lastNightVictimIds, pendingRevenge: null, revengeQueue: [] }
      }

      const lastVoteVictimIds = action.targetId
        ? [...state.lastVoteVictimIds, action.targetId]
        : state.lastVoteVictimIds
      return finishVote(state, players, lastVoteVictimIds)
    }
    case 'CONTINUE_TO_VOTE': {
      return { ...state, daySubPhase: 'vote' }
    }
    case 'CAST_VOTE': {
      const players = action.targetId ? killPlayer(state.players, action.targetId) : state.players
      const lastVoteVictimIds = action.targetId ? [...state.lastVoteVictimIds, action.targetId] : state.lastVoteVictimIds

      if (action.targetId && triggersRevenge(state.players, action.targetId)) {
        return { ...state, players, lastVoteVictimIds, pendingRevenge: { hunterId: action.targetId, cause: 'vote' } }
      }
      return finishVote(state, players, lastVoteVictimIds)
    }
    case 'CONTINUE_TO_NEXT_NIGHT': {
      return {
        ...state,
        phase: 'night',
        round: state.round + 1,
        nightStepIndex: 0,
        daySubPhase: 'result',
        lastNightVictimIds: [],
        lastVoteVictimIds: [],
        wolfVictimId: null,
        revengeQueue: [],
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
