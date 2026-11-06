import { DEFAULT_SCHEDULER_CONFIG } from '@/lib/scheduler'
import { supabase } from '@/lib/supabase'

export interface CardInput {
  deckId: string
  front: string
  back: string
  example: string
  notes: string
  tags: string[]
  ttsLang: string
}

function toRow(input: CardInput) {
  return {
    deck_id: input.deckId,
    front: input.front,
    back: input.back,
    example: input.example || null,
    notes: input.notes || null,
    tags: input.tags,
    tts_lang: input.ttsLang,
  }
}

export async function getCard(id: string) {
  const { data, error } = await supabase.from('cards').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createCard(input: CardInput) {
  const { error } = await supabase.from('cards').insert(toRow(input))
  if (error) throw error
}

export async function updateCard(id: string, input: CardInput) {
  const { error } = await supabase.from('cards').update(toRow(input)).eq('id', id)
  if (error) throw error
}

export async function deleteCards(ids: string[]) {
  const { error } = await supabase.from('cards').delete().in('id', ids)
  if (error) throw error
}

export async function setSuspended(ids: string[], suspended: boolean) {
  const { error } = await supabase.from('cards').update({ suspended }).in('id', ids)
  if (error) throw error
}

export async function resetCards(ids: string[]) {
  const { error } = await supabase
    .from('cards')
    .update({
      state: 'new',
      due: new Date().toISOString(),
      interval_days: 0,
      ease: DEFAULT_SCHEDULER_CONFIG.startingEase,
      step: 0,
      reps: 0,
      lapses: 0,
    })
    .in('id', ids)
  if (error) throw error
}

export async function moveCards(ids: string[], deckId: string) {
  const { error } = await supabase.from('cards').update({ deck_id: deckId }).in('id', ids)
  if (error) throw error
}
