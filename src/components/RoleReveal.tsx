interface Props {
  playerName: string
  roleName: string
  roleIcon: string
  onNext: () => void
  nextLabel?: string
  /** Optional extra line below the role name (e.g. the Enfant Sauvage's model). */
  detail?: string
}

export function RoleReveal({ playerName, roleName, roleIcon, onNext, nextLabel = 'Suivant', detail }: Props) {
  return (
    <div className="role-reveal-view">
      <div className="role-reveal-content">
        <p className="role-reveal-name">{playerName}</p>
        <div className="role-reveal-icon">{roleIcon}</div>
        <p className="role-reveal-role">{roleName}</p>
        {detail && <p className="role-reveal-detail">{detail}</p>}
      </div>
      <button type="button" className="primary role-reveal-next" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  )
}
