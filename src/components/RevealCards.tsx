import { useState } from 'react'
import { useGame } from '../game/store'
import { getRole } from '../game/roles'
import { RoleReveal } from './RoleReveal'

export function RevealCards() {
  const { state, dispatch } = useGame()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [viewed, setViewed] = useState<Set<string>>(new Set())

  const activePlayer = state.players.find((p) => p.id === activeId)

  if (activePlayer) {
    const role = getRole(activePlayer.roleId)
    const model =
      role?.id === 'enfant-sauvage' ? state.players.find((p) => p.id === activePlayer.wildChildModelId) : undefined
    return (
      <RoleReveal
        playerName={activePlayer.name}
        roleName={role?.name ?? ''}
        roleIcon={role?.icon ?? ''}
        detail={model ? `Ton modèle est : ${model.name}` : undefined}
        onNext={() => {
          setViewed((prev) => new Set(prev).add(activePlayer.id))
          setActiveId(null)
        }}
      />
    )
  }

  return (
    <div className="view">
      <h1>Distribution</h1>
      <p className="hint">
        Fais passer l'appareil à chaque joueur : il appuie sur sa carte, regarde son rôle en
        plein écran, puis te rend l'appareil en appuyant sur "Suivant".
      </p>

      <div className="card-grid">
        {state.players.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`role-card${viewed.has(p.id) ? ' seen' : ''}`}
            onClick={() => setActiveId(p.id)}
          >
            <span className="role-card-name">{p.name}</span>
            {viewed.has(p.id) && <span className="role-card-check">✓</span>}
          </button>
        ))}
      </div>

      <button type="button" className="primary" onClick={() => dispatch({ type: 'START_GAME' })}>
        Démarrer la partie
      </button>
    </div>
  )
}
