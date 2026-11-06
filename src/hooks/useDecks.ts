import { useCallback, useEffect, useState } from 'react'
import { computeDeckCounts, type DeckCounts } from '@/lib/deckCounts'
import { DEFAULT_SCHEDULER_CONFIG } from '@/lib/scheduler'
import { computeStreak } from '@/lib/streak'
import { studyDayStart } from '@/lib/studyDay'
import { supabase } from '@/lib/supabase'
import type { DeckRow } from '@/types/database'

export interface DeckSummary extends DeckRow {
  counts: DeckCounts
}

export interface DailySummary {
  totalPending: number
  reviewsToday: number
  streak: number
}

const EMPTY_DAILY: DailySummary = { totalPending: 0, reviewsToday: 0, streak: 0 }

export function useDecks() {
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [daily, setDaily] = useState<DailySummary>(EMPTY_DAILY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const now = new Date()
    const dayStartsAtHour = DEFAULT_SCHEDULER_CONFIG.dayStartsAtHour
    const studyBoundary = studyDayStart(now, dayStartsAtHour)
    const streakWindowStart = new Date(studyBoundary)
    streakWindowStart.setDate(streakWindowStart.getDate() - 120)

    const [decksRes, cardsRes, todayLogsRes, streakLogsRes] = await Promise.all([
      supabase.from('decks').select('*').order('created_at', { ascending: true }),
      supabase.from('cards').select('id, deck_id, state, due, suspended'),
      supabase
        .from('review_logs')
        .select('deck_id, state_before')
        .gte('reviewed_at', studyBoundary.toISOString()),
      supabase
        .from('review_logs')
        .select('reviewed_at')
        .gte('reviewed_at', streakWindowStart.toISOString()),
    ])

    const firstError = decksRes.error ?? cardsRes.error ?? todayLogsRes.error ?? streakLogsRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const deckRows = decksRes.data ?? []
    const cardRows = cardsRes.data ?? []
    const todayLogs = todayLogsRes.data ?? []
    const streakLogs = streakLogsRes.data ?? []

    const summaries: DeckSummary[] = deckRows.map((deck) => {
      const deckCards = cardRows
        .filter((card) => card.deck_id === deck.id)
        .map((card) => ({ state: card.state, due: new Date(card.due), suspended: card.suspended }))
      const newStudiedToday = todayLogs.filter(
        (log) => log.deck_id === deck.id && log.state_before === 'new',
      ).length
      const counts = computeDeckCounts(
        deckCards,
        newStudiedToday,
        deck.new_per_day,
        now,
        dayStartsAtHour,
      )
      return { ...deck, counts }
    })

    const totalPending = summaries.reduce(
      (sum, deck) =>
        sum + deck.counts.newCount + deck.counts.learningCount + deck.counts.reviewCount,
      0,
    )
    const streak = computeStreak(
      streakLogs.map((log) => new Date(log.reviewed_at)),
      now,
      dayStartsAtHour,
    )

    setDecks(summaries)
    setDaily({ totalPending, reviewsToday: todayLogs.length, streak })
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { decks, daily, loading, error, refetch }
}
