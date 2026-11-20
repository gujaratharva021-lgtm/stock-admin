import { useEffect, useMemo, useState } from 'react'
import { api, type RiskOverview, type PortfolioOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

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

export default function Risk() {
  const [risk, setRisk] = useState<RiskOverview | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')

  useEffect(() => {
    const onErr = (err: unknown) =>
      setError(err instanceof Error ? err.message : 'Failed to load risk data')
    api.get<RiskOverview>('/admin/risk-overview').then(setRisk).catch(onErr)
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setPortfolio).catch(onErr)
  }, [])

  const matchesUser = useMemo(() => {
    const u = userFilter.trim().toLowerCase()
    return (r: { user_name: string; user_email: string }) =>
      !u || String(r.user_name ?? '').toLowerCase().includes(u) || String(r.user_email ?? '').toLowerCase().includes(u)
  }, [userFilter])

  // Risk page shows OPEN positions only.
  const futures = portfolio?.futures.filter((r) => r.status === 'OPEN' && matchesUser(r)) ?? null
  const options = portfolio?.options.filter((r) => r.status === 'OPEN' && matchesUser(r)) ?? null
  const mtf = portfolio?.mtf.filter((r) => r.status === 'OPEN' && matchesUser(r)) ?? null

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
        title="Risk"
        subtitle="Exposure and open leveraged positions across all users"
      />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              label="Total exposure"
              value={risk ? inr(risk.totalExposure) : '-'}
              tone="red"
            />
            <StatCard
              label="Futures margin used"
              value={risk ? inr(risk.futuresMarginUsed) : '-'}
              tone="amber"
            />
            <StatCard
              label="Options premium at risk"
              value={risk ? inr(risk.optionsPremiumAtRisk) : '-'}
              tone="amber"
            />
            <StatCard
              label="MTF exposure (borrowed)"
              value={risk ? inr(risk.mtfExposure) : '-'}
              tone="amber"
            />
            <StatCard
              label="MTF margin paid"
              value={risk ? inr(risk.mtfMarginPaid) : '-'}
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
          <h2 className="text-sm font-medium text-ink mb-2">Open futures</h2>
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
                  <th className={th}>Opened</th>
                </tr>
              </thead>
              <tbody>
                {futures === null && <Empty cols={7} text={loading} />}
                {futures?.length === 0 && <Empty cols={7} text="No open futures positions." />}
                {futures?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className="px-4 py-2.5 text-xs text-ink">{r.position_type}</td>
                    <td className={tdr}>{num(r.lot_size)}</td>
                    <td className={tdr}>{inr(r.entry_price)}</td>
                    <td className={tdr}>{inr(r.margin_used)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Open options</h2>
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
                  <th className={thr}>Premium at risk</th>
                  <th className={th}>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {options === null && <Empty cols={8} text={loading} />}
                {options?.length === 0 && <Empty cols={8} text="No open options positions." />}
                {options?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className="px-4 py-2.5 text-xs text-ink">{r.option_type}</td>
                    <td className={tdr}>{inr(r.strike_price)}</td>
                    <td className={tdr}>{inr(r.premium)}</td>
                    <td className={tdr}>{num(r.lot_size)}</td>
                    <td className={tdr}>{inr(r.premium * r.lot_size)}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(r.expiry_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Open MTF</h2>
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
                  <th className={th}>Opened</th>
                </tr>
              </thead>
              <tbody>
                {mtf === null && <Empty cols={8} text={loading} />}
                {mtf?.length === 0 && <Empty cols={8} text="No open MTF positions." />}
                {mtf?.map((r) => (
                  <tr key={r.id} className={row}>
                    <UserCell name={r.user_name} email={r.user_email} />
                    <SymbolCell symbol={r.symbol} company={r.company_name} />
                    <td className={tdr}>{num(r.quantity)}</td>
                    <td className={tdr}>{inr(r.entry_price)}</td>
                    <td className={tdr}>{inr(r.margin_paid)}</td>
                    <td className={tdr}>{inr(r.borrowed_amount)}</td>
                    <td className={tdr}>{r.interest_rate}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">{fmtDateTime(r.opened_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-md px-6 py-6 text-center">
          <p className="text-sm text-muted">
            Margin utilization, position limits, risk alerts and risk event history are not
            available yet. The backend has no tables or logic for these, so nothing is shown
            rather than placeholder data. Position lists show the latest 200 rows, open
            positions only.
          </p>
        </div>
      </div>
    </div>
  )
}