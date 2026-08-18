import { useState } from 'react'
import { useGame } from '../game/store'
import { getRole } from '../game/roles'

export function RevealCards() {
  const { state, dispatch } = useGame()
  const [flipped, setFlipped] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="view">
      <h1>Distribution</h1>
      <p className="hint">
        Fais passer l'appareil à chaque joueur : il appuie sur sa carte pour voir son rôle en
        privé, puis la retourne avant de passer au suivant.
      </p>

      <div className="card-grid">
        {state.players.map((p) => {
          const role = getRole(p.roleId)
          const isFlipped = flipped.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              className={`role-card${isFlipped ? ' flipped' : ''}`}
              onClick={() => toggle(p.id)}
            >
              {isFlipped ? (
                <span className="role-card-role">{role?.name}</span>
              ) : (
                <span className="role-card-name">{p.name}</span>
              )}
            </button>
          )
        })}
      </div>

      <button type="button" className="primary" onClick={() => dispatch({ type: 'START_GAME' })}>
        Démarrer la partie
      </button>
    </div>
  )
}
