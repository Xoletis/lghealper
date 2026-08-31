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
  const soloWinner = winner?.soloWin ? state.players.find((p) => p.id === winner.soloWinnerId) ?? null : null
  const soloWinnerRole = soloWinner ? getRole(soloWinner.roleId) : null
  const angeWinner = winner?.angeWin ? state.players.find((p) => p.id === winner.angeWinnerId) ?? null : null

  return (
    <div className="view end-view">
      <h1>
        {winner?.angeWin
          ? "👼 L'Ange gagne !"
          : winner?.soloWin
            ? `${soloWinnerRole?.icon ?? '🗡️'} ${soloWinnerRole?.name ?? 'Le solitaire'} gagne !`
            : winner?.loversWin
              ? '💘 Les Amoureux gagnent !'
              : winner?.team === 'loups'
                ? '🐺 Les Loups-Garous gagnent !'
                : '🏘️ Le Village gagne !'}
      </h1>

      {winner?.angeWin && angeWinner && (
        <p className="ange-win-detail">
          {angeWinner.name} a été éliminé(e) dès le premier tour, exactement comme il/elle le voulait : la partie
          s'arrête là sur sa victoire.
        </p>
      )}

      {winner?.soloWin && soloWinner && (
        <p className="solo-win-detail">
          {soloWinner.name} ({soloWinnerRole?.name}) est le/la dernier(e) en lice : la partie s'achève sur sa
          victoire.
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
