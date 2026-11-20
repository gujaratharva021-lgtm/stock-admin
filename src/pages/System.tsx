import { useEffect, useState } from 'react'
import { api, type SystemHealth } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

type Tone = 'default' | 'brand' | 'amber' | 'red'

const toneFor = (status: string): Tone =>
  status === 'HEALTHY' ? 'brand' : status === 'DEGRADED' ? 'amber' : status === 'DOWN' ? 'red' : 'default'

const badgeCls = (status: string) =>
  status === 'HEALTHY'
    ? 'bg-brand-tint text-brand-dark'
    : status === 'DEGRADED'
      ? 'bg-amber-tint text-amber'
      : status === 'DOWN'
        ? 'bg-red-tint text-red'
        : 'bg-bg text-muted'

const fmtDateTime = (iso?: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return isNaN(d.getTime()) || d.getFullYear() < 2000 ? '-' : d.toLocaleString()
}

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-muted text-xs">
        {text}
      </td>
    </tr>
  )
}

export default function System() {
  const [data, setData] = useState<SystemHealth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  const load = () => {
    api
      .get<SystemHealth>('/admin/system-health')
      .then((r) => {
        setData(r)
        setCheckedAt(new Date())
        setError(null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load system health'))
  }

  useEffect(() => {
    load()
  }, [])

  const job = data?.backgroundJobs.reconcilePendingOrders

  const th = 'px-4 py-2.5 font-medium'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'

  return (
    <div>
      <PageHeader title="System / Configuration" subtitle="Live health of the API, database, background jobs and quote providers" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-ink">System overview</h2>
            <button
              onClick={load}
              className="rounded border border-border-strong bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="API" value={data ? data.api.status : '-'} tone={data ? toneFor(data.api.status) : 'default'} />
            <StatCard label="Database" value={data ? data.database.status : '-'} tone={data ? toneFor(data.database.status) : 'default'} />
            <StatCard label="Reconcile job" value={job ? job.status : '-'} tone={job ? toneFor(job.status) : 'default'} />
          </div>
          <div className="text-xs text-muted mt-3">
            Last checked: {checkedAt ? checkedAt.toLocaleString() : '-'}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Background jobs</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>Job</th>
                  <th className={th}>Status</th>
                  <th className={th}>Last run</th>
                  <th className={th}>Last error</th>
                </tr>
              </thead>
              <tbody>
                {!data && <Empty cols={4} text="Loading..." />}
                {data && job && (
                  <tr className={row}>
                    <td className="px-4 py-2.5 text-ink">Reconcile pending payment orders</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${badgeCls(job.status)}`}>{job.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(job.lastRunAt)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{job.lastError || '-'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Quote providers</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>Provider</th>
                  <th className={th}>Status</th>
                  <th className={th}>Last fetch</th>
                  <th className={th}>Last error</th>
                </tr>
              </thead>
              <tbody>
                {!data && <Empty cols={4} text="Loading..." />}
                {data?.quoteProviders.length === 0 && <Empty cols={4} text="No quote providers reported." />}
                {data?.quoteProviders.map((p) => (
                  <tr key={p.name} className={row}>
                    <td className="px-4 py-2.5 text-ink font-medium">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${badgeCls(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(p.lastFetchAt)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs max-w-lg break-words">{p.lastError || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6 text-center">
          <p className="text-sm text-muted">
            Redis and WebSocket status, feature flags, maintenance mode, integration
            connection status, and environment/version info are not available yet. The
            health endpoint does not report them and there is no backend storage or API
            for these settings, so nothing is shown rather than placeholder data.
          </p>
        </div>
      </div>
    </div>
  )
}