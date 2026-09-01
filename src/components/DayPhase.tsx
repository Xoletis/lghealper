import { useState } from 'react'
import { useGame } from '../game/store'
import { activeCampAlertRoles } from '../game/engine'
import { getRole } from '../game/roles'

export function DayPhase() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)

  const alivePlayers = state.players.filter((p) => p.alive)
  const campAlertRoles = activeCampAlertRoles(state.players)
  const nightVictims = state.lastNightVictimIds
    .map((id) => state.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
  const voteVictims = state.lastVoteVictimIds
    .map((id) => state.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
  const corbeauTarget = state.corbeauTargetId
    ? state.players.find((p) => p.id === state.corbeauTargetId)
    : null

  if (state.daySubPhase === 'result') {
    return (
      <div className="view day-view">
        <h1>Jour {state.round}</h1>
        {corbeauTarget && (
          <p className="camp-alert">
            🐦‍⬛ Le Corbeau a désigné <strong>{corbeauTarget.name}</strong> : il/elle débute le vote avec deux votes
            contre lui/elle.
          </p>
        )}
        {campAlertRoles.map((role) => {
          const holders = alivePlayers.filter((p) => p.roleId === role.id)
          return (
            <p className="camp-alert" key={role.id}>
              {role.icon} L'ours de {holders.map((p) => p.name).join(', ')} grogne : un camp différent du sien est
              présent (hors morts).
            </p>
          )
        })}
        {nightVictims.length === 0 ? (
          <p className="day-result">Personne n'est mort cette nuit.</p>
        ) : (
          nightVictims.map((v) => (
            <p className="day-result" key={v.id}>
              <strong>{v.name}</strong> a été retrouvé(e) mort(e). C'était un(e){' '}
              <strong>{getRole(v.roleId)?.name}</strong>.
            </p>
          ))
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
        {corbeauTarget && (
          <p className="camp-alert">
            🐦‍⬛ <strong>{corbeauTarget.name}</strong> débute ce vote avec deux votes contre lui/elle.
          </p>
        )}
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

  const revealedElder = state.revealedElderId ? state.players.find((p) => p.id === state.revealedElderId) : null

  return (
    <div className="view day-view">
      <h1>Résultat du vote</h1>
      {revealedElder ? (
        <p className="day-result">
          Le village a désigné <strong>{revealedElder.name}</strong>. C'était un(e){' '}
          <strong>{getRole(revealedElder.roleId)?.name}</strong> — mais aucun vote ne peut vraiment l'éliminer : il/elle
          reste en jeu.
        </p>
      ) : voteVictims.length === 0 ? (
        <p className="day-result">Le village n'a éliminé personne.</p>
      ) : (
        voteVictims.map((v, index) => {
          // A vote can add more than one death: the voted player, then either a
          // hunter's revenge pick or — if this victim is Cupidon's other lover —
          // a heartbreak death. Distinguish the two so the MJ isn't told "revenge"
          // for a death that was actually grief.
          const isLoverHeartbreak =
            index > 0 &&
            state.loverIds.includes(v.id) &&
            state.loverIds.some((id) => id !== v.id && state.lastVoteVictimIds.slice(0, index).includes(id))
          const lead =
            index === 0
              ? 'Le village a éliminé'
              : isLoverHeartbreak
                ? 'Le chagrin emporte aussi'
                : 'Sa vengeance emporte aussi'
          return (
            <p className="day-result" key={v.id}>
              {lead} <strong>{v.name}</strong>. C'était un(e) <strong>{getRole(v.roleId)?.name}</strong>.
            </p>
          )
        })
      )}
      <button type="button" className="primary" onClick={() => dispatch({ type: 'CONTINUE_TO_NEXT_NIGHT' })}>
        Passer à la nuit suivante
      </button>
    </div>
  )
}
