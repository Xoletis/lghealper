import { ROLES } from '../game/roles'

export function RolesInfo({ onClose }: { onClose: () => void }) {
  return (
    <div className="view roles-info-view">
      <div className="roles-info-header">
        <h1>Rôles</h1>
        <button type="button" className="ghost roles-info-close" onClick={onClose}>
          Fermer
        </button>
      </div>

      <ul className="roles-info-list">
        {ROLES.map((role) => (
          <li key={role.id}>
            <div className="roles-info-title">
              <span className="role-name">
                {role.icon} {role.name}
              </span>
              <span className={`team-badge team-${role.team}`}>
                {role.team === 'loups' ? 'Loups-Garous' : 'Village'}
              </span>
            </div>
            <p className="roles-info-desc">{role.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
