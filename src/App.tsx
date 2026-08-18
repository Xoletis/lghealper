import { useState } from 'react'
import './App.css'
import { PlayersView } from './components/PlayersView'
import { PlaceholderView } from './components/PlaceholderView'

const TABS = [
  { id: 'players', label: 'Joueurs', icon: '👥' },
  { id: 'roles', label: 'Rôles', icon: '🃏' },
  { id: 'game', label: 'Partie', icon: '🌙' },
] as const

type TabId = (typeof TABS)[number]['id']

function App() {
  const [tab, setTab] = useState<TabId>('players')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>LG Helper</h1>
      </header>

      <nav className="app-nav" aria-label="Navigation principale">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <span className="icon" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="app-main">
        {tab === 'players' && <PlayersView />}
        {tab === 'roles' && <PlaceholderView title="Rôles" />}
        {tab === 'game' && <PlaceholderView title="Partie" />}
      </main>
    </div>
  )
}

export default App
