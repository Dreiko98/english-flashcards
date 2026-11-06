import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useVoices } from '@/hooks/useVoices'
import type { ThemePreference } from '@/context/theme-context'
import {
  getAutoRead,
  getPreferredVoiceName,
  setAutoRead as persistAutoRead,
  setPreferredVoiceName,
} from '@/lib/preferences'
import { supabase } from '@/lib/supabase'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
  { value: 'system', label: 'Sistema' },
]

export function SettingsPage() {
  const { user } = useAuth()
  const { preference, setPreference } = useTheme()
  const voices = useVoices().filter((voice) => voice.lang.toLowerCase().startsWith('en'))
  const [autoRead, setAutoRead] = useState(() => getAutoRead())
  const [preferredVoice, setPreferredVoice] = useState(() => getPreferredVoiceName() ?? '')

  async function handleSignOut() {
    // No explicit navigate() here: once the session clears, ProtectedRoute re-renders and
    // redirects to /login on its own. Navigating manually here races that reactive redirect
    // and can leave a stale `from` location in history state, hijacking the next login.
    await supabase.auth.signOut()
  }

  function handleAutoReadChange(checked: boolean) {
    setAutoRead(checked)
    persistAutoRead(checked)
  }

  function handleVoiceChange(name: string) {
    setPreferredVoice(name)
    setPreferredVoiceName(name || null)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Ajustes</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tema</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreference(option.value)}
              aria-pressed={preference === option.value}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                preference === option.value
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Audio</h2>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoRead}
            onChange={(e) => handleAutoReadChange(e.target.checked)}
          />
          Leer automáticamente al mostrar la respuesta
        </label>
        <div>
          <label htmlFor="preferred-voice" className="block text-sm font-medium">
            Voz preferida
          </label>
          <select
            id="preferred-voice"
            value={preferredVoice}
            onChange={(e) => handleVoiceChange(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Automática (según el idioma de la tarjeta)</option>
            {voices.map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
          {voices.length === 0 && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tu navegador no ha reportado voces en inglés todavía.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">Sesión iniciada como</p>
        <p className="font-medium">{user?.email}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Cerrar sesión
        </button>
      </section>
    </div>
  )
}
