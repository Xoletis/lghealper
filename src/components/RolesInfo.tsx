import { useState } from 'react'
import { AURA_ICONS, AURA_LABELS, AURA_ORDER, AURA_RULE_TEXT, ROLES, TEAM_LABELS, TEAM_ORDER, type Team } from '../game/roles'

type InfoTab = 'roles' | 'regles'

export function RolesInfo({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<InfoTab>('roles')

  return (
    <div className="view roles-info-view">
      <div className="roles-info-header">
        <h1>{tab === 'roles' ? 'Rôles' : 'Règles'}</h1>
        <button type="button" className="ghost roles-info-close" onClick={onClose}>
          Fermer
        </button>
      </div>

      <div className="info-tabs">
        <button
          type="button"
          className={`info-tab${tab === 'roles' ? ' active' : ''}`}
          onClick={() => setTab('roles')}
        >
          Rôles
        </button>
        <button
          type="button"
          className={`info-tab${tab === 'regles' ? ' active' : ''}`}
          onClick={() => setTab('regles')}
        >
          Règles
        </button>
      </div>

      {tab === 'roles' ? <RolesTab /> : <RulesTab />}
    </div>
  )
}

function RolesTab() {
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
    <>
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

                {selectedRole &&
                  (() => {
                    const fields = [
                      { label: 'Objectif', text: selectedRole.objective },
                      { label: 'Pouvoir', text: selectedRole.power },
                      { label: 'Immunité', text: selectedRole.immunity },
                    ].filter((f): f is { label: string; text: string } => !!f.text)
                    return (
                      <div className="roles-mini-desc">
                        <p className="roles-mini-desc-title">
                          {selectedRole.icon} {selectedRole.name}
                          <span className={`aura-badge aura-${selectedRole.aura}`}>
                            {AURA_ICONS[selectedRole.aura]} {AURA_LABELS[selectedRole.aura]}
                          </span>
                        </p>
                        {fields.length > 0 ? (
                          fields.map((f) => (
                            <p className="roles-info-desc" key={f.label}>
                              <strong>{f.label} :</strong> {f.text}
                            </p>
                          ))
                        ) : (
                          <p className="roles-info-desc">{selectedRole.description}</p>
                        )}
                      </div>
                    )
                  })()}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

function RulesTab() {
  return (
    <div className="rules-tab">
      <section className="rules-section">
        <h2>Déroulement d'une partie</h2>
        <p>
          Le Meneur de Jeu (MJ) fait alterner les nuits et les jours. Chaque nuit, les rôles se réveillent un par un,
          dans l'ordre, et agissent en secret. Chaque jour, les joueurs débattent puis votent pour éliminer un
          suspect. La partie se termine dès qu'un camp remporte le conflit principal, ou qu'une victoire spéciale se
          déclenche.
        </p>
      </section>

      <section className="rules-section">
        <h2>Les camps</h2>
        <ul className="rules-camp-list">
          <li>
            <strong>🏘️ Village</strong> — gagne en éliminant, par le vote, tous les Loups-Garous (et toute autre
            menace encore active).
          </li>
          <li>
            <strong>🐺 Loups-Garous</strong> — gagnent dès qu'ils sont au moins aussi nombreux que le Village, tant
            qu'aucun solitaire n'est encore en vie.
          </li>
          <li>
            <strong>🎭 Neutre</strong> — chaque rôle neutre poursuit son propre objectif ; il ne compte jamais pour
            la victoire du Village ni des Loups-Garous, dans un sens comme dans l'autre.
          </li>
          <li>
            <strong>🗡️ Solitaire</strong> — gagne en étant le dernier en lice parmi les joueurs non-neutres, quel
            que soit le nombre de neutres encore en vie.
          </li>
        </ul>
      </section>

      <section className="rules-section">
        <h2>Les auras</h2>
        <p>
          Certains rôles (comme le Chien) peuvent sentir l'<strong>aura</strong> d'un joueur : une indication sur la
          nature de son pouvoir, indépendante de son camp.
        </p>
        <ul className="rules-aura-list">
          {AURA_ORDER.map((aura) => (
            <li key={aura} className={`rules-aura-item aura-${aura}`}>
              <p className="rules-aura-title">
                {AURA_ICONS[aura]} {AURA_LABELS[aura]}
              </p>
              <p className="rules-aura-text">{AURA_RULE_TEXT[aura]}</p>
              <p className="rules-aura-roles">
                {ROLES.filter((r) => r.aura === aura)
                  .map((r) => `${r.icon} ${r.name}`)
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
