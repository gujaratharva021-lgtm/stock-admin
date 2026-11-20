import { useEffect, useMemo, useState } from 'react'
import { api, type ChargesOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) =>
  `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export default function Charges() {
  const [data, setData] = useState<ChargesOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [sideFilter, setSideFilter] = useState<'all' | 'BUY' | 'SELL'>('all')

  useEffect(() => {
    api
      .get<ChargesOverview>('/admin/charges-overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load charges'))
  }, [])

  const matchesUser = useMemo(() => {
    const u = userFilter.trim().toLowerCase()
    return (r: { user_name: string; user_email: string }) =>
      !u || String(r.user_name ?? '').toLowerCase().includes(u) || String(r.user_email ?? '').toLowerCase().includes(u)
  }, [userFilter])

  const txns = data?.transactions.filter((r) => matchesUser(r) && (sideFilter === 'all' || r.buy_sell === sideFilter)) ?? null
  const perUser = data?.perUser.filter(matchesUser) ?? null

  const th = 'px-4 py-2.5 font-medium'
  const thr = 'px-4 py-2.5 font-medium text-right'
  const tdr = 'px-4 py-2.5 text-right tabular text-ink'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'

  return (
    <div>
      <PageHeader title="Charges & Brokerage" subtitle="Charges recorded on executed transactions" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total charges collected" value={data ? inr(data.summary.totalCharges) : '-'} tone="brand" />
            <StatCard label="Charges today" value={data ? inr(data.summary.chargesToday) : '-'} />
            <StatCard label="Transactions" value={data ? num(data.summary.transactions) : '-'} />
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
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value as 'all' | 'BUY' | 'SELL')}
              className={inputCls}
              title="Applies to the charge ledger"
            >
              <option value="all">Buy and sell</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">User-wise charges</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={thr}>Transactions</th>
                  <th className={thr}>Total charges</th>
                </tr>
              </thead>
              <tbody>
                {perUser === null && <Empty cols={3} text="Loading..." />}
                {perUser?.length === 0 && <Empty cols={3} text="No charge data available." />}
                {perUser?.map((r) => (
                  <tr key={r.user_id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className={tdr}>{num(r.transactions)}</td>
                    <td className={tdr}>{inr(r.total_charges)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Charge ledger</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Symbol</th>
                  <th className={th}>Side</th>
                  <th className={thr}>Quantity</th>
                  <th className={thr}>Price</th>
                  <th className={thr}>Charges</th>
                  <th className={th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {txns === null && <Empty cols={7} text="Loading..." />}
                {txns?.length === 0 && <Empty cols={7} text="No transactions match the current filters." />}
                {txns?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <td className="px-4 py-2.5 text-ink">
                      <div className="font-medium">{r.symbol}</div>
                      <div className="text-muted text-xs">{r.company_name}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          r.buy_sell === 'BUY' ? 'bg-brand-tint text-brand-dark' : 'bg-red-tint text-red'
                        }`}
                      >
                        {r.buy_sell}
                      </span>
                    </td>
                    <td className={tdr}>{num(r.quantity)}</td>
                    <td className={tdr}>{inr(r.price)}</td>
                    <td className={tdr}>{inr(r.charges)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6 text-center">
          <p className="text-sm text-muted">
            Brokerage plans, charge slabs and the breakup of charges (brokerage, STT, GST,
            stamp duty, exchange and SEBI fees) are not available yet. The backend stores a
            single charges amount per transaction, so nothing else is shown rather than
            placeholder data. The ledger and user totals cover the latest 200 rows.
          </p>
        </div>
      </div>
    </div>
  )
}