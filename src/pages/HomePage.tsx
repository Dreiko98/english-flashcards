import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ConfirmModal } from '@/components/ConfirmModal'
import { DeckFormModal } from '@/components/DeckFormModal'
import { deleteDeck } from '@/lib/api/decks'
import { useDecks, type DeckSummary } from '@/hooks/useDecks'

export function HomePage() {
  const { decks, daily, loading, error, refetch } = useDecks()
  const navigate = useNavigate()
  const [formDeck, setFormDeck] = useState<DeckSummary | null | undefined>(undefined)
  const [deletingDeck, setDeletingDeck] = useState<DeckSummary | null>(null)

  if (loading) {
    return <p className="text-slate-500">Cargando mazos…</p>
  }

  if (error) {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        No se pudieron cargar los mazos: {error}
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mazos</h1>
        <button
          type="button"
          onClick={() => setFormDeck(null)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + Nuevo mazo
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 p-4 text-center dark:border-slate-800">
        <div>
          <p className="text-2xl font-bold">{daily.totalPending}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pendientes hoy</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{daily.streak}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Racha (días)</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{daily.reviewsToday}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Repasos hoy</p>
        </div>
      </div>

      {decks.length > 0 && (
        <button
          type="button"
          disabled={daily.totalPending === 0}
          onClick={() => navigate('/study/all')}
          className="mb-6 w-full rounded-md bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Estudiar todo
        </button>
      )}

      {decks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">
            Aún no tienes mazos: crea el primero o{' '}
            <Link to="/import" className="text-blue-600 dark:text-blue-400">
              importa desde Quizlet
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {decks.map((deck) => {
            const pending =
              deck.counts.newCount + deck.counts.learningCount + deck.counts.reviewCount
            return (
              <li
                key={deck.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{deck.name}</p>
                  <div className="mt-1 flex gap-3 text-sm">
                    <span className="text-blue-600 dark:text-blue-400">
                      {deck.counts.newCount} nuevas
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {deck.counts.learningCount} aprendiendo
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      {deck.counts.reviewCount} repasar
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={pending === 0}
                    onClick={() => navigate(`/study/${deck.id}`)}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Estudiar
                  </button>
                  <button
                    type="button"
                    aria-label={`Renombrar ${deck.name}`}
                    onClick={() => setFormDeck(deck)}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${deck.name}`}
                    onClick={() => setDeletingDeck(deck)}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <DeckFormModal
        open={formDeck !== undefined}
        onClose={() => setFormDeck(undefined)}
        onSaved={refetch}
        deck={formDeck}
      />

      <ConfirmModal
        open={deletingDeck !== null}
        onClose={() => setDeletingDeck(null)}
        onConfirm={async () => {
          if (deletingDeck) await deleteDeck(deletingDeck.id)
          await refetch()
        }}
        title="Eliminar mazo"
        message={`¿Seguro que quieres eliminar "${deletingDeck?.name}"? Se eliminarán también todas sus tarjetas y su historial de repasos. Esta acción no se puede deshacer.`}
      />
    </div>
  )
}
