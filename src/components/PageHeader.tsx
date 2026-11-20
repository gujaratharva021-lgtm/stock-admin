import type { ReactNode } from 'react'

export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-border bg-surface/90 px-6 py-3 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}