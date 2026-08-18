import { useState } from 'react'
import { useGame } from '../game/store'
import { SeatCircle } from './SeatCircle'

export function PlayersSetup() {
  const { state, dispatch } = useGame()
  const [name, setName] = useState('')

  function addPlayer() {
    if (!name.trim()) return
    dispatch({ type: 'ADD_PLAYER', name })
    setName('')
  }

  const canContinue = state.players.length >= 3

  return (
    <div className="view">
      <h1>Joueurs</h1>
      <p className="hint">
        Ajoute les joueurs autour de la table. L'ordre de la liste correspond au placement par
        défaut (sens des aiguilles d'une montre) &mdash; utilise les flèches pour réarranger.
      </p>

      <form
        className="add-form"
        onSubmit={(e) => {
          e.preventDefault()
          addPlayer()
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du joueur"
        />
        <button type="submit">Ajouter</button>
      </form>

      {state.players.length === 0 ? (
        <p className="empty">Aucun joueur pour l'instant.</p>
      ) : (
        <>
          <ul className="player-list">
            {state.players.map((p, i) => (
              <li key={p.id}>
                <span className="seat-index">{i + 1}</span>
                <span className="player-name">{p.name}</span>
                <div className="seat-controls">
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label={`Monter ${p.name}`}
                    onClick={() => dispatch({ type: 'MOVE_SEAT', id: p.id, direction: 'up' })}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === state.players.length - 1}
                    aria-label={`Descendre ${p.name}`}
                    onClick={() => dispatch({ type: 'MOVE_SEAT', id: p.id, direction: 'down' })}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="remove"
                    aria-label={`Retirer ${p.name}`}
                    onClick={() => dispatch({ type: 'REMOVE_PLAYER', id: p.id })}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="seat-preview">
            <SeatCircle players={state.players} />
          </div>
        </>
      )}

      {!canContinue && state.players.length > 0 && (
        <p className="warning">Il faut au moins 3 joueurs pour commencer.</p>
      )}

      <button
        type="button"
        className="primary"
        disabled={!canContinue}
        onClick={() => dispatch({ type: 'CONFIRM_PLAYERS' })}
      >
        Continuer vers les rôles
      </button>
    </div>
  )
}
