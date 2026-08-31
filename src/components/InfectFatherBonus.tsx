import { useGame } from '../game/store'
import { getRole } from '../game/roles'

export function InfectFatherBonus() {
  const { state, dispatch } = useGame()

  const role = getRole('pere-infect')
  const father = state.players.find((p) => p.alive && p.roleId === 'pere-infect')
  const victim = state.players.find((p) => p.id === state.wolfVictimId)
  if (!role || !father || !victim) return null

  function resolve(infect: boolean) {
    dispatch({ type: 'RESOLVE_INFECTION', infect })
  }

  return (
    <div className="view night-view">
      <h1>Nuit {state.round}</h1>
      <p className="night-prompt">
        {victim.name} vient d'être dévoré(e) par la meute : {father.name} ({role.name}) peut, une seule fois par
        partie, l'infecter au lieu de la laisser mourir — elle rejoindrait les Loups-Garous en gardant son propre
        rôle, ses pouvoirs et son aura.
      </p>
      <p className="night-holders">
        {role.icon} {role.name} : <strong>{father.name}</strong>
      </p>

      <button type="button" className="primary" onClick={() => resolve(true)}>
        Infecter {victim.name}
      </button>
      <button type="button" className="ghost" onClick={() => resolve(false)}>
        Ne pas infecter
      </button>
    </div>
  )
}
