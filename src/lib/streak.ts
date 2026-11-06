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

/** Longest run of consecutive study days anywhere in the history, not just ending today. */
export function computeMaxStreak(reviewedAt: Date[], dayStartsAtHour: number): number {
  if (reviewedAt.length === 0) return 0

  const studyDayTimes = Array.from(
    new Set(reviewedAt.map((date) => studyDayStart(date, dayStartsAtHour).getTime())),
  ).sort((a, b) => a - b)

  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  let longest = 1
  let current = 1
  for (let i = 1; i < studyDayTimes.length; i++) {
    const gapDays = Math.round((studyDayTimes[i] - studyDayTimes[i - 1]) / ONE_DAY_MS)
    current = gapDays === 1 ? current + 1 : 1
    longest = Math.max(longest, current)
  }
  return longest
}
