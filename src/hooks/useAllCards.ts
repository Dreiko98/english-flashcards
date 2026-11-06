import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CardRow } from '@/types/database'
import type { DeckOption } from './useDeckOptions'

export function useAllCards() {
  const [cards, setCards] = useState<CardRow[]>([])
  const [decks, setDecks] = useState<DeckOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const [cardsRes, decksRes] = await Promise.all([
      supabase.from('cards').select('*').order('created_at', { ascending: false }),
      supabase.from('decks').select('id, name').order('name'),
    ])
    const firstError = cardsRes.error ?? decksRes.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }
    setCards(cardsRes.data ?? [])
    setDecks(decksRes.data ?? [])
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { cards, decks, loading, error, refetch }
}
