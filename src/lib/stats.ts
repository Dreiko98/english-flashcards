import type { CardState } from './scheduler'
import { addStudyDays, studyDayStart } from './studyDay'

export interface DailyCount {
  date: Date
  count: number
}

/** Buckets review timestamps into the last `days` study-days, oldest first, including zeros. */
export function computeReviewsPerDay(
  reviewedAt: Date[],
  now: Date,
  days: number,
  dayStartsAtHour: number,
): DailyCount[] {
  const todayStart = studyDayStart(now, dayStartsAtHour)
  const counts = new Map<number, number>()
  for (const date of reviewedAt) {
    const key = studyDayStart(date, dayStartsAtHour).getTime()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const result: DailyCount[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addStudyDays(todayStart, -offset, dayStartsAtHour)
    result.push({ date, count: counts.get(date.getTime()) ?? 0 })
  }
  return result
}

/** Review-state cards due in each of the next `days` study-days, oldest first, including zeros. */
export function computeForecast(
  cards: { state: CardState; due: Date; suspended: boolean }[],
  now: Date,
  days: number,
  dayStartsAtHour: number,
): DailyCount[] {
  const todayStart = studyDayStart(now, dayStartsAtHour)
  const dueCards = cards.filter((card) => card.state === 'review' && !card.suspended)

  const result: DailyCount[] = []
  for (let offset = 0; offset < days; offset++) {
    const dayStart = addStudyDays(todayStart, offset, dayStartsAtHour)
    const dayEnd = addStudyDays(todayStart, offset + 1, dayStartsAtHour)
    const count = dueCards.filter(
      (card) => card.due.getTime() >= dayStart.getTime() && card.due.getTime() < dayEnd.getTime(),
    ).length
    result.push({ date: dayStart, count })
  }
  return result
}

export interface MaturityAccuracy {
  matureAccuracy: number | null
  matureTotal: number
  youngAccuracy: number | null
  youngTotal: number
}

/** Anki's definition: a review card is "mature" once its interval reaches 21 days. */
const MATURE_INTERVAL_DAYS = 21

export function computeAccuracyByMaturity(
  logs: { stateBefore: CardState; intervalBefore: number; rating: 1 | 2 | 3 | 4 }[],
): MaturityAccuracy {
  const reviewLogs = logs.filter((log) => log.stateBefore === 'review')
  const mature = reviewLogs.filter((log) => log.intervalBefore >= MATURE_INTERVAL_DAYS)
  const young = reviewLogs.filter((log) => log.intervalBefore < MATURE_INTERVAL_DAYS)

  const accuracy = (group: typeof reviewLogs) =>
    group.length === 0
      ? null
      : Math.round((group.filter((log) => log.rating > 1).length / group.length) * 100)

  return {
    matureAccuracy: accuracy(mature),
    matureTotal: mature.length,
    youngAccuracy: accuracy(young),
    youngTotal: young.length,
  }
}

export function computeStateCounts(
  cards: { state: CardState; suspended: boolean }[],
): Record<CardState, number> {
  const counts: Record<CardState, number> = { new: 0, learning: 0, review: 0, relearning: 0 }
  for (const card of cards) {
    if (card.suspended) continue
    counts[card.state]++
  }
  return counts
}
