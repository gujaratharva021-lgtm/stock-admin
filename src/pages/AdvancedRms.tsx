import { istToday, istDay } from '../lib/ist'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type AdminTransaction, type PortfolioOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) => `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')

function Page({ title, subtitle, e, children }: { title: string; subtitle: string; e: string | null; children: ReactNode }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="p-6 space-y-6">
        {e && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{e}</div>}
        {children}
      </div>
    </div>
  )
}

function H({ t }: { t: string }) {
  return <h2 className="text-sm font-medium text-ink mb-2">{t}</h2>
}

function Note({ t }: { t: string }) {
  return <div className="bg-surface border border-border rounded-md px-6 py-4 text-sm text-muted">{t}</div>
}

function Table({ cols, rows, empty }: { cols: string[]; rows: string[][] | null; empty: string }) {
  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {cols.map((c) => <th key={c} className="px-4 py-2.5 font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows === null && <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted text-xs">Loading...</td></tr>}
          {rows?.length === 0 && <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted text-xs">{empty}</td></tr>}
          {rows && withKeys(rows).map(({ r, k }) => (
            <tr key={k} className="border-b border-border last:border-0 hover:bg-bg">
              {r.map((v, j) => <td key={j} className="px-4 py-2.5 text-ink">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function usePf() {
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
  }, [])
  return { p, e }
}

export function RmsCircuitPage() {
  return (
    <Page title="Client Risk Limits" subtitle="Limits enforced against clients and orders" e={null}>
      <Note t="Not available. No per-client or per-order risk limits (max order value, max daily loss, exposure cap) are stored or enforced. Exchange circuit limits are under Market Operations. To support it, a limits table and a check at order placement have to be built. Nothing is shown rather than made-up limits." />
    </Page>
  )
}

export function RmsBandsPage() {
  return (
    <Page title="Price Bands" subtitle="Allowed price range for orders" e={null}>
      <Note t="Not available. No price band is stored and the backend does not reject limit orders by price distance from the last traded price. To support it, a band per instrument and a check in order placement have to be built." />
    </Page>
  )
}

type Halted = { id: string; symbol: string; company_name: string; halt_reason: string | null }
type Asset = { halted?: boolean }
type St = { is_blocked?: boolean }

export function RmsKillPage() {
  const [h, setH] = useState<Halted[] | null>(null)
  const [a, setA] = useState<Asset[] | null>(null)
  const [s, setS] = useState<St[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/halted-instruments').then((d) => setH(toArr<Halted>(d, 'halted'))).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/assets').then((d) => setA(toArr<Asset>(d, 'assets'))).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/user-statuses').then((d) => setS(toArr<St>(d, 'statuses'))).catch((x) => setE(msg(x)))
  }, [])
  const ha = a ? a.filter((x) => x.halted).length : null
  const bl = s ? s.filter((x) => x.is_blocked).length : null
  return (
    <Page title="Kill Switch" subtitle="What is currently stopped: halted instruments and blocked clients" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Halted stocks" value={h ? String(h.length) : '-'} tone={h && h.length > 0 ? 'red' : 'default'} />
        <StatCard label="Halted ETF / commodity / MF" value={ha === null ? '-' : String(ha)} tone={ha ? 'red' : 'default'} />
        <StatCard label="Blocked clients" value={bl === null ? '-' : String(bl)} tone={bl ? 'red' : 'default'} />
      </div>
      <div>
        <H t="Halted stocks" />
        <Table cols={['Symbol', 'Company', 'Reason']} rows={h ? h.map((x) => [x.symbol, x.company_name, x.halt_reason || '-']) : null} empty="No stocks are halted." />
      </div>
      <Note t="Read-only status. A one-click kill switch (stop all trading, or all F&O, or one client segment) is not built. Today you can halt one instrument at a time in Market & Instruments, other assets in ETF / Commodity / MF, and block a client in Users. A real kill switch needs a backend flag checked on every order, with an audit entry." />
    </Page>
  )
}

export function RmsSquareoffPage() {
  const { p, e } = usePf()
  const today = istToday()
  const openF = p ? p.futures.filter((x) => x.status === 'OPEN').length : null
  const openO = p ? p.options.filter((x) => x.status === 'OPEN').length : null
  const openM = p ? p.mtf.filter((x) => x.status === 'OPEN').length : null
  const late = p ? p.options.filter((x) => x.status === 'OPEN' && istDay(x.expiry_date) < today) : null
  return (
    <Page title="Auto Square-off" subtitle="Open leveraged positions and anything that should have closed already" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open futures" value={openF === null ? '-' : String(openF)} />
        <StatCard label="Open options" value={openO === null ? '-' : String(openO)} />
        <StatCard label="Open MTF" value={openM === null ? '-' : String(openM)} />
        <StatCard label="Options open past expiry" value={late ? String(late.length) : '-'} tone={late && late.length > 0 ? 'red' : 'brand'} />
      </div>
      <Table
        cols={['Client', 'Symbol', 'Type', 'Strike', 'Expiry']}
        rows={late ? late.map((x) => [`${x.user_name} (${x.user_email})`, x.symbol, x.option_type, String(x.strike_price), istDay(x.expiry_date)]) : null}
        empty="No options are open past expiry."
      />
      <Note t="The backend runs background jobs for options expiry and MTF positions, but there is no end-of-day intraday square-off and no schedule or log to show here. A non-empty table above means the expiry settlement job is behind. No square-off action is offered from this page." />
    </Page>
  )
}

export function RmsExposurePage() {
  const { p, e } = usePf()
  const rows = (() => {
    if (!p) return null
    const m = new Map<string, { name: string; email: string; fut: number; opt: number; mtf: number }>()
    const get = (id: string, name: string, email: string) => {
      const v = m.get(id) ?? { name, email, fut: 0, opt: 0, mtf: 0 }
      m.set(id, v)
      return v
    }
    p.futures.filter((x) => x.status === 'OPEN').forEach((x) => { get(x.user_id, x.user_name, x.user_email).fut += Number(x.margin_used) || 0 })
    p.options.filter((x) => x.status === 'OPEN').forEach((x) => { get(x.user_id, x.user_name, x.user_email).opt += (Number(x.premium) || 0) * (Number(x.lot_size) || 0) })
    p.mtf.filter((x) => x.status === 'OPEN').forEach((x) => { get(x.user_id, x.user_name, x.user_email).mtf += Number(x.borrowed_amount) || 0 })
    return [...m.values()].map((v) => ({ ...v, tot: v.fut + v.opt + v.mtf })).filter((v) => v.tot > 0).sort((a, b) => b.tot - a.tot)
  })()
  return (
    <Page title="Client Exposure Limits" subtitle="Current exposure per client against limits" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Clients with exposure" value={rows ? String(rows.length) : '-'} tone="brand" />
        <StatCard label="Limits set" value="0" tone="amber" />
      </div>
      <Table
        cols={['Client', 'Futures margin', 'Options premium', 'MTF borrowed', 'Total exposure', 'Limit']}
        rows={rows ? rows.map((v) => [`${v.name} (${v.email})`, inr(v.fut), inr(v.opt), inr(v.mtf), inr(v.tot), 'Not set']) : null}
        empty="No open leveraged positions."
      />
      <Note t="Exposure is real, computed from open positions. Limits are not: there is no per-client limit table and nothing stops an order for exceeding one. To support it, a limit per client (or default) has to be stored and checked at order time." />
    </Page>
  )
}

export function RmsProductPage() {
  const { p, e } = usePf()
  const rows = (() => {
    if (!p) return null
    const f = p.futures.filter((x) => x.status === 'OPEN')
    const o = p.options.filter((x) => x.status === 'OPEN')
    const m = p.mtf.filter((x) => x.status === 'OPEN')
    const cl = (ids: string[]) => String(new Set(ids).size)
    return [
      ['Equity holdings', String(p.holdings.length), cl(p.holdings.map((x) => x.user_id)), inr(p.holdings.reduce((s, x) => s + (Number(x.invested) || 0), 0)), 'Invested', 'Not set'],
      ['Futures', String(f.length), cl(f.map((x) => x.user_id)), inr(f.reduce((s, x) => s + (Number(x.margin_used) || 0), 0)), 'Margin used', 'Not set'],
      ['Options', String(o.length), cl(o.map((x) => x.user_id)), inr(o.reduce((s, x) => s + (Number(x.premium) || 0) * (Number(x.lot_size) || 0), 0)), 'Premium paid', 'Not set'],
      ['MTF', String(m.length), cl(m.map((x) => x.user_id)), inr(m.reduce((s, x) => s + (Number(x.margin_paid) || 0) + (Number(x.borrowed_amount) || 0), 0)), 'Margin + borrowed', 'Not set'],
    ]
  })()
  return (
    <Page title="Product-wise Limits" subtitle="Open amount in each product against its limit" e={e}>
      <Table cols={['Product', 'Open positions', 'Clients', 'Amount at stake', 'Basis', 'Limit']} rows={rows} empty="No data." />
      <Note t="Amounts are real, from the latest rows the portfolio API returns. Product limits (cap per product, per client or for the platform) are not stored or enforced. ETF, commodity and mutual fund exposure is not included here." />
    </Page>
  )
}

export function RmsIntradayPage() {
  const [o, setO] = useState<AdminTransaction[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/portfolio/admin/all-transactions?limit=20000').then((d) => setO(toArr<AdminTransaction>(d, 'transactions'))).catch((x) => setE(msg(x)))
  }, [])
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const rows = (() => {
    if (!o) return null
    const m = new Map<string, { name: string; email: string; n: number; buy: number; sell: number; ch: number }>()
    o.filter((x) => new Date(x.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today).forEach((x) => {
      const v = m.get(x.user_id) ?? { name: x.user_name, email: x.user_email, n: 0, buy: 0, sell: 0, ch: 0 }
      v.n++
      const val = (Number(x.quantity) || 0) * (Number(x.price) || 0)
      if (x.buy_sell === 'BUY') v.buy += val
      else v.sell += val
      v.ch += Number(x.charges) || 0
      m.set(x.user_id, v)
    })
    return [...m.values()].map((v) => ({ ...v, turn: v.buy + v.sell })).sort((a, b) => b.turn - a.turn)
  })()
  return (
    <Page title="Intraday Risk Controls" subtitle="Today's trading activity per client (IST)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Clients trading today" value={rows ? String(rows.length) : '-'} tone="brand" />
        <StatCard label="Trades today" value={rows ? String(rows.reduce((s, v) => s + v.n, 0)) : '-'} />
        <StatCard label="Turnover today" value={rows ? inr(rows.reduce((s, v) => s + v.turn, 0)) : '-'} />
      </div>
      <Table
        cols={['Client', 'Trades', 'Buy value', 'Sell value', 'Turnover', 'Charges']}
        rows={rows ? rows.slice(0, 100).map((v) => [`${v.name} (${v.email})`, String(v.n), inr(v.buy), inr(v.sell), inr(v.turn), inr(v.ch)]) : null}
        empty="No trades today."
      />
      <Note t="Activity only. Intraday controls (max loss per day, max orders per minute, max order value, auto-block on breach) are not built. Counts come from the latest rows the orders API returns, so a very busy day may be partly cut off." />
    </Page>
  )
}