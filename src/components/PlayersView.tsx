import { useState } from 'react'
import type { Player } from '../types'
import { useLocalStorage } from '../hooks/useLocalStorage'

export function PlayersView() {
  const [players, setPlayers] = useLocalStorage<Player[]>('lg-players', [])
  const [name, setName] = useState('')

  function addPlayer() {
    const trimmed = name.trim()
    if (!trimmed) return
    setPlayers((prev) => [...prev, { id: crypto.randomUUID(), name: trimmed }])
    setName('')
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="view">
      <h1>Joueurs</h1>
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

      {players.length === 0 ? (
        <p className="empty">Aucun joueur pour l'instant.</p>
      ) : (
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <button
                type="button"
                className="remove"
                aria-label={`Retirer ${p.name}`}
                onClick={() => removePlayer(p.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {players.length > 0 && (
        <p className="count">{players.length} joueur{players.length > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
