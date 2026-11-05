import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemePreference } from './theme-context'

const STORAGE_KEY = 'flashcards:theme'

function applyThemeClass(preference: ThemePreference) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = preference === 'dark' || (preference === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
}

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)

  useEffect(() => {
    applyThemeClass(preference)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  const setPreference = (next: ThemePreference) => {
    localStorage.setItem(STORAGE_KEY, next)
    setPreferenceState(next)
  }

  const value = useMemo(() => ({ preference, setPreference }), [preference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
