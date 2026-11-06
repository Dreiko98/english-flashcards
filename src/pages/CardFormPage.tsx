import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useDeckOptions } from '@/hooks/useDeckOptions'
import { createCard, getCard, updateCard, type CardInput } from '@/lib/api/cards'
import { inputClassName, primaryButtonClassName } from '@/lib/formStyles'

const TTS_LANG_OPTIONS = [
  { value: 'en-GB', label: 'Inglés (Reino Unido)' },
  { value: 'en-US', label: 'Inglés (Estados Unidos)' },
]

export function CardFormPage() {
  const { cardId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { decks } = useDeckOptions()
  const isEdit = Boolean(cardId)

  const [deckId, setDeckId] = useState(searchParams.get('deck') ?? '')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [example, setExample] = useState('')
  const [notes, setNotes] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [ttsLang, setTtsLang] = useState('en-GB')
  const [createReverse, setCreateReverse] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingCard, setLoadingCard] = useState(isEdit)
  const frontRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!cardId) return
    getCard(cardId)
      .then((card) => {
        setDeckId(card.deck_id)
        setFront(card.front)
        setBack(card.back)
        setExample(card.example ?? '')
        setNotes(card.notes ?? '')
        setTagsInput(card.tags.join(', '))
        setTtsLang(card.tts_lang)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la tarjeta.')
      })
      .finally(() => setLoadingCard(false))
  }, [cardId])

  // Default to the first deck once options load, without needing an effect: deckId stays
  // controlled by the user's own selection, this is purely a fallback for the initial render.
  const effectiveDeckId = deckId || (decks[0]?.id ?? '')

  function parseTags(): string[] {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  async function saveAndMaybeContinue(andAddAnother: boolean) {
    if (!effectiveDeckId || !front.trim() || !back.trim()) {
      setError('El mazo, el anverso y el reverso son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)
    const input: CardInput = {
      deckId: effectiveDeckId,
      front: front.trim(),
      back: back.trim(),
      example: example.trim(),
      notes: notes.trim(),
      tags: parseTags(),
      ttsLang,
    }
    try {
      if (isEdit && cardId) {
        await updateCard(cardId, input)
      } else {
        await createCard(input)
        if (createReverse) {
          await createCard({ ...input, front: input.back, back: input.front })
        }
      }
      if (andAddAnother) {
        setFront('')
        setBack('')
        setExample('')
        setNotes('')
        frontRef.current?.focus()
      } else {
        navigate('/browse')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la tarjeta.')
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void saveAndMaybeContinue(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void saveAndMaybeContinue(true)
    }
  }

  if (loadingCard) return <p className="text-slate-500">Cargando tarjeta…</p>

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">{isEdit ? 'Editar tarjeta' : 'Nueva tarjeta'}</h1>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400"
          >
            {error}
          </p>
        )}

        <div className="mb-4">
          <label htmlFor="deck" className="block text-sm font-medium">
            Mazo
          </label>
          <select
            id="deck"
            required
            value={effectiveDeckId}
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

        <div className="mb-4">
          <label htmlFor="front" className="block text-sm font-medium">
            Anverso
          </label>
          <textarea
            id="front"
            ref={frontRef}
            required
            rows={2}
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="back" className="block text-sm font-medium">
            Reverso
          </label>
          <textarea
            id="back"
            required
            rows={2}
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="example" className="block text-sm font-medium">
            Frase de ejemplo (opcional)
          </label>
          <textarea
            id="example"
            rows={2}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium">
            Notas (opcional)
          </label>
          <textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="tags" className="block text-sm font-medium">
            Etiquetas (separadas por comas)
          </label>
          <input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="tts-lang" className="block text-sm font-medium">
            Idioma de lectura
          </label>
          <select
            id="tts-lang"
            value={ttsLang}
            onChange={(e) => setTtsLang(e.target.value)}
            className={inputClassName}
          >
            {TTS_LANG_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {!isEdit && (
          <label className="mb-6 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createReverse}
              onChange={(e) => setCreateReverse(e.target.checked)}
            />
            Crear también la tarjeta inversa
          </label>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={saving} className={`${primaryButtonClassName} flex-1`}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {!isEdit && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAndMaybeContinue(true)}
              className="flex-1 rounded-md border border-blue-600 px-4 py-2.5 font-medium text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              Guardar y añadir otra
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
