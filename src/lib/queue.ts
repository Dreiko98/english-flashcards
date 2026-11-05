import type { CardState } from './scheduler'
import { addStudyDays, studyDayStart } from './studyDay'

export interface QueueCard {
  id: string
  deckId: string
  state: CardState
  due: Date
  suspended: boolean
  createdAt: Date
}

export interface QueueReviewLog {
  cardId: string
  deckId: string
  stateBefore: CardState
  reviewedAt: Date
}

export interface DeckNewLimit {
  deckId: string
  newPerDay: number
}

export interface BuildQueueOptions {
  now: Date
  dayStartsAtHour: number
  /** Insert one new card after every N review cards. */
  newEveryNReviews?: number
  /** Window size for the light shuffle applied to due reviews. */
  shuffleChunkSize?: number
  rng?: () => number
}

export function countNewStudiedToday(
  logs: QueueReviewLog[],
  deckId: string,
  studyDayBoundary: Date,
): number {
  return logs.filter(
    (log) =>
      log.deckId === deckId &&
      log.stateBefore === 'new' &&
      log.reviewedAt.getTime() >= studyDayBoundary.getTime(),
  ).length
}

/** Shuffles within fixed-size windows so the result stays roughly due-date ordered. */
function shuffleInChunks<T>(items: T[], chunkSize: number, rng: () => number): T[] {
  const result: T[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    for (let j = chunk.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1))
      ;[chunk[j], chunk[k]] = [chunk[k], chunk[j]]
    }
    result.push(...chunk)
  }
  return result
}

function interleave<T>(primary: T[], toInsert: T[], every: number): T[] {
  if (toInsert.length === 0) return primary
  const result: T[] = []
  let insertIndex = 0
  for (let i = 0; i < primary.length; i++) {
    result.push(primary[i])
    if ((i + 1) % every === 0 && insertIndex < toInsert.length) {
      result.push(toInsert[insertIndex])
      insertIndex++
    }
  }
  while (insertIndex < toInsert.length) {
    result.push(toInsert[insertIndex])
    insertIndex++
  }
  return result
}

/**
 * Builds the ordered study queue for a session: overdue learning/relearning cards first
 * (highest priority), then due reviews interleaved with new cards (capped per deck by
 * new_per_day minus new cards already studied today). If nothing is due yet but some
 * learning/relearning cards are scheduled later today, they're shown early instead of
 * ending the session, same as Anki does.
 */
export function buildStudyQueue(
  cards: QueueCard[],
  logs: QueueReviewLog[],
  deckLimits: DeckNewLimit[],
  options: BuildQueueOptions,
): QueueCard[] {
  const {
    now,
    dayStartsAtHour,
    newEveryNReviews = 3,
    shuffleChunkSize = 5,
    rng = Math.random,
  } = options

  const active = cards.filter((card) => !card.suspended)
  const studyBoundary = studyDayStart(now, dayStartsAtHour)
  const endOfStudyDay = addStudyDays(now, 1, dayStartsAtHour)

  const dueLearning = active
    .filter((card) => (card.state === 'learning' || card.state === 'relearning') && card.due <= now)
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  const dueReview = active
    .filter((card) => card.state === 'review' && card.due <= endOfStudyDay)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
  const shuffledReview = shuffleInChunks(dueReview, shuffleChunkSize, rng)

  const deckIds = new Set(active.map((card) => card.deckId))
  const remainingNewByDeck = new Map<string, number>()
  for (const deckId of deckIds) {
    const limit = deckLimits.find((d) => d.deckId === deckId)?.newPerDay ?? 0
    const studiedToday = countNewStudiedToday(logs, deckId, studyBoundary)
    remainingNewByDeck.set(deckId, Math.max(0, limit - studiedToday))
  }

  const newCards = active
    .filter((card) => card.state === 'new')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .filter((card) => {
      const remaining = remainingNewByDeck.get(card.deckId) ?? 0
      if (remaining <= 0) return false
      remainingNewByDeck.set(card.deckId, remaining - 1)
      return true
    })

  const queue = [...dueLearning, ...interleave(shuffledReview, newCards, newEveryNReviews)]
  if (queue.length > 0) return queue

  const notYetDueLearning = active
    .filter((card) => card.state === 'learning' || card.state === 'relearning')
    .sort((a, b) => a.due.getTime() - b.due.getTime())

  return notYetDueLearning
}
