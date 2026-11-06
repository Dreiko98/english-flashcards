export function formatInterval(dueDate: Date, now: Date): string {
  const ms = Math.max(0, dueDate.getTime() - now.getTime())
  const minutes = ms / 60_000
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = minutes / 60
  if (hours < 24) return `${Math.round(hours)} h`
  const days = hours / 24
  return `${Math.round(days)} d`
}
