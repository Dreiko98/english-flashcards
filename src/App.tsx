import { Route, Routes } from 'react-router'
import { AppLayout } from './layout/AppLayout'
import { BrowsePage } from './pages/BrowsePage'
import { HomePage } from './pages/HomePage'
import { ImportPage } from './pages/ImportPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { StudyPage } from './pages/StudyPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="study/:deckId" element={<StudyPage />} />
        <Route path="browse" element={<BrowsePage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
