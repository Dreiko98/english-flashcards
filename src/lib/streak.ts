import { studyDayStart } from './studyDay'

/**
 * Consecutive study days ending at today, walking backward. If today hasn't been studied yet,
 * the streak isn't broken until the day actually ends — so we start counting from yesterday
 * instead, as long as yesterday was studied.
 */
export function computeStreak(reviewedAt: Date[], now: Date, dayStartsAtHour: number): number {
  if (reviewedAt.length === 0) return 0

  const studyDays = new Set(
    reviewedAt.map((date) => studyDayStart(date, dayStartsAtHour).getTime()),
  )

  let cursor = studyDayStart(now, dayStartsAtHour)
  if (!studyDays.has(cursor.getTime())) {
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (studyDays.has(cursor.getTime())) {
    streak++
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
