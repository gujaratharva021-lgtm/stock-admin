export default function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'brand' | 'amber' | 'red'
}) {
  const text = {
    default: 'text-ink',
    brand: 'text-brand-dark',
    amber: 'text-amber',
    red: 'text-red',
  }[tone]
  const bar = {
    default: 'bg-border-strong',
    brand: 'bg-brand',
    amber: 'bg-amber',
    red: 'bg-red',
  }[tone]

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface px-5 py-4 shadow-card transition-shadow hover:shadow-pop">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <div className="mb-1.5 text-xs font-medium text-muted">{label}</div>
      <div className={`text-2xl font-semibold tabular ${text}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-2">{hint}</div>}
    </div>
  )
}