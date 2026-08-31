import { useState } from 'react'
import { useGame } from '../game/store'
import { CONFIGURABLE_ROLES, FILL_ROLE, TEAM_LABELS, TEAM_ORDER, type Team } from '../game/roles'

export function RolesSetup() {
  const { state, dispatch } = useGame()
  const [openTeams, setOpenTeams] = useState<Set<Team>>(new Set(TEAM_ORDER))
  const total = state.players.length
  const configuredSum = CONFIGURABLE_ROLES.reduce((sum, r) => sum + (state.roleCounts[r.id] ?? 0), 0)
  const fillCount = total - configuredSum

  function setCount(roleId: string, count: number) {
    dispatch({ type: 'SET_ROLE_COUNT', roleId, count })
  }

  function toggleTeam(team: Team) {
    setOpenTeams((prev) => {
      const next = new Set(prev)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }

  return (
    <div className="view">
      <h1>Rôles</h1>
      <p className="hint">
        {total} joueurs. Choisis le nombre de chaque rôle, le reste sera {FILL_ROLE?.name}.
      </p>

      {TEAM_ORDER.map((team) => {
        const roles = CONFIGURABLE_ROLES.filter((r) => r.team === team)
        const showFill = FILL_ROLE?.team === team
        if (roles.length === 0 && !showFill) return null
        const isOpen = openTeams.has(team)
        const teamSum = roles.reduce((sum, r) => sum + (state.roleCounts[r.id] ?? 0), 0) + (showFill ? fillCount : 0)
        return (
          <div key={team} className={`roles-team-section team-${team}`}>
            <button
              type="button"
              className="roles-team-header"
              aria-expanded={isOpen}
              onClick={() => toggleTeam(team)}
            >
              <span>
                {TEAM_LABELS[team]}
                <span className="roles-team-count">{teamSum}</span>
              </span>
              <span className={`roles-team-chevron${isOpen ? ' open' : ''}`}>▶</span>
            </button>

            {isOpen && (
              <div className="roles-card-body">
                {roles.map((role) => {
                  const count = state.roleCounts[role.id] ?? 0
                  const otherSum = configuredSum - count
                  const max = Math.max(role.minCount, total - otherSum)
                  const step = role.pairOnly ? 2 : 1
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
                          disabled={count - step < role.minCount}
                          onClick={() => setCount(role.id, count - step)}
                          aria-label={`Moins de ${role.name}`}
                        >
                          −
                        </button>
                        <span className="stepper-value">{count}</span>
                        <button
                          type="button"
                          disabled={count + step > max}
                          onClick={() => setCount(role.id, count + step)}
                          aria-label={`Plus de ${role.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}

                {showFill && FILL_ROLE && (
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
              </div>
            )}
          </div>
        )
      })}

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
