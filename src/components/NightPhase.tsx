import { useState } from 'react'
import { useGame } from '../game/store'
import { getNightOrderHolders, getNightSequence, getNightTargets, hasWolfRole } from '../game/engine'
import { getRole } from '../game/roles'
import { RoleReveal } from './RoleReveal'
import { WitchNight } from './WitchNight'

export function NightPhase() {
  const { state, dispatch } = useGame()
  const [targetId, setTargetId] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [loverPicks, setLoverPicks] = useState<string[]>([])
  const [coupleRevealed, setCoupleRevealed] = useState(false)

  const sequence = getNightSequence(state.players, state.round)
  const role = sequence[state.nightStepIndex]

  if (!role) {
    return (
      <div className="view night-view">
        <h1>Nuit {state.round}</h1>
        <p className="empty">Aucun rôle ne se réveille cette nuit.</p>
      </div>
    )
  }

  const targets = getNightTargets(state.players, role)
  const holders = getNightOrderHolders(state.players, role)
  const revealTarget = state.players.find((p) => p.id === targetId)

  if (role.nightAction === 'witch') {
    const witch = holders[0]
    if (!witch) return null
    const wolfInGame = hasWolfRole(state.players)
    const healableVictimId = wolfInGame ? state.wolfVictimId : state.assassinVictimId
    return (
      <WitchNight
        witch={witch}
        healableVictim={state.players.find((p) => p.id === healableVictimId) ?? null}
        attackerLabel={wolfInGame ? 'Les Loups-Garous ont attaqué' : "L'Assassin a attaqué"}
        alivePlayers={state.players.filter((p) => p.alive)}
      />
    )
  }

  if (role.nightAction === 'self-protect') {
    // Several players can hold this role at once (e.g. an Ange who became a
    // Survivant, alongside a separately-configured real Survivant) — ask each one
    // in turn instead of only ever prompting the first.
    const holder = holders.find((h) => !h.protectionDecided)
    if (!holder) return null
    const charges = holder.protectionCharges ?? 0

    function activate(use: boolean) {
      dispatch({ type: 'RESOLVE_SELF_PROTECT', use, holderId: holder!.id })
    }

    return (
      <div className="view night-view">
        <h1>Nuit {state.round}</h1>
        <p className="night-prompt">{role.nightPrompt ?? `${role.name} se réveille.`}</p>
        <p className="night-holders">
          {role.icon} {role.name} : <strong>{holder.name}</strong>
        </p>

        {charges > 0 ? (
          <>
            <p className="hint">
              {holder.name} se protège-t-il/elle cette nuit ? ({charges} charge{charges > 1 ? 's' : ''} restante
              {charges > 1 ? 's' : ''})
            </p>
            <button type="button" className="primary" onClick={() => activate(true)}>
              Oui, il/elle se protège
            </button>
            <button type="button" className="ghost" onClick={() => activate(false)}>
              Non, il/elle ne se protège pas
            </button>
          </>
        ) : (
          <>
            <p className="hint">Plus aucune charge de protection disponible.</p>
            <button type="button" className="primary" onClick={() => activate(false)}>
              Continuer
            </button>
          </>
        )}
      </div>
    )
  }

  if (role.nightAction === 'choose-couple') {
    function toggleLover(id: string) {
      setLoverPicks((prev) => {
        if (prev.includes(id)) return prev.filter((p) => p !== id)
        if (prev.length >= 2) return prev
        return [...prev, id]
      })
    }

    function confirmLovers() {
      // Show who the couple is, full-screen, before actually locking it in — the MJ
      // hands the phone over (or shows the table) so both players learn who they're
      // paired with, the same way any other private night reveal works.
      setCoupleRevealed(true)
    }

    function finishCoupleReveal() {
      dispatch({ type: 'CHOOSE_LOVERS', ids: loverPicks })
      setLoverPicks([])
      setCoupleRevealed(false)
    }

    if (coupleRevealed) {
      const [nameA, nameB] = loverPicks.map((id) => state.players.find((p) => p.id === id)?.name ?? '')
      return (
        <RoleReveal playerName={`${nameA} et ${nameB}`} roleName="Amoureux" roleIcon="💘" onNext={finishCoupleReveal} />
      )
    }

    return (
      <div className="view night-view">
        <h1>Nuit {state.round}</h1>
        <p className="night-prompt">{role.nightPrompt ?? `${role.name} se réveille.`}</p>
        <p className="night-holders">
          {role.icon} {role.name} : <strong>{holders.map((p) => p.name).join(', ')}</strong>
        </p>

        <p className="hint">Sélectionne les deux amoureux ({loverPicks.length}/2).</p>
        <ul className="target-list">
          {targets.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={loverPicks.includes(p.id) ? 'target selected' : 'target'}
                onClick={() => toggleLover(p.id)}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="primary" disabled={loverPicks.length !== 2} onClick={confirmLovers}>
          Confirmer le couple
        </button>
      </div>
    )
  }

  function advance(id: string | null) {
    dispatch({ type: 'SELECT_NIGHT_TARGET', targetId: id })
    setTargetId(null)
    setRevealed(false)
  }

  function confirm() {
    // Rôle non létal (ex: Voyante) : la première pression montre le résultat en plein écran,
    // le bouton "Suivant" de cet écran fait ensuite avancer la partie.
    if (role.nightEffect === 'none' && targetId && !revealed) {
      setRevealed(true)
      return
    }
    advance(targetId)
  }

  function skip() {
    advance(null)
  }

  if (revealed && revealTarget) {
    const revealedRole = getRole(revealTarget.roleId)
    return (
      <RoleReveal
        playerName={revealTarget.name}
        roleName={revealedRole?.name ?? ''}
        roleIcon={revealedRole?.icon ?? ''}
        onNext={() => advance(targetId)}
      />
    )
  }

  return (
    <div className="view night-view">
      <h1>Nuit {state.round}</h1>
      <p className="night-prompt">{role.nightPrompt ?? `${role.name} se réveille.`}</p>

      <p className="night-holders">
        {role.icon} {role.name}
        {holders.length > 1 ? 's' : ''} : <strong>{holders.map((p) => p.name).join(', ')}</strong>
      </p>

      {role.nightAction === 'choose-target' ? (
        <>
          <p className="hint">Qui désignent-ils ?</p>
          <ul className="target-list">
            {targets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={targetId === p.id ? 'target selected' : 'target'}
                  onClick={() => setTargetId(p.id)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>

          <button type="button" className="primary" disabled={!targetId} onClick={confirm}>
            {role.nightEffect === 'kill' ? 'Confirmer la victime' : 'Confirmer le choix'}
          </button>
          <button type="button" className="ghost" onClick={skip}>
            Personne cette nuit
          </button>
        </>
      ) : (
        <button type="button" className="primary" onClick={() => advance(null)}>
          Continuer
        </button>
      )}
    </div>
  )
}
