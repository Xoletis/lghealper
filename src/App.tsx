import './App.css'
import { useGame } from './game/store'
import { PlayersSetup } from './components/PlayersSetup'
import { RolesSetup } from './components/RolesSetup'
import { RevealCards } from './components/RevealCards'
import { NightPhase } from './components/NightPhase'
import { DayPhase } from './components/DayPhase'
import { EndScreen } from './components/EndScreen'

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
          <span className="phase-badge">{PHASE_LABELS[state.phase]}</span>
          {state.phase !== 'players' && (
            <button type="button" className="reset-link" onClick={resetAll}>
              Réinitialiser
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {state.phase === 'players' && <PlayersSetup />}
        {state.phase === 'roles' && <RolesSetup />}
        {state.phase === 'reveal' && <RevealCards />}
        {state.phase === 'night' && <NightPhase />}
        {state.phase === 'day' && <DayPhase />}
        {state.phase === 'ended' && <EndScreen />}
      </main>
    </div>
  )
}

export default App
