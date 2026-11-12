import { Route, Routes } from 'react-router'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layout/AppLayout'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { BrowsePage } from './pages/BrowsePage'
import { CardFormPage } from './pages/CardFormPage'
import { HelpPage } from './pages/HelpPage'
import { HomePage } from './pages/HomePage'
import { ImportPage } from './pages/ImportPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { StudyPage } from './pages/StudyPage'

function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="study/:deckId" element={<StudyPage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="cards/new" element={<CardFormPage />} />
          <Route path="cards/:cardId/edit" element={<CardFormPage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
