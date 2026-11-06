import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { MarkdownText } from '@/components/MarkdownText'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { useSpeech } from '@/hooks/useSpeech'
import { useStudySession } from '@/hooks/useStudySession'
import { formatInterval } from '@/lib/formatInterval'
import { getAutoRead, setAutoRead as persistAutoRead } from '@/lib/preferences'
import type { Rating } from '@/lib/scheduler'

const RATING_BUTTONS: { rating: Rating; label: string; className: string }[] = [
  { rating: 1, label: 'Otra vez', className: 'bg-red-600 hover:bg-red-700' },
  { rating: 2, label: 'Difícil', className: 'bg-orange-500 hover:bg-orange-600' },
  { rating: 3, label: 'Bien', className: 'bg-green-600 hover:bg-green-700' },
  { rating: 4, label: 'Fácil', className: 'bg-blue-600 hover:bg-blue-700' },
]

function OfflineStatus({ isOnline, pendingCount }: { isOnline: boolean; pendingCount: number }) {
  if (isOnline && pendingCount === 0) return null
  return (
    <span className="text-amber-600 dark:text-amber-400">
      {!isOnline ? 'Sin conexión' : 'Sincronizando…'}
    </span>
  )
}

export function StudyPage() {
  const { deckId } = useParams()
  const scope = deckId ?? 'all'
  const session = useStudySession(scope)
  const { speak } = useSpeech()
  const offline = useOfflineSync()

  const [revealed, setRevealed] = useState(false)
  const [autoRead, setAutoRead] = useState(() => getAutoRead())
  // Lazy useState initializer, not useRef(Date.now()): reading the clock is only safe to do
  // once, during the documented "compute initial state lazily" escape hatch.
  const [startedAt] = useState(() => Date.now())
  const [finishedAt, setFinishedAt] = useState<number | null>(null)

  const { currentCard } = session

  useEffect(() => {
    // Depend on the object reference, not just the id: when the same card reappears right
    // after being answered (e.g. the only learning card left, shown early), cardsById gives it
    // a new reference but the id is unchanged -- we still need to reset to the front side.
    setRevealed(false)
  }, [currentCard])

  useEffect(() => {
    if (!session.loading && !currentCard && session.stats.total > 0 && finishedAt === null) {
      setFinishedAt(Date.now())
    }
  }, [session.loading, currentCard, session.stats.total, finishedAt])

  useEffect(() => {
    if (!currentCard || !revealed || !autoRead) return
    const text = [currentCard.front, currentCard.example].filter(Boolean).join('. ')
    speak(text, currentCard.tts_lang)
  }, [currentCard, revealed, autoRead, speak])

  function toggleAutoRead() {
    const next = !autoRead
    setAutoRead(next)
    persistAutoRead(next)
  }

  // Shared by both the rating buttons and the keyboard shortcuts below, so the offline-pending
  // indicator updates no matter which input method triggered the answer.
  async function handleAnswer(rating: Rating) {
    await session.answer(rating)
    offline.notePending()
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!currentCard) return
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        if (!revealed) {
          setRevealed(true)
        } else {
          void handleAnswer(3)
        }
        return
      }
      if (revealed && ['1', '2', '3', '4'].includes(event.key)) {
        event.preventDefault()
        void handleAnswer(Number(event.key) as Rating)
        return
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault()
        const text = [currentCard.front, revealed ? currentCard.example : null]
          .filter(Boolean)
          .join('. ')
        speak(text, currentCard.tts_lang)
        return
      }
      if (event.key.toLowerCase() === 'z' && session.canUndo) {
        event.preventDefault()
        void session.undo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  if (session.loading) return <p className="text-slate-500">Cargando sesión…</p>
  if (session.error) {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        No se pudo cargar la sesión: {session.error}
      </p>
    )
  }

  if (!currentCard) {
    const sessionHadCards = session.stats.total > 0
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="mb-2 text-2xl font-bold">
          {sessionHadCards ? '¡Hecho por hoy!' : 'Nada que estudiar'}
        </h1>
        {sessionHadCards ? (
          <p className="text-slate-600 dark:text-slate-400">
            {session.stats.total} tarjeta(s) repasadas en{' '}
            {Math.round(((finishedAt ?? startedAt) - startedAt) / 1000 / 60)} min ·{' '}
            {Math.round((session.stats.correct / session.stats.total) * 100)}% de aciertos
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">
            No hay tarjetas pendientes en este mazo por ahora.
          </p>
        )}
        <div className="mt-4">
          <OfflineStatus isOnline={offline.isOnline} pendingCount={offline.pendingCount} />
        </div>
        {session.canUndo && (
          <button
            type="button"
            onClick={() => void session.undo()}
            className="mt-4 block w-full text-sm text-blue-600 dark:text-blue-400"
          >
            Deshacer la última respuesta
          </button>
        )}
        <Link to="/" className="mt-6 inline-block text-blue-600 dark:text-blue-400">
          Volver a mazos
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>Quedan {session.queueLength}</span>
        <div className="flex items-center gap-3">
          <OfflineStatus isOnline={offline.isOnline} pendingCount={offline.pendingCount} />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={autoRead} onChange={toggleAutoRead} />
            Leer automáticamente
          </label>
          <Link to={`/cards/${currentCard.id}/edit`} aria-label="Editar tarjeta actual">
            Editar
          </Link>
          <button
            type="button"
            onClick={() => void session.undo()}
            disabled={!session.canUndo}
            className="disabled:opacity-40"
          >
            Deshacer
          </button>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !revealed && setRevealed(true)}
        onKeyDown={(e) => {
          if (!revealed && (e.key === 'Enter' || e.key === ' ')) setRevealed(true)
        }}
        className="min-h-[14rem] cursor-pointer rounded-xl border border-slate-200 p-6 text-center dark:border-slate-800"
      >
        <div className="flex items-center justify-center gap-2">
          <p className="text-xl font-medium">
            <MarkdownText text={currentCard.front} />
          </p>
          <button
            type="button"
            aria-label="Escuchar"
            onClick={(e) => {
              e.stopPropagation()
              speak(currentCard.front, currentCard.tts_lang)
            }}
          >
            🔊
          </button>
        </div>

        {revealed && (
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <p className="text-lg">
              <MarkdownText text={currentCard.back} />
            </p>
            {currentCard.example && (
              <p className="mt-3 text-slate-600 italic dark:text-slate-400">
                <MarkdownText text={currentCard.example} />
              </p>
            )}
            {currentCard.notes && (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">
                <MarkdownText text={currentCard.notes} />
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-md bg-blue-600 px-4 py-4 text-lg font-medium text-white transition-colors hover:bg-blue-700"
          >
            Mostrar respuesta
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATING_BUTTONS.map(({ rating, label, className }) => {
              const preview = session.previewFor(rating)
              return (
                <button
                  key={rating}
                  type="button"
                  onClick={() => void handleAnswer(rating)}
                  className={`flex flex-col items-center rounded-md px-2 py-3 font-medium text-white transition-colors ${className}`}
                >
                  <span>{label}</span>
                  {preview && (
                    <span className="text-xs opacity-90">
                      {formatInterval(preview.due, new Date())}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
