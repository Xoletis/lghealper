import { useState } from 'react'
import './App.css'
import { useGame } from './game/store'
import { PlayersSetup } from './components/PlayersSetup'
import { RolesSetup } from './components/RolesSetup'
import { RevealCards } from './components/RevealCards'
import { NightPhase } from './components/NightPhase'
import { DayPhase } from './components/DayPhase'
import { EndScreen } from './components/EndScreen'
import { HunterRevenge } from './components/HunterRevenge'
import { BigBadWolfBonus } from './components/BigBadWolfBonus'
import { WhiteWolfBonus } from './components/WhiteWolfBonus'
import { RolesInfo } from './components/RolesInfo'

const PHASE_LABELS: Record<string, string> = {
  players: 'Joueurs',
  roles: 'Rôles',
  reveal: 'Distribution',
  night: 'Nuit',
  day: 'Jour',
  ended: 'Fin de partie',
}

function App() {
  const { state, dispatch } = useGame()
  const [showRolesInfo, setShowRolesInfo] = useState(false)

  function resetAll() {
    if (confirm('Réinitialiser la partie et vider la liste des joueurs ?')) {
      dispatch({ type: 'RESET_ALL' })
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>LG Helper</h1>
        <div className="app-header-right">
          <button type="button" className="roles-info-link" onClick={() => setShowRolesInfo(true)}>
            📖 Rôles
          </button>
          <span className="phase-badge">{PHASE_LABELS[state.phase]}</span>
          {state.phase !== 'players' && (
            <button type="button" className="reset-link" onClick={resetAll}>
              Réinitialiser
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {showRolesInfo ? (
          <RolesInfo onClose={() => setShowRolesInfo(false)} />
        ) : state.pendingBonusKill ? (
          <BigBadWolfBonus />
        ) : state.pendingWhiteWolfKill ? (
          <WhiteWolfBonus />
        ) : state.pendingRevenge ? (
          <HunterRevenge />
        ) : (
          <>
            {state.phase === 'players' && <PlayersSetup />}
            {state.phase === 'roles' && <RolesSetup />}
            {state.phase === 'reveal' && <RevealCards />}
            {state.phase === 'night' && <NightPhase />}
            {state.phase === 'day' && <DayPhase />}
            {state.phase === 'ended' && <EndScreen />}
          </>
        )}
      </main>
    </div>
  )
}

export default App
