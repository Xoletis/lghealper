import { useState } from 'react'
import { useGame } from '../game/store'
import { getNightSequence, getNightTargets } from '../game/engine'
import { getRole } from '../game/roles'
import { RoleReveal } from './RoleReveal'
import { WitchNight } from './WitchNight'

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

  if (role.nightAction === 'witch') {
    const witch = holders[0]
    if (!witch) return null
    return (
      <WitchNight
        witch={witch}
        wolfVictim={state.players.find((p) => p.id === state.wolfVictimId) ?? null}
        alivePlayers={state.players.filter((p) => p.alive)}
      />
    )
  }

  function advance(id: string | null) {
    dispatch({ type: 'SELECT_NIGHT_TARGET', targetId: id })
    setTargetId(null)
    setRevealed(false)
  }

  function confirm() {
    // Rôle non létal (ex: Voyante) : la première pression montre le résultat en plein écran,
    // le bouton "Suivant" de cet écran fait ensuite avancer la partie.
    if (role.nightEffect === 'none' && targetId && !revealed) {
      setRevealed(true)
      return
    }
    advance(targetId)
  }

  function skip() {
    advance(null)
  }

  if (revealed && revealTarget) {
    const revealedRole = getRole(revealTarget.roleId)
    return (
      <RoleReveal
        playerName={revealTarget.name}
        roleName={revealedRole?.name ?? ''}
        roleIcon={revealedRole?.icon ?? ''}
        onNext={() => advance(targetId)}
      />
    )
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
                  onClick={() => setTargetId(p.id)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="primary" disabled={!targetId} onClick={confirm}>
            {role.nightEffect === 'kill' ? 'Confirmer la victime' : 'Confirmer le choix'}
          </button>
          <button type="button" className="ghost" onClick={skip}>
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
