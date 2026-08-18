import type { Player } from '../game/types'

interface Props {
  players: Player[]
  renderLabel?: (p: Player) => string
  deadIds?: Set<string>
}

export function SeatCircle({ players, renderLabel, deadIds }: Props) {
  const size = 260
  const radius = 105
  const center = size / 2
  const tokenSize = 44

  return (
    <div className="seat-circle" style={{ width: size, height: size }}>
      <div className="seat-circle-table">Table</div>
      {players.map((p, i) => {
        const angle = (i / players.length) * 2 * Math.PI - Math.PI / 2
        const x = center + radius * Math.cos(angle) - tokenSize / 2
        const y = center + radius * Math.sin(angle) - tokenSize / 2
        const isDead = deadIds?.has(p.id)
        return (
          <div
            key={p.id}
            className={`seat-token${isDead ? ' dead' : ''}`}
            style={{ left: x, top: y, width: tokenSize, height: tokenSize }}
            title={p.name}
          >
            {renderLabel ? renderLabel(p) : p.name.slice(0, 2).toUpperCase()}
          </div>
        )
      })}
    </div>
  )
}
