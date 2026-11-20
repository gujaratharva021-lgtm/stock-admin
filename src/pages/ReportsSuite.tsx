import { istDay } from '../lib/ist'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type AdminTransaction, type ChargesOverview, type PortfolioOverview, type FundsOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) => `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const th = 'px-4 py-2.5 font-medium'
const thr = 'px-4 py-2.5 font-medium text-right'
const td = 'px-4 py-2.5 text-ink'
const tdr = 'px-4 py-2.5 text-right tabular text-ink'
const inputCls = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'
const btnCls = 'rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60'

function downloadCsv(name: string, head: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v)
    if (typeof v === 'string' && /^[\s=+\-@]/.test(s)) s = "'" + s
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = [head, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

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

function Table({ cols, rows, empty }: { cols: { h: string; right?: boolean }[]; rows: string[][] | null; empty: string }) {
  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {cols.map((c) => (
              <th key={c.h} className={c.right ? thr : th}>{c.h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows === null && (
            <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted text-xs">Loading...</td></tr>
          )}
          {rows?.length === 0 && (
            <tr><td colSpan={cols.length} className="px-4 py-8 text-center text-muted text-xs">{empty}</td></tr>
          )}
          {rows && withKeys(rows).map(({ r, k }) => (
            <tr key={k} className="border-b border-border last:border-0 hover:bg-bg">
              {r.map((v, j) => (
                <td key={j} className={cols[j].right ? tdr : td}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

type D = { orders: AdminTransaction[] | null; ch: ChargesOverview | null; pf: PortfolioOverview | null; f: FundsOverview | null; e: string | null }

function useData(): D {
  const [orders, setOrders] = useState<AdminTransaction[] | null>(null)
  const [ch, setCh] = useState<ChargesOverview | null>(null)
  const [pf, setPf] = useState<PortfolioOverview | null>(null)
  const [f, setF] = useState<FundsOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/portfolio/admin/all-transactions?limit=20000').then((d) => setOrders(toArr<AdminTransaction>(d, 'transactions'))).catch((x) => setE(msg(x)))
    api.get<ChargesOverview>('/admin/charges-overview').then(setCh).catch((x) => setE(msg(x)))
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setPf).catch((x) => setE(msg(x)))
    api.get<FundsOverview>('/admin/funds-overview').then(setF).catch((x) => setE(msg(x)))
  }, [])
  return { orders, ch, pf, f, e }
}

type Agg = { n: number; qty: number; value: number; charges: number }

function agg<T extends { quantity: number; price: number; charges: number }>(list: T[], key: (x: T) => string): [string, Agg][] {
  const m = new Map<string, Agg>()
  list.forEach((x) => {
    const k = key(x)
    const v = m.get(k) ?? { n: 0, qty: 0, value: 0, charges: 0 }
    v.n++
    v.qty += x.quantity
    v.value += x.quantity * x.price
    v.charges += x.charges
    m.set(k, v)
  })
  return [...m.entries()]
}

const day = (iso: string) => istDay(iso)

type U = { name: string; email: string; orders: number; value: number; charges: number; dep: number; wd: number; pnl: number }

function userRows(d: D): U[] | null {
  if (!d.orders || !d.ch || !d.pf || !d.f) return null
  const m = new Map<string, U>()
  const get = (id: string, name: string, email: string) => {
    let v = m.get(id)
    if (!v) {
      v = { name, email, orders: 0, value: 0, charges: 0, dep: 0, wd: 0, pnl: 0 }
      m.set(id, v)
    }
    return v
  }
  d.orders.forEach((o) => { const v = get(o.user_id, o.user_name, o.user_email); v.orders++; v.value += o.quantity * o.price })
  d.ch.perUser.forEach((x) => { get(x.user_id, x.user_name, x.user_email).charges = x.total_charges })
  d.f.deposits.forEach((x) => { get(x.user_id, x.user_name, x.user_email).dep += Math.abs(x.amount) })
  d.f.withdrawals.forEach((x) => { get(x.user_id, x.user_name, x.user_email).wd += Math.abs(x.amount) })
  ;[...d.pf.futures, ...d.pf.options].filter((x) => x.status !== 'OPEN').forEach((x) => { get(x.user_id, x.user_name, x.user_email).pnl += x.pnl ?? 0 })
  return [...m.values()].sort((a, b) => b.value - a.value)
}

type DS = { head: string[]; rows: (string | number)[][]; timed: boolean }

function datasets(d: D): Record<string, DS> | null {
  const us = userRows(d)
  if (!d.orders || !d.ch || !d.pf || !d.f || !us) return null
  const closed = [
    ...d.pf.futures.filter((x) => x.status !== 'OPEN').map((x) => [x.closed_at ?? x.created_at, x.user_name, x.user_email, x.symbol, `Futures ${x.position_type}`, x.pnl ?? 0] as (string | number)[]),
    ...d.pf.options.filter((x) => x.status !== 'OPEN').map((x) => [x.closed_at ?? x.created_at, x.user_name, x.user_email, x.symbol, `Options ${x.option_type}`, x.pnl ?? 0] as (string | number)[]),
  ]
  return {
    'Orders and trades': { timed: true, head: ['time', 'user', 'email', 'symbol', 'side', 'quantity', 'price', 'charges'], rows: d.orders.map((o) => [o.created_at, o.user_name, o.user_email, o.symbol, o.buy_sell, o.quantity, o.price, o.charges]) },
    'Brokerage and charges': { timed: true, head: ['time', 'user', 'email', 'symbol', 'side', 'quantity', 'price', 'charges'], rows: d.ch.transactions.map((o) => [o.created_at, o.user_name, o.user_email, o.symbol, o.buy_sell, o.quantity, o.price, o.charges]) },
    'Closed F&O P&L': { timed: true, head: ['time', 'user', 'email', 'symbol', 'type', 'pnl'], rows: closed },
    'Deposits and withdrawals': { timed: true, head: ['time', 'type', 'user', 'email', 'amount', 'description'], rows: [...d.f.deposits.map((x) => [x.created_at, 'Deposit', x.user_name, x.user_email, x.amount, x.description]), ...d.f.withdrawals.map((x) => [x.created_at, 'Withdrawal', x.user_name, x.user_email, x.amount, x.description])] },
    'User summary': { timed: false, head: ['user', 'email', 'orders', 'traded_value', 'charges', 'deposits', 'withdrawals', 'closed_fno_pnl'], rows: us.map((v) => [v.name, v.email, v.orders, v.value, v.charges, v.dep, v.wd, v.pnl]) },
  }
}

export function TradingReports() {
  const d = useData()
  const o = d.orders
  const total = o ? o.reduce((s, x) => s + x.quantity * x.price, 0) : null
  const buys = o ? o.filter((x) => x.buy_sell === 'BUY').length : null
  const bySym = o ? agg(o, (x) => x.symbol).sort((a, b) => b[1].value - a[1].value).slice(0, 20) : null
  const byDay = o ? agg(o, (x) => day(x.created_at)).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14) : null
  return (
    <Page title="Trading Reports" subtitle="Order activity from the loaded orders" e={d.e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Orders" value={o ? String(o.length) : '-'} />
        <StatCard label="Buy orders" value={buys === null ? '-' : String(buys)} tone="brand" />
        <StatCard label="Sell orders" value={o && buys !== null ? String(o.length - buys) : '-'} tone="red" />
        <StatCard label="Traded value" value={total === null ? '-' : inr(total)} />
      </div>
      <div>
        <H t="Top 20 symbols by traded value" />
        <Table cols={[{ h: 'Symbol' }, { h: 'Orders', right: true }, { h: 'Quantity', right: true }, { h: 'Value', right: true }]} rows={bySym ? bySym.map(([k, v]) => [k, String(v.n), String(v.qty), inr(v.value)]) : null} empty="No orders." />
      </div>
      <div>
        <H t="Last 14 trading days" />
        <Table cols={[{ h: 'Date' }, { h: 'Orders', right: true }, { h: 'Quantity', right: true }, { h: 'Value', right: true }]} rows={byDay ? byDay.map(([k, v]) => [k, String(v.n), String(v.qty), inr(v.value)]) : null} empty="No orders." />
      </div>
    </Page>
  )
}

export function RevenueReports() {
  const d = useData()
  const ch = d.ch
  const byDay = ch ? agg(ch.transactions, (x) => day(x.created_at)).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 30) : null
  return (
    <Page title="Revenue Reports" subtitle="Platform revenue from charges and brokerage collected" e={d.e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total charges" value={ch ? inr(ch.summary.totalCharges) : '-'} tone="brand" />
        <StatCard label="Charged transactions" value={ch ? String(ch.summary.transactions) : '-'} />
        <StatCard label="Charges today" value={ch ? inr(ch.summary.chargesToday) : '-'} />
      </div>
      <div>
        <H t="Revenue by day (last 30 days with activity)" />
        <Table cols={[{ h: 'Date' }, { h: 'Transactions', right: true }, { h: 'Charges', right: true }]} rows={byDay ? byDay.map(([k, v]) => [k, String(v.n), inr(v.charges)]) : null} empty="No charges." />
      </div>
      <Note t="Revenue here means charges collected on trades. MTF interest and other income are not tracked by the backend." />
    </Page>
  )
}

export function BrokerageReports() {
  const d = useData()
  const ch = d.ch
  const bySym = ch ? agg(ch.transactions, (x) => x.symbol).sort((a, b) => b[1].charges - a[1].charges).slice(0, 20) : null
  return (
    <Page title="Brokerage Reports" subtitle="Brokerage and charges per user and per symbol" e={d.e}>
      <div>
        <H t="Per user" />
        <Table cols={[{ h: 'User' }, { h: 'Transactions', right: true }, { h: 'Total charges', right: true }]} rows={ch ? ch.perUser.map((x) => [`${x.user_name} (${x.user_email})`, String(x.transactions), inr(x.total_charges)]) : null} empty="No charges." />
      </div>
      <div>
        <H t="Top 20 symbols by charges" />
        <Table cols={[{ h: 'Symbol' }, { h: 'Transactions', right: true }, { h: 'Charges', right: true }]} rows={bySym ? bySym.map(([k, v]) => [k, String(v.n), inr(v.charges)]) : null} empty="No charges." />
      </div>
    </Page>
  )
}

export function PnlReports() {
  const d = useData()
  const us = userRows(d)
  const tot = us ? us.reduce((s, v) => s + v.pnl, 0) : null
  return (
    <Page title="P&L Reports" subtitle="Realised P&L of closed futures and options, per user" e={d.e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total realised F&O P&L" value={tot === null ? '-' : inr(tot)} tone={tot !== null && tot < 0 ? 'red' : 'brand'} />
      </div>
      <Table cols={[{ h: 'User' }, { h: 'Realised F&O P&L', right: true }, { h: 'Charges paid (equity, not netted)', right: true }]} rows={us ? us.filter((v) => v.pnl !== 0 || v.charges > 0).sort((a, b) => a.pnl - b.pnl).map((v) => [`${v.name} (${v.email})`, inr(v.pnl), inr(v.charges)]) : null} empty="No closed positions." />
      <Note t="Only closed futures and options carry P&L in the backend. Equity P&L and unrealised P&L are not available." />
    </Page>
  )
}

export function TaxReports() {
  const d = useData()
  const us = userRows(d)
  return (
    <Page title="Tax Reports" subtitle="Per-user realised F&O P&L and charges, as a starting point for tax statements" e={d.e}>
      <Table cols={[{ h: 'User' }, { h: 'Realised F&O P&L', right: true }, { h: 'Charges (equity, not netted)', right: true }]} rows={us ? us.filter((v) => v.pnl !== 0 || v.charges > 0).map((v) => [`${v.name} (${v.email})`, inr(v.pnl), inr(v.charges)]) : null} empty="No data." />
      {us && <button className={btnCls} onClick={() => downloadCsv('tax-summary.csv', ['user', 'email', 'realised_fno_pnl', 'charges'], us.filter((v) => v.pnl !== 0 || v.charges > 0).map((v) => [v.name, v.email, v.pnl, v.charges]))}>Download CSV</button>}
      <Note t="This is not a tax computation. Capital gains on equity, STT breakup and financial year splits are not available in the backend." />
    </Page>
  )
}

export function UserReports() {
  const d = useData()
  const us = userRows(d)
  return (
    <Page title="User Reports" subtitle="Trading, charges and funds summary per user" e={d.e}>
      <Table cols={[{ h: 'User' }, { h: 'Orders', right: true }, { h: 'Traded value', right: true }, { h: 'Charges', right: true }, { h: 'Deposits', right: true }, { h: 'Withdrawals', right: true }, { h: 'F&O P&L', right: true }]} rows={us ? us.map((v) => [`${v.name} (${v.email})`, String(v.orders), inr(v.value), inr(v.charges), inr(v.dep), inr(v.wd), inr(v.pnl)]) : null} empty="No data." />
    </Page>
  )
}

export function CustomReports() {
  const d = useData()
  const ds = datasets(d)
  const [name, setName] = useState('Orders and trades')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const cur = ds ? ds[name] : null
  const rows = cur ? cur.rows.filter((r) => !cur.timed || ((!from || istDay(r[0]) >= from) && (!to || istDay(r[0]) <= to))) : null
  return (
    <Page title="Custom Reports" subtitle="Pick a dataset and date range, preview it and download CSV" e={d.e}>
      <div className="flex flex-wrap gap-3 items-center">
        <select value={name} onChange={(ev) => setName(ev.target.value)} className={inputCls}>
          {(ds ? Object.keys(ds) : [name]).map((k) => <option key={k}>{k}</option>)}
        </select>
        <input type="date" value={from} onChange={(ev) => setFrom(ev.target.value)} className={inputCls} disabled={!cur?.timed} />
        <input type="date" value={to} onChange={(ev) => setTo(ev.target.value)} className={inputCls} disabled={!cur?.timed} />
        <button className={btnCls} disabled={!cur || !rows} onClick={() => cur && rows && downloadCsv(`${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, cur.head, rows)}>Download CSV</button>
      </div>
      <Table cols={(cur ? cur.head : ['Loading']).map((h) => ({ h }))} rows={rows ? rows.slice(0, 50).map((r) => r.map((v) => String(v))) : null} empty="No rows in this range." />
      <Note t={rows ? `${rows.length} rows match. Preview shows the first 50, the download has all of them.` : 'Loading data...'} />
    </Page>
  )
}

export function ExportCenter() {
  const d = useData()
  const ds = datasets(d)
  return (
    <Page title="Export Center" subtitle="Download CSV extracts of all report datasets" e={d.e}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(ds ? Object.entries(ds) : []).map(([k, v]) => (
          <div key={k} className="bg-surface border border-border rounded-md p-4 space-y-2">
            <H t={`${k} (${v.rows.length} rows)`} />
            <button className={btnCls} onClick={() => downloadCsv(`${k.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, v.head, v.rows)}>Download CSV</button>
          </div>
        ))}
        {!ds && <div className="text-sm text-muted">Loading...</div>}
      </div>
      <Note t="Exports cover the data the backend returns (orders list may be capped by the API). PDF and scheduled exports are not built." />
    </Page>
  )
}