import { toCsv } from '@/lib/csv'
import type { ParsedImportRow } from '@/lib/importParser'
import { supabase } from '@/lib/supabase'
import type { CardRow, DeckRow, ReviewLogRow } from '@/types/database'

export async function getExistingFronts(deckId: string): Promise<string[]> {
  const { data, error } = await supabase.from('cards').select('front').eq('deck_id', deckId)
  if (error) throw error
  return (data ?? []).map((card) => card.front)
}

export async function bulkCreateCards(deckId: string, rows: ParsedImportRow[]) {
  if (rows.length === 0) return
  const payload = rows.map((row) => ({
    deck_id: deckId,
    front: row.front,
    back: row.back,
    example: row.example ?? null,
    notes: row.notes ?? null,
  }))
  const { error } = await supabase.from('cards').insert(payload)
  if (error) throw error
}

export async function exportDeckCsv(deckId: string): Promise<string> {
  const { data, error } = await supabase
    .from('cards')
    .select('front, back, example, notes, tags, tts_lang')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = [
    ['front', 'back', 'example', 'notes', 'tags', 'tts_lang'],
    ...(data ?? []).map((card) => [
      card.front,
      card.back,
      card.example ?? '',
      card.notes ?? '',
      card.tags.join('|'),
      card.tts_lang,
    ]),
  ]
  return toCsv(rows)
}

export interface BackupData {
  version: 1
  exportedAt: string
  decks: DeckRow[]
  cards: CardRow[]
  reviewLogs: ReviewLogRow[]
}

export async function exportBackupJson(): Promise<BackupData> {
  const [decksRes, cardsRes, logsRes] = await Promise.all([
    supabase.from('decks').select('*'),
    supabase.from('cards').select('*'),
    supabase.from('review_logs').select('*'),
  ])
  if (decksRes.error) throw decksRes.error
  if (cardsRes.error) throw cardsRes.error
  if (logsRes.error) throw logsRes.error

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    decks: decksRes.data ?? [],
    cards: cardsRes.data ?? [],
    reviewLogs: logsRes.data ?? [],
  }
}

/**
 * Restores a backup as brand-new rows (new ids), remapping deck/card references as it goes.
 * This never overwrites existing data, so restoring twice just duplicates everything -- simplest
 * safe behavior given this is a personal, single-user app.
 */
export async function restoreBackup(
  backup: BackupData,
): Promise<{ decks: number; cards: number; logs: number }> {
  const deckIdMap = new Map<string, string>()
  const cardIdMap = new Map<string, string>()

  for (const deck of backup.decks) {
    const { data, error } = await supabase
      .from('decks')
      .insert({ name: deck.name, description: deck.description, new_per_day: deck.new_per_day })
      .select('id')
      .single()
    if (error) throw error
    deckIdMap.set(deck.id, data.id)
  }

  for (const card of backup.cards) {
    const newDeckId = deckIdMap.get(card.deck_id)
    if (!newDeckId) continue
    const { data, error } = await supabase
      .from('cards')
      .insert({
        deck_id: newDeckId,
        front: card.front,
        back: card.back,
        example: card.example,
        notes: card.notes,
        tags: card.tags,
        tts_lang: card.tts_lang,
        state: card.state,
        due: card.due,
        interval_days: card.interval_days,
        ease: card.ease,
        step: card.step,
        reps: card.reps,
        lapses: card.lapses,
        suspended: card.suspended,
      })
      .select('id')
      .single()
    if (error) throw error
    cardIdMap.set(card.id, data.id)
  }

  let logsRestored = 0
  for (const log of backup.reviewLogs) {
    const newCardId = cardIdMap.get(log.card_id)
    const newDeckId = deckIdMap.get(log.deck_id)
    if (!newCardId || !newDeckId) continue
    const { error } = await supabase.from('review_logs').insert({
      card_id: newCardId,
      deck_id: newDeckId,
      rating: log.rating,
      state_before: log.state_before,
      interval_before: log.interval_before,
      interval_after: log.interval_after,
      ease_after: log.ease_after,
      duration_ms: log.duration_ms,
      reviewed_at: log.reviewed_at,
    })
    if (error) throw error
    logsRestored++
  }

  return { decks: deckIdMap.size, cards: cardIdMap.size, logs: logsRestored }
}
