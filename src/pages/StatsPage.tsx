import { DailyBarChart } from '@/components/DailyBarChart'
import { StatTile } from '@/components/StatTile'
import { useStatsData } from '@/hooks/useStatsData'
import { DEFAULT_SCHEDULER_CONFIG } from '@/lib/scheduler'
import {
  computeAccuracyByMaturity,
  computeForecast,
  computeReviewsPerDay,
  computeStateCounts,
} from '@/lib/stats'
import { computeMaxStreak, computeStreak } from '@/lib/streak'

const DAY_STARTS_AT_HOUR = DEFAULT_SCHEDULER_CONFIG.dayStartsAtHour

const STATE_LABELS = {
  new: 'Nuevas',
  learning: 'Aprendiendo',
  review: 'Repaso',
  relearning: 'Reaprendiendo',
} as const

export function StatsPage() {
  const { logs, cards, loading, error } = useStatsData()

  if (loading) return <p className="text-slate-500">Cargando estadísticas…</p>
  if (error) {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        No se pudieron cargar las estadísticas: {error}
      </p>
    )
  }

  const now = new Date()
  const reviewedAtDates = logs.map((log) => log.reviewedAt)
  const streak = computeStreak(reviewedAtDates, now, DAY_STARTS_AT_HOUR)
  const maxStreak = computeMaxStreak(reviewedAtDates, DAY_STARTS_AT_HOUR)
  const reviewsPerDay = computeReviewsPerDay(reviewedAtDates, now, 30, DAY_STARTS_AT_HOUR)
  const forecast = computeForecast(cards, now, 14, DAY_STARTS_AT_HOUR)
  const accuracy = computeAccuracyByMaturity(logs)
  const stateCounts = computeStateCounts(cards)

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <h1 className="text-2xl font-bold">Estadísticas</h1>

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Racha actual (días)" value={streak} />
          <StatTile label="Racha máxima (días)" value={maxStreak} />
          <StatTile
            label="Aciertos maduras"
            value={accuracy.matureAccuracy === null ? '—' : `${accuracy.matureAccuracy}%`}
          />
          <StatTile
            label="Aciertos jóvenes"
            value={accuracy.youngAccuracy === null ? '—' : `${accuracy.youngAccuracy}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Repasos por día (últimos 30 días)</h2>
        <DailyBarChart data={reviewsPerDay} title="Repasos" />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Previsión (próximos 14 días)</h2>
        <DailyBarChart data={forecast} title="Tarjetas que vencen" />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Tarjetas por estado</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(STATE_LABELS) as (keyof typeof STATE_LABELS)[]).map((state) => (
            <StatTile key={state} label={STATE_LABELS[state]} value={stateCounts[state]} />
          ))}
        </div>
      </section>
    </div>
  )
}
