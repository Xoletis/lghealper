import { useState } from 'react'
import { useGame } from '../game/store'
import { getNightSequence, getNightTargets } from '../game/engine'
import { getRole } from '../game/roles'

export function NightPhase() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)

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
  const revealTarget = state.players.find((p) => p.id === targetId)

  function advance(id: string | null) {
    dispatch({ type: 'SELECT_NIGHT_TARGET', targetId: id })
    setTargetId(null)
    setRevealed(false)
  }

  function confirm() {
    // Rôle non létal (ex: Voyante) : la première pression montre le résultat au MJ,
    // la seconde (le bouton devient "Continuer") fait avancer la partie.
    if (role.nightEffect === 'none' && targetId && !revealed) {
      setRevealed(true)
      return
    }
    advance(targetId)
  }

  function skip() {
    advance(null)
  }

  return (
    <div className="view night-view">
      <h1>Nuit {state.round}</h1>
      <p className="night-prompt">{role.nightPrompt ?? `${role.name} se réveille.`}</p>

      <p className="night-holders">
        {role.icon} {role.name}
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
                  disabled={revealed}
                  onClick={() => {
                    setTargetId(p.id)
                    setRevealed(false)
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>

          {revealed && revealTarget && (
            <p className="night-reveal">
              {revealTarget.name} est <strong>{getRole(revealTarget.roleId)?.name}</strong>.
            </p>
          )}

          <button type="button" className="primary" disabled={!targetId} onClick={confirm}>
            {revealed ? 'Continuer' : role.nightEffect === 'kill' ? 'Confirmer la victime' : 'Confirmer le choix'}
          </button>
          <button type="button" className="ghost" disabled={revealed} onClick={skip}>
            Personne cette nuit
          </button>
        </>
      ) : (
        <button type="button" className="primary" onClick={() => advance(null)}>
          Continuer
        </button>
      )}
    </div>
  )
}
