import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { submitReview, undoReview } from '@/lib/api/reviews'
import {
  buildStudyQueue,
  type DeckNewLimit,
  type QueueCard,
  type QueueReviewLog,
} from '@/lib/queue'
import {
  DEFAULT_SCHEDULER_CONFIG,
  schedule,
  type Rating,
  type SchedulableCard,
} from '@/lib/scheduler'
import { studyDayStart } from '@/lib/studyDay'
import { supabase } from '@/lib/supabase'
import type { CardRow, ReviewCardNewState } from '@/types/database'

interface HistoryEntry {
  cardId: string
  previousCard: CardRow
  rating: Rating
}

interface SessionStats {
  total: number
  correct: number
}

const DAY_STARTS_AT_HOUR = DEFAULT_SCHEDULER_CONFIG.dayStartsAtHour

function toSchedulableCard(card: CardRow): SchedulableCard {
  return {
    state: card.state,
    due: new Date(card.due),
    intervalDays: card.interval_days,
    ease: card.ease,
    step: card.step,
    reps: card.reps,
    lapses: card.lapses,
  }
}

function toQueueCard(card: CardRow): QueueCard {
  return {
    id: card.id,
    deckId: card.deck_id,
    state: card.state,
    due: new Date(card.due),
    suspended: card.suspended,
    createdAt: new Date(card.created_at),
  }
}

export function useStudySession(scope: string) {
  const isAll = scope === 'all'
  const [cardsById, setCardsById] = useState<Record<string, CardRow>>({})
  const [deckLimits, setDeckLimits] = useState<DeckNewLimit[]>([])
  const [todayLogs, setTodayLogs] = useState<QueueReviewLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [stats, setStats] = useState<SessionStats>({ total: 0, correct: 0 })
  const cardShownAtRef = useRef(0)

  const refetch = useCallback(async () => {
    const dayStartsAtHour = DAY_STARTS_AT_HOUR
    const studyBoundary = studyDayStart(new Date(), dayStartsAtHour)

    let cardsQuery = supabase.from('cards').select('*')
    let decksQuery = supabase.from('decks').select('id, new_per_day')
    if (!isAll) {
      cardsQuery = cardsQuery.eq('deck_id', scope)
      decksQuery = decksQuery.eq('id', scope)
    }

    const [cardsRes, decksRes, logsRes] = await Promise.all([
      cardsQuery,
      decksQuery,
      supabase
        .from('review_logs')
        .select('card_id, deck_id, state_before, reviewed_at')
        .gte('reviewed_at', studyBoundary.toISOString()),
    ])

    const firstError = cardsRes.error ?? decksRes.error ?? logsRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const byId: Record<string, CardRow> = {}
    for (const card of cardsRes.data ?? []) byId[card.id] = card
    setCardsById(byId)
    setDeckLimits((decksRes.data ?? []).map((d) => ({ deckId: d.id, newPerDay: d.new_per_day })))
    setTodayLogs(
      (logsRes.data ?? []).map((log) => ({
        cardId: log.card_id,
        deckId: log.deck_id,
        stateBefore: log.state_before,
        reviewedAt: new Date(log.reviewed_at),
      })),
    )
    setError(null)
    setLoading(false)
  }, [isAll, scope])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const queue = useMemo(() => {
    const now = new Date()
    const answeredTodayCardIds = new Set(todayLogs.map((log) => log.cardId))
    const eligible = Object.values(cardsById).filter(
      (card) => !(card.state === 'review' && answeredTodayCardIds.has(card.id)),
    )
    return buildStudyQueue(eligible.map(toQueueCard), todayLogs, deckLimits, {
      now,
      dayStartsAtHour: DAY_STARTS_AT_HOUR,
    })
  }, [cardsById, todayLogs, deckLimits])

  const currentCard = queue.length > 0 ? (cardsById[queue[0].id] ?? null) : null

  useEffect(() => {
    cardShownAtRef.current = Date.now()
  }, [currentCard?.id])

  const previewFor = useCallback(
    (rating: Rating) => {
      if (!currentCard) return null
      return schedule(toSchedulableCard(currentCard), rating, new Date())
    },
    [currentCard],
  )

  const answer = useCallback(
    async (rating: Rating) => {
      if (!currentCard) return
      const now = new Date()
      const result = schedule(toSchedulableCard(currentCard), rating, now)
      const durationMs = Date.now() - cardShownAtRef.current
      const previousCard = currentCard

      const newState: ReviewCardNewState = {
        state: result.state,
        due: result.due.toISOString(),
        intervalDays: result.intervalDays,
        ease: result.ease,
        step: result.step,
        reps: result.reps,
        lapses: result.lapses,
      }

      setCardsById((prev) => ({
        ...prev,
        [currentCard.id]: {
          ...currentCard,
          state: result.state,
          due: newState.due,
          interval_days: result.intervalDays,
          ease: result.ease,
          step: result.step,
          reps: result.reps,
          lapses: result.lapses,
        },
      }))
      setTodayLogs((prev) => [
        ...prev,
        {
          cardId: currentCard.id,
          deckId: currentCard.deck_id,
          stateBefore: currentCard.state,
          reviewedAt: now,
        },
      ])
      setHistory((prev) => [...prev, { cardId: currentCard.id, previousCard, rating }])
      setStats((prev) => ({ total: prev.total + 1, correct: prev.correct + (rating > 1 ? 1 : 0) }))

      await submitReview(currentCard.id, rating, newState, durationMs)
    },
    [currentCard],
  )

  const undo = useCallback(async () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory((prev) => prev.slice(0, -1))
    setStats((prev) => ({
      total: Math.max(0, prev.total - 1),
      correct: Math.max(0, prev.correct - (last.rating > 1 ? 1 : 0)),
    }))
    setCardsById((prev) => ({ ...prev, [last.cardId]: last.previousCard }))
    setTodayLogs((prev) => {
      const idx = [...prev].reverse().findIndex((log) => log.cardId === last.cardId)
      if (idx === -1) return prev
      const realIndex = prev.length - 1 - idx
      return [...prev.slice(0, realIndex), ...prev.slice(realIndex + 1)]
    })

    const previousState: ReviewCardNewState = {
      state: last.previousCard.state,
      due: last.previousCard.due,
      intervalDays: last.previousCard.interval_days,
      ease: last.previousCard.ease,
      step: last.previousCard.step,
      reps: last.previousCard.reps,
      lapses: last.previousCard.lapses,
    }
    try {
      await undoReview(last.cardId, previousState)
    } catch {
      // Best effort: if this fails (e.g. offline), the local state is still reverted and the
      // card will simply be re-graded next time it comes up.
    }
  }, [history])

  return {
    loading,
    error,
    currentCard,
    queueLength: queue.length,
    stats,
    answer,
    undo,
    canUndo: history.length > 0,
    previewFor,
  }
}
