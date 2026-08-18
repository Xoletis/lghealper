import { useState } from 'react'
import { useGame } from '../game/store'
import { getNightSequence, getNightTargets } from '../game/engine'

export function NightPhase() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)

  const sequence = getNightSequence(state.players)
  const role = sequence[state.nightStepIndex]

  if (!role) {
    return (
      <div className="view night-view">
        <h1>Nuit {state.round}</h1>
        <p className="empty">Aucun rôle ne se réveille cette nuit.</p>
      </div>
    )
  }

  const targets = getNightTargets(state.players, role)
  const holders = state.players.filter((p) => p.alive && p.roleId === role.id)

  function confirm() {
    dispatch({ type: 'SELECT_NIGHT_TARGET', targetId })
    setTargetId(null)
  }

  function skip() {
    dispatch({ type: 'SELECT_NIGHT_TARGET', targetId: null })
    setTargetId(null)
  }

  return (
    <div className="view night-view">
      <h1>Nuit {state.round}</h1>
      <p className="night-prompt">{role.nightPrompt ?? `${role.name} se réveille.`}</p>

      <p className="night-holders">
        {role.name}
        {holders.length > 1 ? 's' : ''} : <strong>{holders.map((p) => p.name).join(', ')}</strong>
      </p>

      {role.nightAction === 'choose-target' ? (
        <>
          <p className="hint">Qui désignent-ils ?</p>
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
            Personne cette nuit
          </button>
        </>
      ) : (
        <button type="button" className="primary" onClick={confirm}>
          Continuer
        </button>
      )}
    </div>
  )
}
