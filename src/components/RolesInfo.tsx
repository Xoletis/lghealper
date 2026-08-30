import { useState } from 'react'
import { ROLES, type Team } from '../game/roles'

const TEAM_ORDER: Team[] = ['village', 'loups', 'neutre', 'solitaire']

const TEAM_LABELS: Record<Team, string> = {
  village: 'Village',
  loups: 'Loups-Garous',
  neutre: 'Neutre',
  solitaire: 'Solitaire',
}

export function RolesInfo({ onClose }: { onClose: () => void }) {
  const [openTeams, setOpenTeams] = useState<Set<Team>>(new Set(TEAM_ORDER))
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)

  function toggleTeam(team: Team) {
    setOpenTeams((prev) => {
      const next = new Set(prev)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }

  function toggleRole(id: string) {
    setSelectedRoleId((prev) => (prev === id ? null : id))
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
        const selectedRole = roles.find((r) => r.id === selectedRoleId)
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
              <div className="roles-card-body">
                <div className="roles-card-grid">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className={`roles-mini-card${role.id === selectedRoleId ? ' active' : ''}`}
                      onClick={() => toggleRole(role.id)}
                    >
                      <span className="roles-mini-card-icon">{role.icon}</span>
                      <span className="roles-mini-card-name">{role.name}</span>
                    </button>
                  ))}
                </div>

                {selectedRole && (
                  <div className="roles-mini-desc">
                    <p className="roles-mini-desc-title">
                      {selectedRole.icon} {selectedRole.name}
                    </p>
                    <p className="roles-info-desc">{selectedRole.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
