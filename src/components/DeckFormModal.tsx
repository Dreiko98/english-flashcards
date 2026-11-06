import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { createDeck, updateDeck } from '@/lib/api/decks'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'
import type { DeckRow } from '@/types/database'

interface DeckFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  deck?: DeckRow | null
}

export function DeckFormModal({ open, onClose, onSaved, deck }: DeckFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={deck ? 'Renombrar mazo' : 'Nuevo mazo'}>
      {/* Keyed by the open deck so each time the modal opens (for a different deck, or for
          "new"), a fresh instance mounts with the right initial values — no effect needed to
          reset the form. */}
      <DeckForm
        key={open ? (deck?.id ?? 'new') : 'inactive'}
        deck={deck}
        onClose={onClose}
        onSaved={onSaved}
      />
    </Modal>
  )
}

interface DeckFormProps {
  deck?: DeckRow | null
  onClose: () => void
  onSaved: () => void
}

function DeckForm({ deck, onClose, onSaved }: DeckFormProps) {
  const [name, setName] = useState(deck?.name ?? '')
  const [description, setDescription] = useState(deck?.description ?? '')
  const [newPerDay, setNewPerDay] = useState(deck?.new_per_day ?? 15)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (deck) {
        await updateDeck(deck.id, { name, description, newPerDay })
      } else {
        await createDeck(name, description, newPerDay)
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el mazo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
        >
          {error}
        </p>
      )}
      <div className="mb-4">
        <label htmlFor="deck-name" className="block text-sm font-medium">
          Nombre
        </label>
        <input
          id="deck-name"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="mb-4">
        <label htmlFor="deck-description" className="block text-sm font-medium">
          Descripción (opcional)
        </label>
        <input
          id="deck-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClassName}
        />
      </div>
      <div className="mb-6">
        <label htmlFor="deck-new-per-day" className="block text-sm font-medium">
          Nuevas por día
        </label>
        <input
          id="deck-new-per-day"
          type="number"
          min={0}
          required
          value={newPerDay}
          onChange={(e) => setNewPerDay(Number(e.target.value))}
          className={inputClassName}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={primaryButtonClassName}>
          {saving ? 'Guardando…' : 'Guardar'}
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
  )
}
