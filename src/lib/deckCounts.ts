import type { CardState } from './scheduler'
import { addStudyDays } from './studyDay'

export interface DeckCountCard {
  state: CardState
  due: Date
  suspended: boolean
}

export interface DeckCounts {
  newCount: number
  learningCount: number
  reviewCount: number
}

/**
 * Deck-list badge counts, Anki-style: new is capped by the deck's daily limit minus what's
 * already been studied today; learning/relearning counts everything in the pipeline regardless
 * of due time (it'll come due during the session); review only counts what's due by the end of
 * today's study day.
 */
export function computeDeckCounts(
  cards: DeckCountCard[],
  newStudiedToday: number,
  newPerDay: number,
  now: Date,
  dayStartsAtHour: number,
): DeckCounts {
  const active = cards.filter((card) => !card.suspended)
  const endOfStudyDay = addStudyDays(now, 1, dayStartsAtHour)

  const totalNew = active.filter((card) => card.state === 'new').length
  const newCount = Math.max(0, Math.min(totalNew, newPerDay - newStudiedToday))

  const learningCount = active.filter(
    (card) => card.state === 'learning' || card.state === 'relearning',
  ).length

  const reviewCount = active.filter(
    (card) => card.state === 'review' && card.due.getTime() <= endOfStudyDay.getTime(),
  ).length

  return { newCount, learningCount, reviewCount }
}
