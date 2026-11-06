import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ConfirmModal } from '@/components/ConfirmModal'
import { MoveCardsModal } from '@/components/MoveCardsModal'
import { useAllCards } from '@/hooks/useAllCards'
import { deleteCards, resetCards, setSuspended } from '@/lib/api/cards'
import type { CardState } from '@/lib/scheduler'
import type { CardRow } from '@/types/database'

const STATE_LABELS: Record<CardState, string> = {
  new: 'Nueva',
  learning: 'Aprendiendo',
  review: 'Repaso',
  relearning: 'Reaprendiendo',
}

const filterSelectClassName =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900'

export function BrowsePage() {
  const { cards, decks, loading, error, refetch } = useAllCards()
  const [search, setSearch] = useState('')
  const [deckFilter, setDeckFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deletingIds, setDeletingIds] = useState<string[] | null>(null)
  const [movingIds, setMovingIds] = useState<string[] | null>(null)

  const deckNameById = useMemo(() => new Map(decks.map((deck) => [deck.id, deck.name])), [decks])

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    cards.forEach((card) => card.tags.forEach((tag) => tags.add(tag)))
    return Array.from(tags).sort()
  }, [cards])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return cards.filter((card) => {
      if (deckFilter && card.deck_id !== deckFilter) return false
      if (stateFilter && card.state !== stateFilter) return false
      if (tagFilter && !card.tags.includes(tagFilter)) return false
      if (query) {
        const haystack = `${card.front} ${card.back} ${card.example ?? ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [cards, search, deckFilter, stateFilter, tagFilter])

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((card) => card.id)),
    )
  }

  async function handleToggleSuspend(card: CardRow) {
    await setSuspended([card.id], !card.suspended)
    await refetch()
  }

  async function handleReset(card: CardRow) {
    await resetCards([card.id])
    await refetch()
  }

  if (loading) return <p className="text-slate-500">Cargando tarjetas…</p>
  if (error) {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        No se pudieron cargar las tarjetas: {error}
      </p>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Navegador de tarjetas</h1>
        <Link
          to="/cards/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + Nueva tarjeta
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">
            Aún no tienes tarjetas. Crea la primera o{' '}
            <Link to="/import" className="text-blue-600 dark:text-blue-400">
              importa desde Quizlet
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              placeholder="Buscar…"
              aria-label="Buscar tarjetas"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-[10rem] flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-base dark:border-slate-700 dark:bg-slate-900"
            />
            <select
              aria-label="Filtrar por mazo"
              value={deckFilter}
              onChange={(e) => setDeckFilter(e.target.value)}
              className={filterSelectClassName}
            >
              <option value="">Todos los mazos</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por estado"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className={filterSelectClassName}
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {allTags.length > 0 && (
              <select
                aria-label="Filtrar por etiqueta"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className={filterSelectClassName}
              >
                <option value="">Todas las etiquetas</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selected.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm dark:bg-blue-500/10">
              <span>{selected.size} seleccionadas</span>
              <button
                type="button"
                onClick={() => setMovingIds(Array.from(selected))}
                className="rounded-md border border-slate-300 px-3 py-1 dark:border-slate-700"
              >
                Mover
              </button>
              <button
                type="button"
                onClick={async () => {
                  await setSuspended(Array.from(selected), true)
                  await refetch()
                  setSelected(new Set())
                }}
                className="rounded-md border border-slate-300 px-3 py-1 dark:border-slate-700"
              >
                Suspender
              </button>
              <button
                type="button"
                onClick={() => setDeletingIds(Array.from(selected))}
                className="rounded-md border border-red-300 px-3 py-1 text-red-600 dark:border-red-500/40 dark:text-red-400"
              >
                Eliminar
              </button>
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-slate-500">No se han encontrado tarjetas con esos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                    <th className="p-2">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleSelectAll}
                        aria-label="Seleccionar todas"
                      />
                    </th>
                    <th className="p-2">Anverso</th>
                    <th className="p-2">Reverso</th>
                    <th className="p-2">Mazo</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((card) => (
                    <tr key={card.id} className="border-b border-slate-100 dark:border-slate-900">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(card.id)}
                          onChange={() => toggleSelected(card.id)}
                          aria-label={`Seleccionar ${card.front}`}
                        />
                      </td>
                      <td className="max-w-[16rem] truncate p-2">{card.front}</td>
                      <td className="max-w-[16rem] truncate p-2">{card.back}</td>
                      <td className="p-2">{deckNameById.get(card.deck_id) ?? '—'}</td>
                      <td className="p-2">
                        {STATE_LABELS[card.state]}
                        {card.suspended && (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">
                            (suspendida)
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-2">
                        <Link
                          to={`/cards/${card.id}/edit`}
                          className="mr-2 text-blue-600 dark:text-blue-400"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleToggleSuspend(card)}
                          className="mr-2 text-slate-600 dark:text-slate-400"
                        >
                          {card.suspended ? 'Reactivar' : 'Suspender'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReset(card)}
                          className="mr-2 text-slate-600 dark:text-slate-400"
                        >
                          Reiniciar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingIds([card.id])}
                          className="text-red-600 dark:text-red-400"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={deletingIds !== null}
        onClose={() => setDeletingIds(null)}
        onConfirm={async () => {
          if (deletingIds) await deleteCards(deletingIds)
          setSelected(new Set())
          await refetch()
        }}
        title="Eliminar tarjetas"
        message={`¿Seguro que quieres eliminar ${deletingIds?.length ?? 0} tarjeta(s)? Esta acción no se puede deshacer.`}
      />

      <MoveCardsModal
        open={movingIds !== null}
        onClose={() => setMovingIds(null)}
        onMoved={async () => {
          setSelected(new Set())
          await refetch()
        }}
        cardIds={movingIds ?? []}
        decks={decks}
      />
    </div>
  )
}
