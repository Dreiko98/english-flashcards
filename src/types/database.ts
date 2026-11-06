import type { CardState } from '@/lib/scheduler'

// Every shape below is a `type` alias, not an `interface`. supabase-js's generic Database
// constraint check (Schema extends GenericSchema ? Schema : never) silently collapses to
// `never` for ANY table whose Row/Insert/Update is declared with `interface` instead of a
// plain object `type` — same fields, same structure, interface alone breaks it. Confirmed by
// bisecting in isolation against a minimal repro; keep these as `type` to avoid regressing.
export type DeckRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  new_per_day: number
  created_at: string
  updated_at: string
}

export type DeckInsert = {
  id?: string
  user_id?: string
  name: string
  description?: string | null
  new_per_day?: number
  created_at?: string
  updated_at?: string
}

export type DeckUpdate = {
  user_id?: string
  name?: string
  description?: string | null
  new_per_day?: number
  created_at?: string
  updated_at?: string
}

export type CardRow = {
  id: string
  user_id: string
  deck_id: string
  front: string
  back: string
  example: string | null
  notes: string | null
  tags: string[]
  tts_lang: string
  state: CardState
  due: string
  interval_days: number
  ease: number
  step: number
  reps: number
  lapses: number
  suspended: boolean
  created_at: string
  updated_at: string
}

export type CardInsert = {
  id?: string
  user_id?: string
  deck_id: string
  front: string
  back: string
  example?: string | null
  notes?: string | null
  tags?: string[]
  tts_lang?: string
  state?: CardState
  due?: string
  interval_days?: number
  ease?: number
  step?: number
  reps?: number
  lapses?: number
  suspended?: boolean
  created_at?: string
  updated_at?: string
}

export type CardUpdate = {
  user_id?: string
  deck_id?: string
  front?: string
  back?: string
  example?: string | null
  notes?: string | null
  tags?: string[]
  tts_lang?: string
  state?: CardState
  due?: string
  interval_days?: number
  ease?: number
  step?: number
  reps?: number
  lapses?: number
  suspended?: boolean
  created_at?: string
  updated_at?: string
}

export type ReviewLogRow = {
  id: string
  user_id: string
  card_id: string
  deck_id: string
  rating: 1 | 2 | 3 | 4
  state_before: CardState
  interval_before: number
  interval_after: number
  ease_after: number
  duration_ms: number
  reviewed_at: string
}

export type ReviewLogInsert = {
  id?: string
  user_id?: string
  card_id: string
  deck_id: string
  rating: 1 | 2 | 3 | 4
  state_before: CardState
  interval_before: number
  interval_after: number
  ease_after: number
  duration_ms?: number
  reviewed_at?: string
}

export type ReviewLogUpdate = {
  user_id?: string
  card_id?: string
  deck_id?: string
  rating?: 1 | 2 | 3 | 4
  state_before?: CardState
  interval_before?: number
  interval_after?: number
  ease_after?: number
  duration_ms?: number
  reviewed_at?: string
}

/** Mirrors the ScheduleResult shape from src/lib/scheduler.ts, serialized for the RPC call. */
export type ReviewCardNewState = {
  state: CardState
  due: string
  intervalDays: number
  ease: number
  step: number
  reps: number
  lapses: number
}

export type ReviewCardArgs = {
  p_card_id: string
  p_rating: 1 | 2 | 3 | 4
  p_new_state: ReviewCardNewState
  p_duration_ms: number
}

export type Database = {
  public: {
    Tables: {
      decks: { Row: DeckRow; Insert: DeckInsert; Update: DeckUpdate; Relationships: [] }
      cards: { Row: CardRow; Insert: CardInsert; Update: CardUpdate; Relationships: [] }
      review_logs: {
        Row: ReviewLogRow
        Insert: ReviewLogInsert
        Update: ReviewLogUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      review_card: { Args: ReviewCardArgs; Returns: void }
    }
  }
}
