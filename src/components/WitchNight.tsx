import { useState } from 'react'
import { useGame } from '../game/store'
import type { Player } from '../game/types'

interface Props {
  witch: Player
  wolfVictim: Player | null
  alivePlayers: Player[]
}

export function WitchNight({ witch, wolfVictim, alivePlayers }: Props) {
  const { dispatch } = useGame()
  const [heal, setHeal] = useState(false)
  const [poisonTargetId, setPoisonTargetId] = useState<string | null>(null)

  const canHeal = !!witch.hasHealPotion && !!wolfVictim
  const canPoison = !!witch.hasPoisonPotion
  const poisonTargets = alivePlayers.filter((p) => p.id !== witch.id)

  function confirm() {
    dispatch({ type: 'WITCH_ACT', heal, poisonTargetId })
    setHeal(false)
    setPoisonTargetId(null)
  }

  return (
    <div className="view night-view">
      <h1>Nuit</h1>
      <p className="night-prompt">La Sorcière se réveille.</p>
      <p className="night-holders">
        🧪 Sorcière : <strong>{witch.name}</strong>
      </p>

      {wolfVictim ? (
        <p className="hint witch-victim">
          Les Loups-Garous ont attaqué <strong>{wolfVictim.name}</strong>.
        </p>
      ) : (
        <p className="hint witch-victim">Personne n'a été attaqué cette nuit.</p>
      )}

      {canHeal && (
        <button
          type="button"
          className={heal ? 'target selected' : 'target'}
          onClick={() => setHeal((v) => !v)}
        >
          🧪 Potion de vie — sauver {wolfVictim!.name}
        </button>
      )}

      {canPoison && (
        <>
          <p className="hint witch-section">🧪 Potion de mort — éliminer un joueur (optionnel)</p>
          <ul className="target-list">
            {poisonTargets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={poisonTargetId === p.id ? 'target selected' : 'target'}
                  onClick={() => setPoisonTargetId((cur) => (cur === p.id ? null : p.id))}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!canHeal && !canPoison && <p className="empty">Elle n'a plus de potion.</p>}

      <button type="button" className="primary" onClick={confirm}>
        Confirmer
      </button>
    </div>
  )
}
