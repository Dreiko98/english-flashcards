import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function SettingsPage() {
  const { user } = useAuth()

  async function handleSignOut() {
    // No explicit navigate() here: once the session clears, ProtectedRoute re-renders and
    // redirects to /login on its own. Navigating manually here races that reactive redirect
    // and can leave a stale `from` location in history state, hijacking the next login.
    await supabase.auth.signOut()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">
        Aquí podrás configurar el tema, las tarjetas nuevas por día y la voz de lectura. Se
        implementa en una fase posterior.
      </p>

      <div className="mt-8 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400">Sesión iniciada como</p>
        <p className="font-medium">{user?.email}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
