import { useEffect, useMemo, useState } from 'react'
import { api, type AuditLog } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

type ResultFilter = 'all' | 'SUCCESS' | 'FAILURE'

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString()

const inputCls =
  'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-muted text-xs">
        {text}
      </td>
    </tr>
  )
}

export default function Reports() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')

  useEffect(() => {
    api
      .get<{ logs: AuditLog[] }>('/admin/audit-logs')
      .then((r) => setLogs(r.logs ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'))
  }, [])

  const filtered = useMemo(() => {
    if (!logs) return null
    const q = search.trim().toLowerCase()
    return logs.filter(
      (l) =>
        (resultFilter === 'all' || l.result === resultFilter) &&
        (!q ||
          String(l.action ?? '').toLowerCase().includes(q) ||
          (l.resource_id ?? '').toLowerCase().includes(q) ||
          (l.resource_type ?? '').toLowerCase().includes(q) ||
          (l.ip_address ?? '').toLowerCase().includes(q) ||
          (l.user_id ?? '').toLowerCase().includes(q))
    )
  }, [logs, search, resultFilter])

  const successCount = logs?.filter((l) => l.result === 'SUCCESS').length ?? 0
  const failureCount = logs?.filter((l) => l.result === 'FAILURE').length ?? 0

  const th = 'px-4 py-2.5 font-medium'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'

  return (
    <div>
      <PageHeader title="Reports & Audit" subtitle="Audit log of recorded platform activity" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">
            Overview {logs ? `(latest ${logs.length} logs)` : ''}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Logs loaded" value={logs ? logs.length : '-'} />
            <StatCard label="Successful" value={logs ? successCount : '-'} tone="brand" />
            <StatCard label="Failed" value={logs ? failureCount : '-'} tone="red" />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Filters</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search action, resource, IP, user ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputCls} w-72`}
            />
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
              className={inputCls}
            >
              <option value="all">All results</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILURE">Failure</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">
            Audit log {filtered && logs ? `(${filtered.length} of ${logs.length})` : ''}
          </h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>Timestamp</th>
                  <th className={th}>Action</th>
                  <th className={th}>Result</th>
                  <th className={th}>Resource type</th>
                  <th className={th}>Resource ID</th>
                  <th className={th}>User ID</th>
                  <th className={th}>IP</th>
                  <th className={th}>User agent</th>
                </tr>
              </thead>
              <tbody>
                {filtered === null && <Empty cols={8} text="Loading..." />}
                {filtered?.length === 0 && <Empty cols={8} text="No audit log entries match the current filters." />}
                {filtered?.map((l) => (
                  <tr key={l.id} className={row}>
                    <td className="px-4 py-2.5 text-muted text-xs whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
                    <td className="px-4 py-2.5 text-ink">{l.action}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          l.result === 'SUCCESS' ? 'bg-brand-tint text-brand-dark' : 'bg-red-tint text-red'
                        }`}
                      >
                        {l.result}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{l.resource_type || '-'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs break-all max-w-[14rem]">{l.resource_id || '-'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs break-all max-w-[10rem]">{l.user_id || '-'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{l.ip_address || '-'}</td>
                    <td
                      className="px-4 py-2.5 text-muted text-xs max-w-[14rem] truncate"
                      title={l.user_agent || ''}
                    >
                      {l.user_agent || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6 text-center">
          <p className="text-sm text-muted">
            Only the latest 300 audit entries are available; the backend has no pagination or
            server-side filtering. P&amp;L, tax and other report exports are under Reports (Trading, P&amp;L, Tax, Export Center). Separate security event types, old/new values and request IDs are not available yet, so nothing is shown rather than placeholder data.
          </p>
        </div>
      </div>
    </div>
  )
}