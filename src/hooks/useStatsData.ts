import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CardState } from '@/lib/scheduler'

export interface StatsLog {
  rating: 1 | 2 | 3 | 4
  stateBefore: CardState
  intervalBefore: number
  reviewedAt: Date
}

export interface StatsCard {
  state: CardState
  due: Date
  suspended: boolean
}

export function useStatsData() {
  const [logs, setLogs] = useState<StatsLog[]>([])
  const [cards, setCards] = useState<StatsCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [logsRes, cardsRes] = await Promise.all([
        supabase.from('review_logs').select('rating, state_before, interval_before, reviewed_at'),
        supabase.from('cards').select('state, due, suspended'),
      ])
      const firstError = logsRes.error ?? cardsRes.error
      if (firstError) {
        setError(firstError.message)
        setLoading(false)
        return
      }
      setLogs(
        (logsRes.data ?? []).map((log) => ({
          rating: log.rating,
          stateBefore: log.state_before,
          intervalBefore: log.interval_before,
          reviewedAt: new Date(log.reviewed_at),
        })),
      )
      setCards(
        (cardsRes.data ?? []).map((card) => ({
          state: card.state,
          due: new Date(card.due),
          suspended: card.suspended,
        })),
      )
      setLoading(false)
    }
    void load()
  }, [])

  return { logs, cards, loading, error }
}
