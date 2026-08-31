import { useState } from 'react'
import { useGame } from '../game/store'
import { getNightTargets } from '../game/engine'
import { getRole } from '../game/roles'

export function WhiteWolfBonus() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)

  const role = getRole('loup-blanc')
  const whiteWolf = state.players.find((p) => p.alive && p.roleId === 'loup-blanc')
  if (!role || !whiteWolf) return null

  const targets = getNightTargets(state.players, role)

  function resolve(id: string | null) {
    dispatch({ type: 'RESOLVE_WHITE_WOLF_KILL', targetId: id })
    setTargetId(null)
  }

  return (
    <div className="view night-view">
      <h1>Nuit {state.round}</h1>
      <p className="night-prompt">
        Une nuit sur deux, {whiteWolf.name} ({role.name}) se réveille seul(e) et peut tuer un loup — ou ne rien
        faire.
      </p>
      <p className="night-holders">
        {role.icon} {role.name} : <strong>{whiteWolf.name}</strong>
      </p>

      <p className="hint">Qui désigne-t-il/elle (facultatif) ?</p>
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
