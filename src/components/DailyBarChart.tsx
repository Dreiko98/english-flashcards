import type { DailyCount } from '@/lib/stats'

interface DailyBarChartProps {
  data: DailyCount[]
  title: string
}

const SLOT = 10
const BAR_WIDTH = 7
const CHART_HEIGHT = 100

function formatDate(date: Date) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function DailyBarChart({ data, title }: DailyBarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const width = data.length * SLOT

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-32 w-full overflow-visible"
        role="img"
        aria-label={`${title}: ${data.map((d) => `${formatDate(d.date)} ${d.count}`).join(', ')}`}
      >
        <line
          x1={0}
          y1={CHART_HEIGHT}
          x2={width}
          y2={CHART_HEIGHT}
          className="stroke-slate-200 dark:stroke-slate-800"
          strokeWidth={1}
        />
        {data.map((point, i) => {
          const barHeight = (point.count / max) * (CHART_HEIGHT - 8)
          const x = i * SLOT + (SLOT - BAR_WIDTH) / 2
          const y = CHART_HEIGHT - barHeight
          return (
            <rect
              key={point.date.getTime()}
              x={x}
              y={y}
              width={BAR_WIDTH}
              height={Math.max(barHeight, point.count > 0 ? 2 : 0)}
              rx={1.5}
              className="fill-blue-600 dark:fill-blue-400"
            >
              <title>
                {formatDate(point.date)}: {point.count}
              </title>
            </rect>
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{formatDate(data[0].date)}</span>
        <span>{formatDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  )
}
