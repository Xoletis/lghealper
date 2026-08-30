import { useState } from 'react'
import { useGame } from '../game/store'
import type { Player } from '../game/types'

interface Props {
  witch: Player
  /** Whoever her heal potion can currently target — the wolves' victim normally, or the Assassin's if this game has no Loup-Garou role at all. */
  healableVictim: Player | null
  /** Describes who mounted that attack, e.g. "Les Loups-Garous ont attaqué" or "L'Assassin a attaqué". */
  attackerLabel: string
  alivePlayers: Player[]
}

export function WitchNight({ witch, healableVictim, attackerLabel, alivePlayers }: Props) {
  const { dispatch } = useGame()
  const [heal, setHeal] = useState(false)
  const [poisonTargetId, setPoisonTargetId] = useState<string | null>(null)

  const canHeal = !!witch.hasHealPotion && !!healableVictim
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

      {healableVictim ? (
        <p className="hint witch-victim">
          {attackerLabel} <strong>{healableVictim.name}</strong>.
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
          🧪 Potion de vie — sauver {healableVictim!.name}
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
