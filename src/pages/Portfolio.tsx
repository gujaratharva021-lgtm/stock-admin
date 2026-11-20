import { useEffect, useMemo, useState } from 'react'
import { api, type PortfolioOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

type StatusFilter = 'all' | 'OPEN' | 'CLOSED'

const inr = (n: number) =>
  `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (n: number) => (Number(n) || 0).toLocaleString('en-IN')
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString()
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded ${
        status === 'OPEN' ? 'bg-brand-tint text-brand-dark' : 'bg-bg text-muted'
      }`}
    >
      {status}
    </span>
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

function SymbolCell({ symbol, company }: { symbol: string; company: string }) {
  return (
    <td className="px-4 py-2.5 text-ink">
      <div className="font-medium">{symbol}</div>
      <div className="text-muted text-xs">{company}</div>
    </td>
  )
}

export default function Portfolio() {
  const [data, setData] = useState<PortfolioOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [exchangeFilter, setExchangeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    api
      .get<PortfolioOverview>('/admin/portfolio-overview')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load portfolio'))
  }, [])

  const matches = useMemo(() => {
    const u = userFilter.trim().toLowerCase()
    const s = symbolFilter.trim().toLowerCase()
    return (r: { user_name: string; user_email: string; symbol: string; exchange: string }) =>
      (!u || String(r.user_name ?? '').toLowerCase().includes(u) || String(r.user_email ?? '').toLowerCase().includes(u)) &&
      (!s || String(r.symbol ?? '').toLowerCase().includes(s)) &&
      (exchangeFilter === 'all' || r.exchange === exchangeFilter)
  }, [userFilter, symbolFilter, exchangeFilter])

  const statusOk = (st: string) => statusFilter === 'all' || st === statusFilter

  const holdings = data?.holdings.filter(matches) ?? null
  const unsettled = data?.unsettled.filter(matches) ?? null
  const futures = data?.futures.filter((r) => matches(r) && statusOk(r.status)) ?? null
  const options = data?.options.filter((r) => matches(r) && statusOk(r.status)) ?? null
  const mtf = data?.mtf.filter((r) => matches(r) && statusOk(r.status)) ?? null

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
        title="Portfolio / Positions"
        subtitle="Holdings and open positions across all users"
      />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="text-xs text-muted bg-amber-tint border border-amber/20 rounded px-3 py-2">
          Showing the latest 200 rows per section. LTP, current value and unrealized P&L are not
          shown yet; they need live quote data.
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <StatCard label="Holdings" value={data ? data.summary.totalHoldings : '-'} />
            <StatCard label="Total invested" value={data ? inr(data.summary.totalInvested) : '-'} tone="brand" />
            <StatCard label="Unsettled" value={data ? data.summary.unsettled : '-'} tone="amber" />
            <StatCard label="Open futures" value={data ? data.summary.openFutures : '-'} />
            <StatCard label="Open options" value={data ? data.summary.openOptions : '-'} />
            <StatCard label="Open MTF" value={data ? data.summary.openMtf : '-'} />
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
            <input
              type="text"
              placeholder="Filter by symbol..."
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className={inputCls}
            />
            <select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              className={inputCls}
            >
              <option value="all">All exchanges</option>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={inputCls}
              title="Applies to futures, options and MTF"
            >
              <option value="all">All statuses (F&O / MTF)</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Holdings</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Symbol</th>
                  <th className={th}>Exchange</th>
                  <th className={thr}>Quantity</th>
                  <th className={thr}>Avg. price</th>
                  <th className={thr}>Invested</th>
                </tr>
              </thead>
              <tbody>
                {holdings === null && <Empty cols={6} text={loading} />}
                {holdings?.length === 0 && <Empty cols={6} text="No holdings found." />}
                {holdings?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className="px-4 py-2.5 text-muted text-xs">{r.exchange}</td>
                    <td className={tdr}>{num(r.quantity)}</td>
                    <td className={tdr}>{inr(r.avg_price)}</td>
                    <td className={tdr}>{inr(r.invested)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Unsettled (T+1)</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Symbol</th>
                  <th className={th}>Order type</th>
                  <th className={thr}>Quantity</th>
                  <th className={thr}>Avg. price</th>
                  <th className={thr}>Invested</th>
                  <th className={th}>Buy date</th>
                  <th className={th}>Settle date</th>
                </tr>
              </thead>
              <tbody>
                {unsettled === null && <Empty cols={8} text={loading} />}
                {unsettled?.length === 0 && <Empty cols={8} text="No unsettled positions." />}
                {unsettled?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className="px-4 py-2.5 text-xs text-ink">{r.order_type}</td>
                    <td className={tdr}>{num(r.quantity)}</td>
                    <td className={tdr}>{inr(r.avg_price)}</td>
                    <td className={tdr}>{inr(r.invested)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(r.buy_date)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(r.settle_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Futures</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Symbol</th>
                  <th className={th}>Side</th>
                  <th className={thr}>Lot size</th>
                  <th className={thr}>Entry price</th>
                  <th className={thr}>Margin used</th>
                  <th className={th}>Status</th>
                  <th className={thr}>Exit price</th>
                  <th className={thr}>P&L</th>
                  <th className={th}>Opened</th>
                </tr>
              </thead>
              <tbody>
                {futures === null && <Empty cols={10} text={loading} />}
                {futures?.length === 0 && <Empty cols={10} text="No futures positions." />}
                {futures?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className="px-4 py-2.5 text-xs text-ink">{r.position_type}</td>
                    <td className={tdr}>{num(r.lot_size)}</td>
                    <td className={tdr}>{inr(r.entry_price)}</td>
                    <td className={tdr}>{inr(r.margin_used)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={tdr}>{r.exit_price === null ? '-' : inr(r.exit_price)}</td>
                    <td className={tdr}>{r.pnl === null ? '-' : inr(r.pnl)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Options</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Symbol</th>
                  <th className={th}>Type</th>
                  <th className={thr}>Strike</th>
                  <th className={thr}>Premium</th>
                  <th className={thr}>Lot size</th>
                  <th className={th}>Expiry</th>
                  <th className={th}>Status</th>
                  <th className={thr}>Settlement price</th>
                  <th className={thr}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {options === null && <Empty cols={10} text={loading} />}
                {options?.length === 0 && <Empty cols={10} text="No options positions." />}
                {options?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className="px-4 py-2.5 text-xs text-ink">{r.option_type}</td>
                    <td className={tdr}>{inr(r.strike_price)}</td>
                    <td className={tdr}>{inr(r.premium)}</td>
                    <td className={tdr}>{num(r.lot_size)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(r.expiry_date)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={tdr}>
                      {r.settlement_price === null ? '-' : inr(r.settlement_price)}
                    </td>
                    <td className={tdr}>{r.pnl === null ? '-' : inr(r.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">MTF</h2>
          <div className={wrap}>
            <table className="w-full text-sm">
              <thead>
                <tr className={head}>
                  <th className={th}>User</th>
                  <th className={th}>Symbol</th>
                  <th className={thr}>Quantity</th>
                  <th className={thr}>Entry price</th>
                  <th className={thr}>Margin paid</th>
                  <th className={thr}>Borrowed</th>
                  <th className={thr}>Interest %</th>
                  <th className={th}>Status</th>
                  <th className={th}>Opened</th>
                </tr>
              </thead>
              <tbody>
                {mtf === null && <Empty cols={9} text={loading} />}
                {mtf?.length === 0 && <Empty cols={9} text="No MTF positions." />}
                {mtf?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className={tdr}>{num(r.quantity)}</td>
                    <td className={tdr}>{inr(r.entry_price)}</td>
                    <td className={tdr}>{inr(r.margin_paid)}</td>
                    <td className={tdr}>{inr(r.borrowed_amount)}</td>
                    <td className={tdr}>{r.interest_rate}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.opened_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}