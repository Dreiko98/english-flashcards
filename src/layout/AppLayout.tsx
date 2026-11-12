import { NavLink, Outlet } from 'react-router'

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/study/all', label: 'Repasar', icon: '🧠', end: false },
  { to: '/browse', label: 'Navegar', icon: '📚', end: false },
  { to: '/import', label: 'Importar', icon: '📥', end: false },
  { to: '/stats', label: 'Estadísticas', icon: '📊', end: false },
  { to: '/settings', label: 'Ajustes', icon: '⚙️', end: false },
  { to: '/help', label: 'Ayuda', icon: '❓', end: false },
] as const

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return [
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  ].join(' ')
}

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50 md:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 p-4 dark:border-slate-800 md:block">
        <p className="mb-6 px-3 text-lg font-bold">Flashcards C1</p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClassName}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main
        className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 flex border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navegación principal"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-label={item.label}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium',
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400',
              ].join(' ')
            }
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
