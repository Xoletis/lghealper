interface Props {
  playerName: string
  roleName: string
  roleIcon: string
  onNext: () => void
  nextLabel?: string
}

export function RoleReveal({ playerName, roleName, roleIcon, onNext, nextLabel = 'Suivant' }: Props) {
  return (
    <div className="role-reveal-view">
      <div className="role-reveal-content">
        <p className="role-reveal-name">{playerName}</p>
        <div className="role-reveal-icon">{roleIcon}</div>
        <p className="role-reveal-role">{roleName}</p>
      </div>
      <button type="button" className="primary role-reveal-next" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  )
}
