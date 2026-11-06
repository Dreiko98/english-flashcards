import type { ReviewCardNewState } from '@/types/database'

const STORAGE_KEY = 'flashcards:offline-review-queue'

export interface QueuedReview {
  id: string
  cardId: string
  rating: 1 | 2 | 3 | 4
  newState: ReviewCardNewState
  durationMs: number
  queuedAt: string
}

function readQueue(): QueuedReview[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QueuedReview[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedReview[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

export function enqueueReview(entry: Omit<QueuedReview, 'id' | 'queuedAt'>) {
  const queue = readQueue()
  queue.push({ ...entry, id: crypto.randomUUID(), queuedAt: new Date().toISOString() })
  writeQueue(queue)
}

export function getQueuedReviews(): QueuedReview[] {
  return readQueue()
}

export function removeQueuedReview(id: string) {
  writeQueue(readQueue().filter((item) => item.id !== id))
}
