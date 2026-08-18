import { useState } from 'react'
import { useGame } from '../game/store'

export function HunterRevenge() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)

  if (!state.pendingRevenge) return null

  const hunter = state.players.find((p) => p.id === state.pendingRevenge!.hunterId)
  const targets = state.players.filter((p) => p.alive)

  function confirm() {
    dispatch({ type: 'RESOLVE_HUNTER_REVENGE', targetId })
    setTargetId(null)
  }

  function skip() {
    dispatch({ type: 'RESOLVE_HUNTER_REVENGE', targetId: null })
    setTargetId(null)
  }

  return (
    <div className="view night-view">
      <h1>🏹 Vengeance du Chasseur</h1>
      <p className="night-prompt">
        <strong>{hunter?.name}</strong> vient de mourir et emporte un dernier joueur avec lui.
      </p>

      <p className="hint">Qui le Chasseur désigne-t-il ?</p>
      <ul className="target-list">
        {targets.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={targetId === p.id ? 'target selected' : 'target'}
              onClick={() => setTargetId(p.id)}
            >
              {p.name}
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="primary" disabled={!targetId} onClick={confirm}>
        Confirmer la victime
      </button>
      <button type="button" className="ghost" onClick={skip}>
        Personne
      </button>
    </div>
  )
}
