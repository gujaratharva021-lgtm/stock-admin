import { istToday, istDay } from '../lib/ist'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type InstrumentsResponse, type PortfolioOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const th = 'px-4 py-2.5 font-medium'
const thr = 'px-4 py-2.5 font-medium text-right'
const td = 'px-4 py-2.5 text-ink'
const tdr = 'px-4 py-2.5 text-right tabular text-ink'
const inputCls = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'
const btnCls = 'rounded border border-border-strong bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg disabled:opacity-40'

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

type Halted = { id: string; symbol: string; company_name: string; halt_reason: string | null }
type Asset = { kind?: string; name?: string; detail?: string; halted?: boolean; halt_reason?: string }

function useHalted() {
  const [h, setH] = useState<Halted[] | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/halted-instruments').then((d) => setH(toArr<Halted>(d, 'halted'))).catch(() => setH([]))
  }, [])
  return h
}

function useFno() {
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
  }, [])
  return { p, e }
}

const PAGE = 100

export function SymbolsPage() {
  const [data, setData] = useState<InstrumentsResponse | null>(null)
  const [e, setE] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [exchange, setExchange] = useState('')
  const [offset, setOffset] = useState(0)
  const halted = useHalted()
  useEffect(() => {
    const t = setTimeout(() => { setQ(input.trim()); setOffset(0) }, 300)
    return () => clearTimeout(t)
  }, [input])
  useEffect(() => {
    const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) })
    if (q) params.set('q', q)
    if (exchange) params.set('exchange', exchange)
    let cancel = false
    api.get<InstrumentsResponse>(`/admin/instruments?${params.toString()}`)
      .then((r) => { if (!cancel) { setData(r); setE(null) } })
      .catch((x) => { if (!cancel) setE(msg(x)) })
    return () => { cancel = true }
  }, [q, exchange, offset])
  const hs = new Set((halted ?? []).map((x) => x.id))
  const total = data?.total ?? 0
  return (
    <Page title="NSE / BSE Symbols" subtitle="Symbol master from the stocks table" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total instruments" value={data ? (Number(data.totalAll) || 0).toLocaleString('en-IN') : '-'} tone="brand" />
        <StatCard label="Exchanges" value={data ? data.exchanges.join(', ') || '-' : '-'} />
        <StatCard label="Halted" value={halted ? String(halted.length) : '-'} tone={halted && halted.length > 0 ? 'red' : 'default'} />
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Search symbol or company..." value={input} onChange={(ev) => setInput(ev.target.value)} className={`${inputCls} w-72`} />
        <select value={exchange} onChange={(ev) => { setExchange(ev.target.value); setOffset(0) }} className={inputCls}>
          <option value="">All exchanges</option>
          {data?.exchanges.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <button className={btnCls} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Prev</button>
        <button className={btnCls} disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</button>
        <span className="text-xs text-muted">{data ? `${total === 0 ? 0 : offset + 1}-${Math.min(offset + PAGE, total)} of ${total.toLocaleString('en-IN')}` : ''}</span>
      </div>
      <Table
        cols={[{ h: 'Symbol' }, { h: 'Company' }, { h: 'Sector' }, { h: 'Exchange' }, { h: 'Trading status' }]}
        rows={data ? data.instruments.map((r) => [r.symbol, r.company_name, r.sector || '-', r.exchange, hs.has(r.id) ? 'Halted' : 'Trading']) : null}
        empty="No instruments match."
      />
    </Page>
  )
}

export function IsinPage() {
  return (
    <Page title="ISIN" subtitle="International Securities Identification Number" e={null}>
      <Note t="ISIN is not stored. The stocks table has only symbol, company name, sector and exchange, so no ISIN can be shown. To support it, an isin column has to be added to stocks and filled from an official NSE/BSE master file. Nothing is shown rather than made-up values." />
    </Page>
  )
}

export function TickSizePage() {
  return (
    <Page title="Tick Size" subtitle="Minimum price movement per instrument" e={null}>
      <Note t="Tick size is not stored and is not enforced on orders by the backend. To support it, a tick_size column has to be added to stocks. Nothing is shown rather than made-up values." />
    </Page>
  )
}

export function LotSizePage() {
  const { p, e } = useFno()
  const rows: string[][] | null = (() => {
    if (!p) return null
    const m = new Map<string, { lots: Set<number>; n: number }>()
    ;[...p.futures, ...p.options].forEach((x) => {
      const v = m.get(x.symbol) ?? { lots: new Set<number>(), n: 0 }
      v.lots.add(x.lot_size)
      v.n++
      m.set(x.symbol, v)
    })
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([s, v]) => [s, [...v.lots].sort((a, b) => a - b).join(', '), String(v.n)])
  })()
  return (
    <Page title="Lot Size" subtitle="Lot sizes seen on F&O positions" e={e}>
      <Table cols={[{ h: 'Symbol' }, { h: 'Lot sizes used' }, { h: 'Positions', right: true }]} rows={rows} empty="No F&O positions yet." />
      <Note t="There is no lot size master. The backend takes the lot size from each position request, so these are values users used, not official lot sizes. A symbol with several values means users entered different sizes." />
    </Page>
  )
}

export function ContractsPage() {
  const { p, e } = useFno()
  const opt: string[][] | null = (() => {
    if (!p) return null
    const m = new Map<string, { s: string; t: string; k: number; x: string; l: Set<number>; n: number; o: number }>()
    p.options.forEach((x) => {
      const key = `${x.symbol}|${x.option_type}|${x.strike_price}|${istDay(x.expiry_date)}`
      const v = m.get(key) ?? { s: x.symbol, t: x.option_type, k: x.strike_price, x: istDay(x.expiry_date), l: new Set<number>(), n: 0, o: 0 }
      v.l.add(x.lot_size)
      v.n++
      if (x.status === 'OPEN') v.o++
      m.set(key, v)
    })
    return [...m.values()].sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : a.s < b.s ? -1 : 1)).map((v) => [v.s, v.t, String(v.k), v.x, [...v.l].join(', '), String(v.n), String(v.o)])
  })()
  const fut: string[][] | null = (() => {
    if (!p) return null
    const m = new Map<string, { l: Set<number>; n: number; o: number }>()
    p.futures.forEach((x) => {
      const v = m.get(x.symbol) ?? { l: new Set<number>(), n: 0, o: 0 }
      v.l.add(x.lot_size)
      v.n++
      if (x.status === 'OPEN') v.o++
      m.set(x.symbol, v)
    })
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([s, v]) => [s, [...v.l].join(', '), String(v.n), String(v.o)])
  })()
  return (
    <Page title="F&O Contracts" subtitle="Contracts that exist because users opened positions in them" e={e}>
      <div>
        <H t="Options contracts" />
        <Table cols={[{ h: 'Symbol' }, { h: 'Type' }, { h: 'Strike' }, { h: 'Expiry' }, { h: 'Lot size' }, { h: 'Positions', right: true }, { h: 'Open', right: true }]} rows={opt} empty="No options positions." />
      </div>
      <div>
        <H t="Futures" />
        <Table cols={[{ h: 'Symbol' }, { h: 'Lot size' }, { h: 'Positions', right: true }, { h: 'Open', right: true }]} rows={fut} empty="No futures positions." />
      </div>
      <Note t="There is no contract master table. This list is built from positions (latest rows the API returns), so contracts nobody traded are not listed. Futures have no expiry in the backend." />
    </Page>
  )
}

export function ExpiryPage() {
  const { p, e } = useFno()
  const rows: string[][] | null = (() => {
    if (!p) return null
    const today = istToday()
    const m = new Map<string, { c: Set<string>; n: number; o: number }>()
    p.options.forEach((x) => {
      const d = istDay(x.expiry_date)
      const v = m.get(d) ?? { c: new Set<string>(), n: 0, o: 0 }
      v.c.add(`${x.symbol}|${x.option_type}|${x.strike_price}`)
      v.n++
      if (x.status === 'OPEN') v.o++
      m.set(d, v)
    })
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, v]) => {
      const days = Math.round((new Date(d).getTime() - new Date(today).getTime()) / 86400000)
      const st = d < today ? (v.o > 0 ? 'Expired, still open' : 'Expired') : 'Active'
      return [d, String(v.c.size), String(v.n), String(v.o), d < today ? '-' : String(days), st]
    })
  })()
  return (
    <Page title="Expiry" subtitle="Options expiry dates and open positions on each" e={e}>
      <Table cols={[{ h: 'Expiry date' }, { h: 'Contracts', right: true }, { h: 'Positions', right: true }, { h: 'Open', right: true }, { h: 'Days left', right: true }, { h: 'Status' }]} rows={rows} empty="No options positions." />
      <Note t="'Expired, still open' means an option past its expiry still has an open position. The backend settles these automatically, so if this stays above zero for long, check the settlement job." />
    </Page>
  )
}

export function TradingStatusPage() {
  const halted = useHalted()
  const [assets, setAssets] = useState<Asset[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/assets').then((d) => setAssets(toArr<Asset>(d, 'assets'))).catch((x) => setE(msg(x)))
  }, [])
  const ha = assets ? assets.filter((a) => a.halted) : null
  return (
    <Page title="Trading Status" subtitle="Halted stocks and halted ETFs, commodities and mutual funds" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Halted stocks" value={halted ? String(halted.length) : '-'} tone={halted && halted.length > 0 ? 'red' : 'default'} />
        <StatCard label="Halted ETF / commodity / MF" value={ha ? String(ha.length) : '-'} tone={ha && ha.length > 0 ? 'red' : 'default'} />
        <StatCard label="Other assets trading" value={assets && ha ? String(assets.length - ha.length) : '-'} tone="brand" />
      </div>
      <div>
        <H t="Halted stocks" />
        <Table cols={[{ h: 'Symbol' }, { h: 'Company' }, { h: 'Reason' }]} rows={halted ? halted.map((x) => [x.symbol, x.company_name, x.halt_reason || '-']) : null} empty="No stocks are halted." />
      </div>
      <div>
        <H t="Halted ETF / commodity / mutual fund" />
        <Table cols={[{ h: 'Kind' }, { h: 'Name' }, { h: 'Detail' }, { h: 'Reason' }]} rows={ha ? ha.map((x) => [x.kind ?? '', x.name ?? '', x.detail ?? '', x.halt_reason || '-']) : null} empty="Nothing is halted." />
      </div>
      <Note t="To halt or resume, use Market & Instruments (stocks) or ETF / Commodity / MF (other assets). Market open/closed status and circuit limits are not tracked by the backend." />
    </Page>
  )
}