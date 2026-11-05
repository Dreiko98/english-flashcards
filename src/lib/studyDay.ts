/**
 * The "study day" doesn't start at local midnight but at `dayStartsAtHour` (04:00 by default,
 * matching Anki), so a session that runs past midnight still counts as the same day.
 */
export function studyDayStart(date: Date, dayStartsAtHour: number): Date {
  const start = new Date(date)
  start.setHours(dayStartsAtHour, 0, 0, 0)
  if (date.getTime() < start.getTime()) {
    start.setDate(start.getDate() - 1)
  }
  return start
}

export function addStudyDays(date: Date, days: number, dayStartsAtHour: number): Date {
  const start = studyDayStart(date, dayStartsAtHour)
  start.setDate(start.getDate() + days)
  return start
}
