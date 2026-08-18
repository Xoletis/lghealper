import { useState } from 'react'
import { useGame } from '../game/store'
import { getRole } from '../game/roles'

export function DayPhase() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)

  const alivePlayers = state.players.filter((p) => p.alive)
  const victim = state.players.find((p) => p.id === state.lastNightVictimId)
  const voted = state.players.find((p) => p.id === state.lastVoteVictimId)

  if (state.daySubPhase === 'result') {
    return (
      <div className="view day-view">
        <h1>Jour {state.round}</h1>
        {victim ? (
          <p className="day-result">
            <strong>{victim.name}</strong> a été retrouvé(e) mort(e). C'était un(e){' '}
            <strong>{getRole(victim.roleId)?.name}</strong>.
          </p>
        ) : (
          <p className="day-result">Personne n'est mort cette nuit.</p>
        )}
        <button type="button" className="primary" onClick={() => dispatch({ type: 'CONTINUE_TO_VOTE' })}>
          Passer au vote
        </button>
      </div>
    )
  }

  if (state.daySubPhase === 'vote') {
    return (
      <div className="view day-view">
        <h1>Vote du village</h1>
        <p className="hint">Qui le village élimine-t-il ?</p>
        <ul className="target-list">
          {alivePlayers.map((p) => (
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
        <button
          type="button"
          className="primary"
          disabled={!targetId}
          onClick={() => {
            dispatch({ type: 'CAST_VOTE', targetId })
            setTargetId(null)
          }}
        >
          Confirmer l'élimination
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            dispatch({ type: 'CAST_VOTE', targetId: null })
            setTargetId(null)
          }}
        >
          Égalité, personne n'est éliminé
        </button>
      </div>
    )
  }

  return (
    <div className="view day-view">
      <h1>Résultat du vote</h1>
      {voted ? (
        <p className="day-result">
          Le village a éliminé <strong>{voted.name}</strong>. C'était un(e){' '}
          <strong>{getRole(voted.roleId)?.name}</strong>.
        </p>
      ) : (
        <p className="day-result">Le village n'a éliminé personne.</p>
      )}
      <button type="button" className="primary" onClick={() => dispatch({ type: 'CONTINUE_TO_NEXT_NIGHT' })}>
        Passer à la nuit suivante
      </button>
    </div>
  )
}
