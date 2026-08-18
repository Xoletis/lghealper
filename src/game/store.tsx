import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { initialGameState, type GameState, type Player } from './types'
import { assignRoles, checkWinner, getNightSequence } from './engine'

type Action =
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'RENAME_PLAYER'; id: string; name: string }
  | { type: 'MOVE_SEAT'; id: string; direction: 'up' | 'down' }
  | { type: 'CONFIRM_PLAYERS' }
  | { type: 'BACK_TO_PLAYERS' }
  | { type: 'SET_WOLVES_COUNT'; count: number }
  | { type: 'DISTRIBUTE_ROLES' }
  | { type: 'START_GAME' }
  | { type: 'SELECT_NIGHT_TARGET'; targetId: string | null }
  | { type: 'CONTINUE_TO_VOTE' }
  | { type: 'CAST_VOTE'; targetId: string | null }
  | { type: 'CONTINUE_TO_NEXT_NIGHT' }
  | { type: 'NEW_GAME' }
  | { type: 'RESET_ALL' }

function resequenceSeats(players: Player[]): Player[] {
  return players.map((p, i) => ({ ...p, seat: i }))
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
      const wolvesCount = Math.min(state.wolvesCount, Math.max(1, players.length - 1))
      return { ...state, players, wolvesCount }
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
    case 'SET_WOLVES_COUNT': {
      const max = Math.max(1, state.players.length - 1)
      const count = Math.min(Math.max(1, action.count), max)
      return { ...state, wolvesCount: count }
    }
    case 'DISTRIBUTE_ROLES': {
      const players = assignRoles(state.players, state.wolvesCount)
      return { ...state, players, phase: 'reveal' }
    }
    case 'START_GAME': {
      return { ...state, phase: 'night', round: 1, nightStepIndex: 0, lastNightVictimId: null }
    }
    case 'SELECT_NIGHT_TARGET': {
      let players = state.players
      if (action.targetId) {
        players = players.map((p) => (p.id === action.targetId ? { ...p, alive: false } : p))
      }
      const sequence = getNightSequence(state.players)
      const nextIndex = state.nightStepIndex + 1
      const winner = checkWinner(players)
      if (winner) {
        return { ...state, players, winner, phase: 'ended' }
      }
      if (nextIndex >= sequence.length) {
        return {
          ...state,
          players,
          phase: 'day',
          daySubPhase: 'result',
          lastNightVictimId: action.targetId,
        }
      }
      return { ...state, players, nightStepIndex: nextIndex, lastNightVictimId: action.targetId }
    }
    case 'CONTINUE_TO_VOTE': {
      return { ...state, daySubPhase: 'vote' }
    }
    case 'CAST_VOTE': {
      let players = state.players
      if (action.targetId) {
        players = players.map((p) => (p.id === action.targetId ? { ...p, alive: false } : p))
      }
      const winner = checkWinner(players)
      if (winner) {
        return { ...state, players, winner, phase: 'ended', lastVoteVictimId: action.targetId }
      }
      return { ...state, players, daySubPhase: 'vote-result', lastVoteVictimId: action.targetId }
    }
    case 'CONTINUE_TO_NEXT_NIGHT': {
      return {
        ...state,
        phase: 'night',
        round: state.round + 1,
        nightStepIndex: 0,
        daySubPhase: 'result',
        lastNightVictimId: null,
        lastVoteVictimId: null,
      }
    }
    case 'NEW_GAME': {
      const players = resequenceSeats(
        state.players.map((p) => ({ ...p, alive: true, roleId: undefined })),
      )
      return {
        ...initialGameState,
        phase: 'roles',
        players,
        wolvesCount: Math.min(state.wolvesCount, Math.max(1, players.length - 1)),
      }
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
