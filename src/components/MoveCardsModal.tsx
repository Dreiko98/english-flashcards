import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { moveCards } from '@/lib/api/cards'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'
import type { DeckOption } from '@/hooks/useDeckOptions'

interface MoveCardsModalProps {
  open: boolean
  onClose: () => void
  onMoved: () => void
  cardIds: string[]
  decks: DeckOption[]
}

export function MoveCardsModal({ open, onClose, onMoved, cardIds, decks }: MoveCardsModalProps) {
  const [deckId, setDeckId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!deckId) return
    setSaving(true)
    setError(null)
    try {
      await moveCards(cardIds, deckId)
      onMoved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron mover las tarjetas.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Mover ${cardIds.length} tarjeta(s)`}>
      <form onSubmit={handleSubmit} noValidate>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
          >
            {error}
          </p>
        )}
        <div className="mb-6">
          <label htmlFor="move-deck" className="block text-sm font-medium">
            Mazo destino
          </label>
          <select
            id="move-deck"
            required
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className={inputClassName}
          >
            <option value="" disabled>
              Elige un mazo
            </option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving || !deckId} className={primaryButtonClassName}>
            {saving ? 'Moviendo…' : 'Mover'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-slate-300 px-4 py-2.5 font-medium transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
