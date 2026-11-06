interface StatTileProps {
  label: string
  value: string | number
}

export function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 text-center dark:border-slate-800">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
