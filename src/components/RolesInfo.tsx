import { useState } from 'react'
import { ROLES, type Team } from '../game/roles'

const TEAM_ORDER: Team[] = ['village', 'loups', 'neutre']

const TEAM_LABELS: Record<Team, string> = {
  village: 'Village',
  loups: 'Loups-Garous',
  neutre: 'Neutre',
}

export function RolesInfo({ onClose }: { onClose: () => void }) {
  const [openTeams, setOpenTeams] = useState<Set<Team>>(new Set(TEAM_ORDER))

  function toggleTeam(team: Team) {
    setOpenTeams((prev) => {
      const next = new Set(prev)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }

  return (
    <div className="view roles-info-view">
      <div className="roles-info-header">
        <h1>Rôles</h1>
        <button type="button" className="ghost roles-info-close" onClick={onClose}>
          Fermer
        </button>
      </div>

      {TEAM_ORDER.map((team) => {
        const roles = ROLES.filter((r) => r.team === team)
        if (roles.length === 0) return null
        const isOpen = openTeams.has(team)
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
                <span className="roles-team-count">{roles.length}</span>
              </span>
              <span className={`roles-team-chevron${isOpen ? ' open' : ''}`}>▶</span>
            </button>

            {isOpen && (
              <ul className="roles-info-list">
                {roles.map((role) => (
                  <li key={role.id}>
                    <div className="roles-info-title">
                      <span className="role-name">
                        {role.icon} {role.name}
                      </span>
                    </div>
                    <p className="roles-info-desc">{role.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
