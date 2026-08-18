import { useGame } from '../game/store'

export function RolesSetup() {
  const { state, dispatch } = useGame()
  const total = state.players.length
  const maxWolves = Math.max(1, total - 1)
  const villagersCount = total - state.wolvesCount

  function setWolves(count: number) {
    dispatch({ type: 'SET_WOLVES_COUNT', count })
  }

  return (
    <div className="view">
      <h1>Rôles</h1>
      <p className="hint">{total} joueurs. Choisis le nombre de Loups-Garous, le reste sera Villageois.</p>

      <div className="role-row">
        <div className="role-info">
          <span className="role-name">🐺 Loup-Garou</span>
        </div>
        <div className="stepper">
          <button
            type="button"
            disabled={state.wolvesCount <= 1}
            onClick={() => setWolves(state.wolvesCount - 1)}
            aria-label="Moins de loups-garous"
          >
            −
          </button>
          <span className="stepper-value">{state.wolvesCount}</span>
          <button
            type="button"
            disabled={state.wolvesCount >= maxWolves}
            onClick={() => setWolves(state.wolvesCount + 1)}
            aria-label="Plus de loups-garous"
          >
            +
          </button>
        </div>
      </div>

      <div className="role-row">
        <div className="role-info">
          <span className="role-name">🧑‍🌾 Villageois</span>
        </div>
        <div className="stepper">
          <span className="stepper-value">{villagersCount}</span>
        </div>
      </div>

      <div className="button-row">
        <button type="button" className="ghost" onClick={() => dispatch({ type: 'BACK_TO_PLAYERS' })}>
          Retour
        </button>
        <button type="button" className="primary" onClick={() => dispatch({ type: 'DISTRIBUTE_ROLES' })}>
          Distribuer les rôles
        </button>
      </div>
    </div>
  )
}
