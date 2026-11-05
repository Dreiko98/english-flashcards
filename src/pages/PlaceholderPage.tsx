interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  )
}
