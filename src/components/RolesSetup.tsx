import { useGame } from '../game/store'
import { CONFIGURABLE_ROLES, FILL_ROLE } from '../game/roles'

export function RolesSetup() {
  const { state, dispatch } = useGame()
  const total = state.players.length
  const configuredSum = CONFIGURABLE_ROLES.reduce((sum, r) => sum + (state.roleCounts[r.id] ?? 0), 0)
  const fillCount = total - configuredSum

  function setCount(roleId: string, count: number) {
    dispatch({ type: 'SET_ROLE_COUNT', roleId, count })
  }

  return (
    <div className="view">
      <h1>Rôles</h1>
      <p className="hint">
        {total} joueurs. Choisis le nombre de chaque rôle, le reste sera {FILL_ROLE?.name}.
      </p>

      {CONFIGURABLE_ROLES.map((role) => {
        const count = state.roleCounts[role.id] ?? 0
        const otherSum = configuredSum - count
        const max = Math.max(role.minCount, total - otherSum)
        return (
          <div className="role-row" key={role.id}>
            <div className="role-info">
              <span className="role-name">
                {role.icon} {role.name}
              </span>
            </div>
            <div className="stepper">
              <button
                type="button"
                disabled={count <= role.minCount}
                onClick={() => setCount(role.id, count - 1)}
                aria-label={`Moins de ${role.name}`}
              >
                −
              </button>
              <span className="stepper-value">{count}</span>
              <button
                type="button"
                disabled={count >= max}
                onClick={() => setCount(role.id, count + 1)}
                aria-label={`Plus de ${role.name}`}
              >
                +
              </button>
            </div>
          </div>
        )
      })}

      {FILL_ROLE && (
        <div className="role-row">
          <div className="role-info">
            <span className="role-name">
              {FILL_ROLE.icon} {FILL_ROLE.name}
            </span>
          </div>
          <div className="stepper">
            <span className="stepper-value">{fillCount}</span>
          </div>
        </div>
      )}

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
