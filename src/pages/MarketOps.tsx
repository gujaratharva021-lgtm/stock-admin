import { askReason } from '../lib/reason'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type InstrumentsResponse } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const inputCls = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'

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

type Halted = { id: string; symbol: string; company_name: string; halt_reason: string | null }
type Asset = { kind?: string; name?: string; detail?: string; halted?: boolean; halt_reason?: string }

function useHalts() {
  const [h, setH] = useState<Halted[] | null>(null)
  const [a, setA] = useState<Asset[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const load = () => {
    const p1 = api.get<unknown>('/admin/halted-instruments').then((d) => setH(toArr<Halted>(d, 'halted'))).catch((x) => setE(msg(x)))
    const p2 = api.get<unknown>('/admin/assets').then((d) => setA(toArr<Asset>(d, 'assets'))).catch(() => setA([]))
    return Promise.all([p1, p2])
  }
  useEffect(() => { load() }, [])
  async function toggle(id: string, symbol: string, isHalted: boolean) {
    let reason = ''
    if (!isHalted) {
      const r = askReason(`Halt trading in ${symbol}? Enter a reason:`)
      if (r === null) return
      reason = r
    } else if (!window.confirm(`Resume trading in ${symbol}?`)) return
    setBusy(id)
    try {
      await api.post(`/admin/instruments/${id}/${isHalted ? 'unhalt' : 'halt'}`, { reason })
      setE(null)
      await load()
    } catch (x) {
      setE(msg(x))
    } finally {
      setBusy(null)
    }
  }
  return { h, a, e, busy, toggle }
}

type MarketStatus = {
  status: string
  holiday: string
  ist_now: string
  session: string
  year: number
  covers_year: boolean
  years: number[]
  holidays: { date: string; name: string }[]
}

function useMarketStatus() {
  const [d, setD] = useState<MarketStatus | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    const run = () =>
      api
        .get<MarketStatus>('/admin/market-status')
        .then((r) => { if (!cancelled) { setD(r); setE(null) } })
        .catch((x) => { if (!cancelled) setE(msg(x)) })
    run()
    const t = setInterval(run, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])
  return { d, e }
}

export function MoOpenClosePage() {
  const { d, e } = useMarketStatus()
  return (
    <Page title="Market Open / Close" subtitle="Live status from the backend's own hours and holiday calendar (IST)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Market" value={d ? d.status : '-'} tone={d?.status === 'Open' ? 'brand' : 'default'} />
        <StatCard label="Holiday today" value={d ? d.holiday || '-' : '-'} tone={d?.holiday ? 'amber' : 'default'} />
        <StatCard label="IST now" value={d ? d.ist_now : '-'} />
        <StatCard label="Standard session" value={d ? d.session : '-'} />
      </div>
      {d && !d.covers_year && (
        <div className="text-sm text-amber bg-amber-tint border border-amber/20 rounded px-3 py-2">
          The backend holiday calendar has no entries for {d.year}. Weekday market holidays are not blocked until the list is updated.
        </div>
      )}
      <Note t="This status comes from the server, using the same check that blocks orders: Monday to Friday, 09:15 to 15:30 IST, and not on a holiday in the calendar. There is no pre-open order session, so orders placed at 09:00 to 09:15 are rejected as market closed." />
    </Page>
  )
}

export function MoHolidaysPage() {
  const { d, e } = useMarketStatus()
  const rows = d ? d.holidays.map((h) => [h.date, h.name]) : null
  return (
    <Page title="Trading Holidays" subtitle="Holiday list the backend uses to block orders and set settle dates" e={e}>
      <Table cols={['Date', 'Name']} rows={rows} empty="No holidays." />
      <Note t={`Loaded live from the backend, so it always matches what blocks orders. Years covered: ${d ? d.years.join(', ') || 'none' : '-'}. The list lives in pkg/market/market.go and must be extended each year from the official NSE circular. Special sessions (for example Diwali Muhurat) are not modelled. A proper fix is a holidays table with an admin screen.`} />
    </Page>
  )
}
export function MoExchangeStatusPage() {
  return (
    <Page title="Exchange Status" subtitle="Connectivity and session status of the exchange" e={null}>
      <Note t="Not available. There is no exchange or broker connection to report on. Orders are executed inside the platform. Quotes come from a market data source, which is covered under Integrations. To support it, a real exchange gateway and a heartbeat or status log would have to be built." />
    </Page>
  )
}

type Ins = InstrumentsResponse['instruments'][number]

export function MoFreezePage() {
  const { h, e: he, busy, toggle } = useHalts()
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [data, setData] = useState<Ins[] | null>(null)
  const [total, setTotal] = useState(0)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => {
    let cancel = false
    const params = new URLSearchParams({ limit: '50', offset: '0' })
    if (q) params.set('q', q)
    api.get<InstrumentsResponse>(`/admin/instruments?${params.toString()}`)
      .then((r) => { if (!cancel) { setData(r.instruments); setTotal(r.total); setE(null) } })
      .catch((x) => { if (!cancel) setE(msg(x)) })
    return () => { cancel = true }
  }, [q])
  const hs = new Map((h ?? []).map((x) => [x.id, x.halt_reason ?? '']))
  const rows = data ? data.map((r) => {
    const isH = hs.has(r.id)
    return [
      r.symbol,
      r.company_name,
      r.exchange,
      isH ? <span key="s" title={hs.get(r.id)} className="text-xs px-1.5 py-0.5 rounded bg-red-tint text-red">Frozen</span> : 'Trading',
      <button key={r.id} disabled={busy === r.id} onClick={() => toggle(r.id, r.symbol, isH)} className={`text-xs px-2.5 py-1 rounded border disabled:opacity-50 ${isH ? 'border-border text-ink' : 'border-red/30 text-red'}`}>{isH ? 'Unfreeze' : 'Freeze'}</button>,
    ]
  }) : null
  return (
    <Page title="Scrip Freeze / Unfreeze" subtitle="Stop or resume trading in one stock" e={e || he}>
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search symbol or company..." value={input} onChange={(ev) => setInput(ev.target.value)} className={`${inputCls} w-72`} />
        <span className="text-xs text-muted">{data ? `Showing ${data.length} of ${total.toLocaleString('en-IN')}` : ''}</span>
      </div>
      <Table cols={['Symbol', 'Company', 'Exchange', 'Status', 'Action']} rows={rows} empty="No instruments match." />
      <Note t="Freeze uses the existing halt flag: the same one as Trading Halt and Market & Instruments. A frozen stock cannot be traded by clients, so use it with care. There is no separate buy-only or sell-only freeze, and no scheduled unfreeze, in the backend." />
    </Page>
  )
}

export function MoHaltPage() {
  const { h, a, e, busy, toggle } = useHalts()
  const ha = a ? a.filter((x) => x.halted) : null
  return (
    <Page title="Trading Halt" subtitle="Everything that is currently halted" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Halted stocks" value={h ? String(h.length) : '-'} tone={h && h.length > 0 ? 'red' : 'default'} />
        <StatCard label="Halted ETF / commodity / MF" value={ha ? String(ha.length) : '-'} tone={ha && ha.length > 0 ? 'red' : 'default'} />
      </div>
      <div>
        <H t="Halted stocks" />
        <Table
          cols={['Symbol', 'Company', 'Reason', 'Action']}
          rows={h ? h.map((x) => [x.symbol, x.company_name, x.halt_reason || '-', <button key={x.id} disabled={busy === x.id} onClick={() => toggle(x.id, x.symbol, true)} className="text-xs px-2.5 py-1 rounded border border-border text-ink disabled:opacity-50">Resume</button>]) : null}
          empty="No stocks are halted."
        />
      </div>
      <div>
        <H t="Halted ETF / commodity / mutual fund" />
        <Table cols={['Kind', 'Name', 'Detail', 'Reason']} rows={ha ? ha.map((x) => [x.kind ?? '', x.name ?? '', x.detail ?? '', x.halt_reason || '-']) : null} empty="Nothing is halted." />
      </div>
      <Note t="To halt a stock, use Scrip Freeze / Unfreeze. ETF, commodity and mutual fund halts are managed in ETF / Commodity / MF. A market-wide halt (circuit-breaker style) is not built." />
    </Page>
  )
}

export function MoCircuitPage() {
  return (
    <Page title="Circuit Limits" subtitle="Upper and lower circuit per instrument" e={null}>
      <Note t="Not available. No circuit limit is stored per instrument and orders are not checked against one. This is the same gap as Circuit Limits under Advanced RMS. To support it, store a limit per stock and enforce it when an order is placed." />
    </Page>
  )
}

export function MoAuctionPage() {
  return (
    <Page title="Auction Market" subtitle="Exchange auction session" e={null}>
      <Note t="Not available. There is no auction session, auction order book or auction record. Orders are filled inside the platform at the live quote. Nothing is shown rather than made-up data." />
    </Page>
  )
}