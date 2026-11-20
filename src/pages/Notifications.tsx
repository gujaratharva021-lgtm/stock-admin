import { useEffect, useMemo, useState } from 'react'
import { api, type NotificationsOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

type ReadFilter = 'all' | 'unread' | 'read'

const num = (n: number) => (Number(n) || 0).toLocaleString('en-IN')
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

function UserCell({ name, email }: { name: string; email: string }) {
  return (
    <td className="px-4 py-2.5">
      <div className="text-ink font-medium">{name}</div>
      <div className="text-muted text-xs">{email}</div>
    </td>
  )
}

export default function Notifications() {
  const [data, setData] = useState<NotificationsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [readFilter, setReadFilter] = useState<ReadFilter>('all')

  useEffect(() => {
    api
      .get<NotificationsOverview>('/admin/notifications-overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load notifications'))
  }, [])

  const matchesUser = useMemo(() => {
    const u = userFilter.trim().toLowerCase()
    return (r: { user_name: string; user_email: string }) =>
      !u || String(r.user_name ?? '').toLowerCase().includes(u) || String(r.user_email ?? '').toLowerCase().includes(u)
  }, [userFilter])

  const rows =
    data?.notifications.filter(
      (r) =>
        matchesUser(r) &&
        (readFilter === 'all' || (readFilter === 'read' ? r.read : !r.read))
    ) ?? null
  const perUser = data?.perUser.filter(matchesUser) ?? null

  const th = 'px-4 py-2.5 font-medium'
  const thr = 'px-4 py-2.5 font-medium text-right'
  const tdr = 'px-4 py-2.5 text-right tabular text-ink'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Notifications sent to users" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total notifications" value={data ? num(data.summary.total) : '-'} tone="brand" />
            <StatCard label="Unread" value={data ? num(data.summary.unread) : '-'} tone="amber" />
            <StatCard label="Read" value={data ? num(data.summary.read) : '-'} />
            <StatCard label="Created today" value={data ? num(data.summary.today) : '-'} />
            <StatCard label="Users reached" value={data ? num(data.summary.usersReached) : '-'} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Filters</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Filter by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className={inputCls}
            />
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as ReadFilter)}
              className={inputCls}
              title="Applies to the notification ledger"
            >
              <option value="all">Read and unread</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">User-wise notifications</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={thr}>Total</th>
                  <th className={thr}>Unread</th>
                </tr>
              </thead>
              <tbody>
                {perUser === null && <Empty cols={3} text="Loading..." />}
                {perUser?.length === 0 && <Empty cols={3} text="No notification data available." />}
                {perUser?.map((r) => (
                  <tr key={r.user_id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className={tdr}>{num(r.total)}</td>
                    <td className={tdr}>{num(r.unread)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Notification ledger</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Title</th>
                  <th className={th}>Message</th>
                  <th className={th}>Status</th>
                  <th className={th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows === null && <Empty cols={5} text="Loading..." />}
                {rows?.length === 0 && <Empty cols={5} text="No notifications match the current filters." />}
                {rows?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className="px-4 py-2.5 text-ink">{r.title}</td>
                    <td
                      className="px-4 py-2.5 text-muted text-xs max-w-xs truncate"
                      title={r.body}
                    >
                      {r.body || '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          r.read ? 'bg-bg text-muted' : 'bg-amber-tint text-amber'
                        }`}
                      >
                        {r.read ? 'READ' : 'UNREAD'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6 text-center">
          <p className="text-sm text-muted">
            Sending or broadcasting notifications, templates, delivery channels (email, SMS,
            push) and delivery status are not available yet. The backend stores only a title,
            message and read flag per user, so nothing else is shown rather than placeholder
            data. The ledger and user totals cover the latest 200 rows.
          </p>
        </div>
      </div>
    </div>
  )
}