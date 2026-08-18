import { useGame } from '../game/store'
import { getRole } from '../game/roles'

export function EndScreen() {
  const { state, dispatch } = useGame()

  return (
    <div className="view end-view">
      <h1>{state.winner === 'loups' ? '🐺 Les Loups-Garous gagnent !' : '🏘️ Le Village gagne !'}</h1>

      <ul className="reveal-list">
        {state.players.map((p) => (
          <li key={p.id} className={p.alive ? '' : 'dead'}>
            <span>{p.name}</span>
            <span className="reveal-role">{getRole(p.roleId)?.name}</span>
          </li>
        ))}
      </ul>

      <div className="button-row">
        <button type="button" className="ghost" onClick={() => dispatch({ type: 'RESET_ALL' })}>
          Changer les joueurs
        </button>
        <button type="button" className="primary" onClick={() => dispatch({ type: 'NEW_GAME' })}>
          Nouvelle partie
        </button>
      </div>
    </div>
  )
}
