import { useEffect, useMemo, useState } from 'react'
import { api, type FundsOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

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

export default function Funds() {
  const [data, setData] = useState<FundsOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')

  useEffect(() => {
    api
      .get<FundsOverview>('/admin/funds-overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load funds overview'))
  }, [])

  const matchesUser = useMemo(() => {
    const u = userFilter.trim().toLowerCase()
    return (r: { user_name: string; user_email: string }) =>
      !u || String(r.user_name ?? '').toLowerCase().includes(u) || String(r.user_email ?? '').toLowerCase().includes(u)
  }, [userFilter])

  const deposits = data?.deposits.filter(matchesUser) ?? null
  const withdrawals = data?.withdrawals.filter(matchesUser) ?? null
  const pending = data?.pending.filter(matchesUser) ?? null

  const th = 'px-4 py-2.5 font-medium'
  const thr = 'px-4 py-2.5 font-medium text-right'
  const tdr = 'px-4 py-2.5 text-right tabular text-ink'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'
  const loading = 'Loading...'

  return (
    <div>
      <PageHeader title="Funds & Withdrawals" subtitle="Deposits, withdrawals, and fund flow across all users" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total client funds"
              value={data ? inr(data.summary.totalClientFunds) : '-'}
              tone="brand"
            />
            <StatCard
              label="Total deposits"
              value={data ? `${inr(data.summary.depositsAmount)} (${data.summary.depositsCount})` : '-'}
            />
            <StatCard
              label="Total withdrawals"
              value={data ? `${inr(data.summary.withdrawalsAmount)} (${data.summary.withdrawalsCount})` : '-'}
              tone="red"
            />
            <StatCard
              label="Pending deposit orders"
              value={data ? `${inr(data.summary.pendingAmount)} (${data.summary.pendingCount})` : '-'}
              tone="amber"
            />
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
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Deposits</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={thr}>Amount</th>
                  <th className={th}>Description</th>
                  <th className={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {deposits === null && <Empty cols={4} text={loading} />}
                {deposits?.length === 0 && <Empty cols={4} text="No deposits found." />}
                {deposits?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className={tdr}>{inr(Math.abs(Number(r.amount) || 0))}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{r.description}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Withdrawals</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={thr}>Amount</th>
                  <th className={th}>Bank account</th>
                  <th className={th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals === null && <Empty cols={4} text={loading} />}
                {withdrawals?.length === 0 && <Empty cols={4} text="No withdrawals found." />}
                {withdrawals?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className={tdr}>{inr(Math.abs(Number(r.amount) || 0))}</td>
                    <td className="px-4 py-2.5 text-muted text-xs" title="Withdrawal records don't currently link to a bank account">-</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Pending deposit orders</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={thr}>Amount</th>
                  <th className={th}>Status</th>
                  <th className={th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {pending === null && <Empty cols={4} text={loading} />}
                {pending?.length === 0 && <Empty cols={4} text="No pending deposit orders." />}
                {pending?.map((r) => (
                  <tr key={r.order_id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className={tdr}>{inr(Math.abs(Number(r.amount) || 0))}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-tint text-amber">{r.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Failed / rejected withdrawals</h2>
          <div className="bg-surface border border-border rounded-md px-6 py-8 text-center">
            <p className="text-sm text-muted">
              Withdrawal failures are not currently persisted. A failed withdrawal (KYC pending, invalid
              bank account, over the per-transaction limit, or insufficient balance) is returned as an
              error to the user directly and no record is written.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}