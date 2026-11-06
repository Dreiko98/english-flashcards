import { supabase } from '@/lib/supabase'

export async function createDeck(name: string, description: string, newPerDay: number) {
  const { error } = await supabase
    .from('decks')
    .insert({ name, description: description || null, new_per_day: newPerDay })
  if (error) throw error
}

export async function updateDeck(
  id: string,
  fields: { name: string; description: string; newPerDay: number },
) {
  const { error } = await supabase
    .from('decks')
    .update({
      name: fields.name,
      description: fields.description || null,
      new_per_day: fields.newPerDay,
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteDeck(id: string) {
  const { error } = await supabase.from('decks').delete().eq('id', id)
  if (error) throw error
}
