import { istDay } from '../lib/ist'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type AdminTransaction, type FundsOverview, type PortfolioOverview, type AuditLog } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) => `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const day = (s: string) => istDay(s)
const inputCls = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'
const btnCls = 'rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60'
const smallBtn = 'text-xs px-2.5 py-1 rounded border border-border-strong text-ink hover:bg-bg'

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

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

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

function Note({ t }: { t: string }) {
  return <div className="bg-surface border border-border rounded-md px-6 py-4 text-sm text-muted">{t}</div>
}

function Table({ cols, rows, empty }: { cols: string[]; rows: ReactNode[][] | null; empty: string }) {
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

type D = { orders: AdminTransaction[] | null; f: FundsOverview | null; p: PortfolioOverview | null; e: string | null }

function useDocs(): D {
  const [orders, setOrders] = useState<AdminTransaction[] | null>(null)
  const [f, setF] = useState<FundsOverview | null>(null)
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/portfolio/admin/all-transactions?limit=20000').then((d) => setOrders(toArr<AdminTransaction>(d, 'transactions'))).catch((x) => setE(msg(x)))
    api.get<FundsOverview>('/admin/funds-overview').then(setF).catch((x) => setE(msg(x)))
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
  }, [])
  return { orders, f, p, e }
}

function clientList(d: D): [string, string][] {
  const m = new Map<string, string>()
  d.orders?.forEach((x) => m.set(x.user_id, `${x.user_name} (${x.user_email})`))
  d.f?.deposits.forEach((x) => m.set(x.user_id, `${x.user_name} (${x.user_email})`))
  d.f?.withdrawals.forEach((x) => m.set(x.user_id, `${x.user_name} (${x.user_email})`))
  d.p?.holdings.forEach((x) => m.set(x.user_id, `${x.user_name} (${x.user_email})`))
  return [...m.entries()].sort((a, b) => (a[1] < b[1] ? -1 : 1))
}

function Picker({ list, value, onChange, all }: { list: [string, string][]; value: string; onChange: (v: string) => void; all: boolean }) {
  return (
    <select value={value} onChange={(ev) => onChange(ev.target.value)} className={inputCls}>
      <option value="">{all ? 'All clients' : 'Select a client'}</option>
      {list.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
    </select>
  )
}

type G = { key: string; uid: string; name: string; email: string; date: string; trades: AdminTransaction[]; buy: number; sell: number; charges: number }

function openNote(g: G, partial = false) {
  const rows = g.trades.map((t) => `<tr><td>${esc(new Date(t.created_at).toLocaleTimeString())}</td><td>${esc(t.symbol)}</td><td>${esc(t.buy_sell)}</td><td style="text-align:right">${esc(String(t.quantity))}</td><td style="text-align:right">${esc(inr(t.price))}</td><td style="text-align:right">${esc(inr(t.quantity * t.price))}</td><td style="text-align:right">${esc(inr(t.charges))}</td></tr>`).join('')
  const net = g.buy - g.sell + g.charges
  const html = (`<!doctype html><html><head><meta charset="utf-8"><title>Contract note ${esc(g.date)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:left}h1{font-size:18px}p{margin:4px 0;font-size:13px}</style></head><body><h1>Trade summary (contract note)</h1><p>Client: ${esc(g.name)} (${esc(g.email)})</p><p>Trade date: ${esc(g.date)}</p>${partial ? '<p style="color:#b00"><b>WARNING: incomplete day. The transactions API cap was reached, so earlier trades of this day may be missing and totals may be wrong.</b></p>' : ''}<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th><th>Value</th><th>Charges</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:16px">Buy value: ${esc(inr(g.buy))} | Sell value: ${esc(inr(g.sell))} | Charges: ${esc(inr(g.charges))}</p><p><b>Net payable by client (buy - sell + charges): ${esc(inr(net))}</b></p><p style="color:#666;margin-top:16px">Generated by the admin panel from platform records. Not an exchange-format contract note. Use Ctrl+P to print or save as PDF.</p></body></html>`)
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
  const w = window.open(url, '_blank')
  if (!w) {
    URL.revokeObjectURL(url)
    alert('Popup blocked. Please allow popups for this site and try again.')
    return
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

const ORDERS_CAP = 20000
function isPartialDay(orders: AdminTransaction[] | null, date: string) {
  if (!orders || orders.length < ORDERS_CAP) return false
  const oldest = orders.reduce((m, o) => (day(o.created_at) < m ? day(o.created_at) : m), '9999')
  return date === oldest
}

export function ContractNotesPage() {
  const d = useDocs()
  const [uid, setUid] = useState('')
  const list = useMemo(() => clientList(d), [d])
  const groups = useMemo(() => {
    if (!d.orders) return null
    const m = new Map<string, G>()
    d.orders.filter((o) => !uid || o.user_id === uid).forEach((o) => {
      const k = `${o.user_id}|${day(o.created_at)}`
      const g = m.get(k) ?? { key: k, uid: o.user_id, name: o.user_name, email: o.user_email, date: day(o.created_at), trades: [], buy: 0, sell: 0, charges: 0 }
      g.trades.push(o)
      const v = o.quantity * o.price
      if (o.buy_sell === 'BUY') g.buy += v
      else g.sell += v
      g.charges += Number(o.charges) || 0
      m.set(k, g)
    })
    return [...m.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [d.orders, uid])
  return (
    <Page title="Contract Notes" subtitle="One note per client per trading day, built from executed trades" e={d.e}>
      <div className="flex flex-wrap gap-3 items-center">
        <Picker list={list} value={uid} onChange={setUid} all />
        <button className={btnCls} disabled={!groups || groups.length === 0} onClick={() => groups && downloadCsv('contract-notes.csv', ['date', 'client', 'email', 'trades', 'buy_value', 'sell_value', 'charges', 'net_payable', 'incomplete_day'], groups.map((g) => [g.date, g.name, g.email, g.trades.length, g.buy, g.sell, g.charges, g.buy - g.sell + g.charges, isPartialDay(d.orders, g.date) ? 'YES' : 'NO']))}>Download CSV</button>
      </div>
      <Table
        cols={['Date', 'Client', 'Trades', 'Buy value', 'Sell value', 'Charges', 'Net payable', 'Note']}
        rows={groups ? groups.slice(0, 200).map((g) => [g.date + (isPartialDay(d.orders, g.date) ? ' (partial)' : ''), `${g.name} (${g.email})`, String(g.trades.length), inr(g.buy), inr(g.sell), inr(g.charges), inr(g.buy - g.sell + g.charges), <button key={g.key} className={smallBtn} onClick={() => openNote(g, isPartialDay(d.orders, g.date))}>Open / Print</button>]) : null}
        empty="No trades."
      />
      <Note t="Notes are generated on demand from platform records. Official contract note numbers, exchange and clearing details, STT / stamp duty breakup and emailing to clients are not built. The transactions API returns at most 20000 rows platform-wide; when that cap is reached the oldest day loaded is marked (partial) and its totals may be incomplete." />
    </Page>
  )
}

export function TradeConfirmationsPage() {
  const d = useDocs()
  const [uid, setUid] = useState('')
  const list = useMemo(() => clientList(d), [d])
  const rows = d.orders ? d.orders.filter((o) => !uid || o.user_id === uid) : null
  return (
    <Page title="Trade Confirmations" subtitle="Each executed trade with price, quantity and charges" e={d.e}>
      <div className="flex flex-wrap gap-3 items-center">
        <Picker list={list} value={uid} onChange={setUid} all />
        <button className={btnCls} disabled={!rows || rows.length === 0} onClick={() => rows && downloadCsv('trade-confirmations.csv', ['time', 'client', 'email', 'symbol', 'side', 'quantity', 'price', 'value', 'charges'], rows.map((o) => [o.created_at, o.user_name, o.user_email, o.symbol, o.buy_sell, o.quantity, o.price, o.quantity * o.price, o.charges]))}>Download CSV</button>
      </div>
      <Table
        cols={['Time', 'Client', 'Symbol', 'Side', 'Quantity', 'Price', 'Value', 'Charges']}
        rows={rows ? rows.slice(0, 200).map((o) => [new Date(o.created_at).toLocaleString(), `${o.user_name} (${o.user_email})`, o.symbol, o.buy_sell, String(o.quantity), inr(o.price), inr(o.quantity * o.price), inr(o.charges)]) : null}
        empty="No trades."
      />
      <Note t="Preview shows the first 200 rows, the CSV has all rows the API returns. Exchange trade numbers and order IDs are not stored." />
    </Page>
  )
}

export function LedgerPage() {
  const d = useDocs()
  const [uid, setUid] = useState('')
  const list = useMemo(() => clientList(d), [d])
  const rows = useMemo(() => {
    if (!d.f || !uid) return null
    const all = [
      ...d.f.deposits.filter((x) => x.user_id === uid).map((x) => ({ at: x.created_at, type: 'Deposit', desc: x.description, amt: Math.abs(Number(x.amount) || 0) })),
      ...d.f.withdrawals.filter((x) => x.user_id === uid).map((x) => ({ at: x.created_at, type: 'Withdrawal', desc: x.description, amt: -Math.abs(Number(x.amount) || 0) })),
    ].sort((a, b) => (a.at < b.at ? -1 : 1))
    let run = 0
    return all.map((x) => { run += x.amt; return { ...x, run } })
  }, [d.f, uid])
  return (
    <Page title="Ledger Statements" subtitle="Deposits and withdrawals for one client with a running total" e={d.e}>
      <div className="flex flex-wrap gap-3 items-center">
        <Picker list={list} value={uid} onChange={setUid} all={false} />
        <button className={btnCls} disabled={!rows || rows.length === 0} onClick={() => rows && downloadCsv('ledger.csv', ['time', 'type', 'description', 'amount', 'cumulative_net_funds'], rows.map((x) => [x.at, x.type, x.desc, x.amt, x.run]))}>Download CSV</button>
      </div>
      {!uid && <Note t="Select a client to see the ledger." />}
      {uid && (
        <Table
          cols={['Time', 'Type', 'Description', 'Amount', 'Cumulative net funds moved']}
          rows={rows ? rows.map((x) => [new Date(x.at).toLocaleString(), x.type, x.desc, inr(x.amt), inr(x.run)]) : null}
          empty="No funds movement for this client."
        />
      )}
      <Note t="Covers deposits and withdrawals the funds API returns. Trade debits and credits, charges and an opening balance are not part of this ledger, so the running total is net funds moved, not the wallet balance." />
    </Page>
  )
}

export function HoldingStatementsPage() {
  const d = useDocs()
  const [uid, setUid] = useState('')
  const list = useMemo(() => clientList(d), [d])
  const rows = d.p && uid ? d.p.holdings.filter((h) => h.user_id === uid) : null
  const total = rows ? rows.reduce((s, h) => s + (Number(h.invested) || 0), 0) : null
  return (
    <Page title="Holding Statements" subtitle="Equity holdings of one client" e={d.e}>
      <div className="flex flex-wrap gap-3 items-center">
        <Picker list={list} value={uid} onChange={setUid} all={false} />
        <button className={btnCls} disabled={!rows || rows.length === 0} onClick={() => rows && downloadCsv('holdings.csv', ['symbol', 'company', 'exchange', 'quantity', 'avg_price', 'invested'], rows.map((h) => [h.symbol, h.company_name, h.exchange, h.quantity, h.avg_price, h.invested]))}>Download CSV</button>
      </div>
      {!uid && <Note t="Select a client to see the holdings." />}
      {uid && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Holdings" value={rows ? String(rows.length) : '-'} />
            <StatCard label="Total invested" value={total === null ? '-' : inr(total)} tone="brand" />
          </div>
          <Table
            cols={['Symbol', 'Company', 'Exchange', 'Quantity', 'Avg price', 'Invested']}
            rows={rows ? rows.map((h) => [h.symbol, h.company_name, h.exchange, String(h.quantity), inr(h.avg_price), inr(h.invested)]) : null}
            empty="No holdings for this client."
          />
        </>
      )}
      <Note t="These are platform records, not a depository statement. Market value is not shown because live prices are not stored." />
    </Page>
  )
}

export function TaxStatementsPage() {
  const d = useDocs()
  const rows = useMemo(() => {
    if (!d.p || !d.orders) return null
    const m = new Map<string, { name: string; email: string; pnl: number; ch: number }>()
    const get = (id: string, name: string, email: string) => {
      const v = m.get(id) ?? { name, email, pnl: 0, ch: 0 }
      m.set(id, v)
      return v
    }
    ;[...d.p.futures, ...d.p.options].filter((x) => x.status !== 'OPEN').forEach((x) => { get(x.user_id, x.user_name, x.user_email).pnl += Number(x.pnl) || 0 })
    d.orders.forEach((o) => { get(o.user_id, o.user_name, o.user_email).ch += Number(o.charges) || 0 })
    return [...m.values()].filter((v) => v.pnl !== 0 || v.ch > 0).sort((a, b) => (a.email < b.email ? -1 : 1))
  }, [d.p, d.orders])
  return (
    <Page title="Tax Statements" subtitle="Realised F&O P&L and charges per client" e={d.e}>
      <div className="flex gap-3">
        <button className={btnCls} disabled={!rows || rows.length === 0} onClick={() => rows && downloadCsv('tax-statements.csv', ['client', 'email', 'realised_fno_pnl', 'charges'], rows.map((v) => [v.name, v.email, v.pnl, v.ch]))}>Download CSV</button>
      </div>
      <Table
        cols={['Client', 'Realised F&O P&L', 'Charges (equity, not netted)']}
        rows={rows ? rows.map((v) => [`${v.name} (${v.email})`, inr(v.pnl), inr(v.ch)]) : null}
        empty="No data."
      />
      <Note t="Not a tax computation. Equity capital gains, STT breakup and financial year split are not available. Charges come from the loaded orders." />
    </Page>
  )
}

export function DocHistoryPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/audit-logs').then((x) => setLogs(toArr<AuditLog>(x, 'logs'))).catch((x) => setE(msg(x)))
  }, [])
  const rows = logs ? logs.filter((l) => /email|download|statement|export|report|document/i.test(`${l.action} ${l.resource_type ?? ''}`)) : null
  return (
    <Page title="Email / Download History" subtitle="Record of documents sent or downloaded" e={e}>
      <Table
        cols={['Time', 'Action', 'Resource', 'User ID', 'Result']}
        rows={rows ? rows.map((l) => [new Date(l.created_at).toLocaleString(), l.action, `${l.resource_type ?? ''} ${l.resource_id ?? ''}`.trim(), l.user_id ?? '', l.result]) : null}
        empty="No document events found."
      />
      <Note t="Not tracked. The backend sends no document emails and does not log downloads, so this list only shows audit entries whose action mentions email, download, statement, export, report or document. It is expected to be empty. To support it, a document log table and an email service have to be built." />
    </Page>
  )
}