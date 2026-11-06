import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface DeckOption {
  id: string
  name: string
}

export function useDeckOptions() {
  const [decks, setDecks] = useState<DeckOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('decks')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setDecks(data ?? [])
        setLoading(false)
      })
  }, [])

  return { decks, loading }
}
