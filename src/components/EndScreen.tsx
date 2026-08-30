import { useGame } from '../game/store'
import { getRole } from '../game/roles'

export function EndScreen() {
  const { state, dispatch } = useGame()
  const winner = state.winner

  const neutralWinners = winner
    ? state.players.filter((p) => winner.neutralWinnerIds.includes(p.id))
    : []
  const loverWinners = winner?.loversWin
    ? state.players.filter((p) => winner.loverWinnerIds.includes(p.id))
    : []
  const assassinWinner =
    winner?.assassinWin ? state.players.find((p) => p.id === winner.assassinWinnerId) ?? null : null

  return (
    <div className="view end-view">
      <h1>
        {winner?.assassinWin
          ? "🗡️ L'Assassin gagne !"
          : winner?.loversWin
            ? '💘 Les Amoureux gagnent !'
            : winner?.team === 'loups'
              ? '🐺 Les Loups-Garous gagnent !'
              : '🏘️ Le Village gagne !'}
      </h1>

      {winner?.assassinWin && assassinWinner && (
        <p className="assassin-win-detail">
          {assassinWinner.name} est l'unique survivant(e) : la partie s'achève sur sa victoire.
        </p>
      )}

      {winner?.loversWin && loverWinners.length > 0 && (
        <p className="lovers-win-detail">
          {loverWinners.map((p) => p.name).join(' et ')} sont les derniers survivants : leur amour l'emporte sur le
          conflit entre le Village et les Loups-Garous.
        </p>
      )}

      {neutralWinners.length > 0 && (
        <ul className="neutral-winners">
          {neutralWinners.map((p) => (
            <li key={p.id}>
              🎭 <strong>{p.name}</strong> ({getRole(p.roleId)?.name}) atteint aussi son objectif !
            </li>
          ))}
        </ul>
      )}

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
