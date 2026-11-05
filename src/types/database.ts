import type { CardState } from '@/lib/scheduler'

export interface DeckRow {
  id: string
  user_id: string
  name: string
  description: string | null
  new_per_day: number
  created_at: string
  updated_at: string
}

export type DeckInsert = Partial<
  Pick<DeckRow, 'id' | 'user_id' | 'description' | 'new_per_day' | 'created_at' | 'updated_at'>
> &
  Pick<DeckRow, 'name'>

export type DeckUpdate = Partial<Omit<DeckRow, 'id'>>

export interface CardRow {
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

export type CardInsert = Partial<Omit<CardRow, 'id' | 'deck_id' | 'front' | 'back' | 'user_id'>> &
  Pick<CardRow, 'deck_id' | 'front' | 'back'>

export type CardUpdate = Partial<Omit<CardRow, 'id'>>

export interface ReviewLogRow {
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

export type ReviewLogInsert = Partial<Omit<ReviewLogRow, 'id' | 'reviewed_at' | 'user_id'>> &
  Pick<
    ReviewLogRow,
    | 'card_id'
    | 'deck_id'
    | 'rating'
    | 'state_before'
    | 'interval_before'
    | 'interval_after'
    | 'ease_after'
  >

/** Mirrors the ScheduleResult shape from src/lib/scheduler.ts, serialized for the RPC call. */
export interface ReviewCardNewState {
  state: CardState
  due: string
  intervalDays: number
  ease: number
  step: number
  reps: number
  lapses: number
}

export interface ReviewCardArgs {
  p_card_id: string
  p_rating: 1 | 2 | 3 | 4
  p_new_state: ReviewCardNewState
  p_duration_ms: number
}

export interface Database {
  public: {
    Tables: {
      decks: { Row: DeckRow; Insert: DeckInsert; Update: DeckUpdate }
      cards: { Row: CardRow; Insert: CardInsert; Update: CardUpdate }
      review_logs: {
        Row: ReviewLogRow
        Insert: ReviewLogInsert
        Update: Partial<ReviewLogInsert>
      }
    }
    Functions: {
      review_card: { Args: ReviewCardArgs; Returns: void }
    }
  }
}
