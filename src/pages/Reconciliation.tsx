import { useEffect, useMemo, useState } from 'react'
import {
  api,
  type ReconciliationSummary,
  type ReconciliationDetails,
} from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

type StatusFilter = 'all' | 'MATCHED' | 'MISMATCHED'

const inr = (n: number) =>
  `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export default function Reconciliation() {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null)
  const [details, setDetails] = useState<ReconciliationDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    const onErr = (err: unknown) =>
      setError(err instanceof Error ? err.message : 'Failed to load reconciliation data')
    api.get<ReconciliationSummary>('/admin/reconciliation/summary').then(setSummary).catch(onErr)
    api.get<ReconciliationDetails>('/admin/reconciliation/details').then(setDetails).catch(onErr)
  }, [])

  const matchesUser = useMemo(() => {
    const u = userFilter.trim().toLowerCase()
    return (r: { user_name: string; user_email: string }) =>
      !u || String(r.user_name ?? '').toLowerCase().includes(u) || String(r.user_email ?? '').toLowerCase().includes(u)
  }, [userFilter])

  const users =
    details?.users.filter((r) => matchesUser(r) && (statusFilter === 'all' || r.status === statusFilter)) ?? null
  const pendingOrders = details?.pendingOrders.filter(matchesUser) ?? null
  const failedOrders = details?.failedOrders.filter(matchesUser) ?? null

  const th = 'px-4 py-2.5 font-medium'
  const thr = 'px-4 py-2.5 font-medium text-right'
  const tdr = 'px-4 py-2.5 text-right tabular text-ink'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'
  const loading = 'Loading...'

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        subtitle="Wallet balance vs ledger, and stuck payment orders"
      />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="text-xs text-muted bg-amber-tint border border-amber/20 rounded px-3 py-2">
          Pending = payment orders created within the last 20 minutes. Failed = orders still
          unconfirmed after 20 minutes (the reconciliation job's grace window). Broker/exchange
          comparison is not available yet.
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Users checked" value={summary ? summary.users_checked : '-'} />
            <StatCard label="Matched" value={summary ? summary.matched : '-'} tone="brand" />
            <StatCard label="Mismatched" value={summary ? summary.mismatched : '-'} tone="red" />
            <StatCard label="Pending orders" value={summary ? summary.pending : '-'} tone="amber" />
            <StatCard label="Failed orders" value={summary ? summary.failed : '-'} tone="red" />
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={inputCls}
              title="Applies to the balance vs ledger table"
            >
              <option value="all">All statuses</option>
              <option value="MATCHED">Matched</option>
              <option value="MISMATCHED">Mismatched</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Balance vs ledger</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={thr}>Balance</th>
                  <th className={thr}>Ledger net sum</th>
                  <th className={thr}>Difference</th>
                  <th className={th}>Status</th>
                  <th className={th}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {users === null && <Empty cols={6} text={loading} />}
                {users?.length === 0 && <Empty cols={6} text="No users match the current filters." />}
                {users?.map((r) => (
                  <tr key={r.user_id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className={tdr}>{inr(r.balance)}</td>
                    <td className={tdr}>{inr(r.wallet_net_sum)}</td>
                    <td className={tdr}>{inr(r.difference)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          r.status === 'MATCHED'
                            ? 'bg-brand-tint text-brand-dark'
                            : 'bg-red-tint text-red'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs max-w-md">{r.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Pending payment orders</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Order ID</th>
                  <th className={thr}>Amount</th>
                  <th className={th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders === null && <Empty cols={4} text={loading} />}
                {pendingOrders?.length === 0 && <Empty cols={4} text="No pending payment orders." />}
                {pendingOrders?.map((r) => (
                  <tr key={r.order_id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className="px-4 py-2.5 text-muted text-xs">{r.order_id}</td>
                    <td className={tdr}>{inr(r.amount)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Failed payment orders</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Order ID</th>
                  <th className={thr}>Amount</th>
                  <th className={th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {failedOrders === null && <Empty cols={4} text={loading} />}
                {failedOrders?.length === 0 && <Empty cols={4} text="No failed payment orders." />}
                {failedOrders?.map((r) => (
                  <tr key={r.order_id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className="px-4 py-2.5 text-muted text-xs">{r.order_id}</td>
                    <td className={tdr}>{inr(r.amount)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6 text-center">
          <p className="text-sm text-muted">
            Broker/exchange vs internal comparison and reconciliation run history are not
            available yet. There is no persisted run history or external data source in the
            backend to read from.
          </p>
        </div>
      </div>
    </div>
  )
}