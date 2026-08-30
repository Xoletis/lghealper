import { useState } from 'react'
import { useGame } from '../game/store'
import { getNightTargets } from '../game/engine'
import { getRole } from '../game/roles'

export function BigBadWolfBonus() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)

  const role = getRole('grand-mechant-loup')
  const wolf = state.players.find((p) => p.alive && p.roleId === 'grand-mechant-loup')
  if (!role || !wolf) return null

  const targets = getNightTargets(state.players, role).filter((p) => p.id !== state.wolfVictimId)

  function resolve(id: string | null) {
    dispatch({ type: 'RESOLVE_BONUS_KILL', targetId: id })
    setTargetId(null)
  }

  return (
    <div className="view night-view">
      <h1>Nuit {state.round}</h1>
      <p className="night-prompt">
        Un loup est déjà mort d'un vote du village : {wolf.name} ({role.name}) peut tuer un villageois de plus,
        seul.
      </p>
      <p className="night-holders">
        {role.icon} {role.name} : <strong>{wolf.name}</strong>
      </p>

      <p className="hint">Qui désigne-t-il ?</p>
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

      <button type="button" className="primary" disabled={!targetId} onClick={() => resolve(targetId)}>
        Confirmer la victime
      </button>
      <button type="button" className="ghost" onClick={() => resolve(null)}>
        Personne cette nuit
      </button>
    </div>
  )
}
