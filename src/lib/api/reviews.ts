import { enqueueReview, getQueuedReviews, removeQueuedReview } from '@/lib/offlineQueue'
import { supabase } from '@/lib/supabase'
import type { ReviewCardNewState } from '@/types/database'

async function callReviewCardRpc(
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  newState: ReviewCardNewState,
  durationMs: number,
) {
  const { error } = await supabase.rpc('review_card', {
    p_card_id: cardId,
    p_rating: rating,
    p_new_state: newState,
    p_duration_ms: durationMs,
  })
  if (error) throw error
}

/** Tries to sync immediately; on any failure (offline included) queues it in localStorage. */
export async function submitReview(
  cardId: string,
  rating: 1 | 2 | 3 | 4,
  newState: ReviewCardNewState,
  durationMs: number,
): Promise<{ synced: boolean }> {
  try {
    await callReviewCardRpc(cardId, rating, newState, durationMs)
    return { synced: true }
  } catch {
    enqueueReview({ cardId, rating, newState, durationMs })
    return { synced: false }
  }
}

/** Flushes the offline queue in order, stopping at the first failure so nothing gets skipped. */
export async function syncOfflineReviews(): Promise<{ succeeded: number; remaining: number }> {
  const queued = getQueuedReviews()
  let succeeded = 0
  for (const item of queued) {
    try {
      await callReviewCardRpc(item.cardId, item.rating, item.newState, item.durationMs)
      removeQueuedReview(item.id)
      succeeded++
    } catch {
      break
    }
  }
  return { succeeded, remaining: getQueuedReviews().length }
}

/** Reverts a card to its pre-review state and deletes the matching log row (best effort). */
export async function undoReview(cardId: string, previousState: ReviewCardNewState) {
  const { error: updateError } = await supabase
    .from('cards')
    .update({
      state: previousState.state,
      due: previousState.due,
      interval_days: previousState.intervalDays,
      ease: previousState.ease,
      step: previousState.step,
      reps: previousState.reps,
      lapses: previousState.lapses,
    })
    .eq('id', cardId)
  if (updateError) throw updateError

  const { data: logs, error: selectError } = await supabase
    .from('review_logs')
    .select('id')
    .eq('card_id', cardId)
    .order('reviewed_at', { ascending: false })
    .limit(1)
  if (selectError) throw selectError
  if (logs && logs.length > 0) {
    const { error: deleteError } = await supabase.from('review_logs').delete().eq('id', logs[0].id)
    if (deleteError) throw deleteError
  }
}
