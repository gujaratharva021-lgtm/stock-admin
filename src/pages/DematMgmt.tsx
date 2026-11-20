import { istToday, istDay } from '../lib/ist'
import { withKeys } from '../lib/rowKeys'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type PortfolioOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) => `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
              <th key={c.h} className={c.right ? 'px-4 py-2.5 font-medium text-right' : 'px-4 py-2.5 font-medium'}>{c.h}</th>
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
                <td key={j} className={cols[j].right ? 'px-4 py-2.5 text-right tabular text-ink' : 'px-4 py-2.5 text-ink'}>{v}</td>
              ))}
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

export function HoldingsPage() {
  const { p, e } = usePf()
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    if (!p) return null
    const s = q.trim().toLowerCase()
    return p.holdings.filter((h) => !s || String(h.user_name ?? '').toLowerCase().includes(s) || String(h.user_email ?? '').toLowerCase().includes(s) || String(h.symbol ?? '').toLowerCase().includes(s))
  }, [p, q])
  const users = p ? new Set(p.holdings.map((h) => h.user_id)).size : null
  const syms = p ? new Set(p.holdings.map((h) => h.symbol)).size : null
  return (
    <Page title="Holdings" subtitle="Equity holdings of all users (settled)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Holdings rows" value={p ? String(p.summary.totalHoldings) : '-'} tone="brand" />
        <StatCard label="Total invested" value={p ? inr(p.summary.totalInvested) : '-'} />
        <StatCard label="Users holding" value={users === null ? '-' : String(users)} />
        <StatCard label="Distinct symbols" value={syms === null ? '-' : String(syms)} />
      </div>
      <input type="text" placeholder="Filter by user or symbol..." value={q} onChange={(ev) => setQ(ev.target.value)} className={inputCls} />
      <Table
        cols={[{ h: 'User' }, { h: 'Symbol' }, { h: 'Exchange' }, { h: 'Quantity', right: true }, { h: 'Avg price', right: true }, { h: 'Invested', right: true }]}
        rows={rows ? rows.map((h) => [`${h.user_name} (${h.user_email})`, `${h.symbol} - ${h.company_name}`, h.exchange, String(h.quantity), inr(h.avg_price), inr(h.invested)]) : null}
        empty="No holdings match."
      />
      <Note t="Shows the rows the API returns (latest 200). Market value and unrealised P&L are not shown because live prices are not stored." />
    </Page>
  )
}

export function DematSyncPage() {
  const { p, e } = usePf()
  return (
    <Page title="Demat Sync" subtitle="Reconciliation of holdings with a depository" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Holdings in platform" value={p ? String(p.summary.totalHoldings) : '-'} />
        <StatCard label="Unsettled (waiting)" value={p ? String(p.summary.unsettled) : '-'} tone="amber" />
      </div>
      <Note t="There is no CDSL / NSDL or broker demat connection, so holdings cannot be compared with a depository and no sync status exists. Holdings here are platform records only. Nothing is shown rather than made-up sync results." />
    </Page>
  )
}

export function PledgePage() {
  return (
    <Page title="Pledge / Unpledge" subtitle="Pledging shares for margin" e={null}>
      <Note t="Pledge and unpledge are not available. The backend has no pledge table, no depository authorisation and no margin credit against shares. To support it, a pledge record, the depository flow and haircut rules have to be built first." />
    </Page>
  )
}

export function DpTransactionsPage() {
  const { p, e } = usePf()
  const today = istToday()
  const rows: string[][] | null = p
    ? [...p.unsettled].sort((a, b) => (a.settle_date < b.settle_date ? -1 : 1)).map((u) => [
        `${u.user_name} (${u.user_email})`,
        u.symbol,
        u.order_type,
        String(u.quantity),
        inr(u.invested),
        istDay(u.buy_date),
        istDay(u.settle_date),
        istDay(u.settle_date) < today ? 'Past settle date' : 'Pending',
      ])
    : null
  return (
    <Page title="DP Transactions" subtitle="Unsettled buys waiting to move into holdings (closest data available)" e={e}>
      <Table
        cols={[{ h: 'User' }, { h: 'Symbol' }, { h: 'Type' }, { h: 'Quantity', right: true }, { h: 'Invested', right: true }, { h: 'Buy date' }, { h: 'Settle date' }, { h: 'Status' }]}
        rows={rows}
        empty="No unsettled positions."
      />
      <Note t="Real DP transactions (debit/credit, transfers, off-market, delivery instructions) are not recorded. This list is only the platform's own T+1 settlement queue. 'Past settle date' means a position is still unsettled after its settle date, so check the settlement job." />
    </Page>
  )
}

export function CaAdjustedPage() {
  return (
    <Page title="Corporate-action adjusted holdings" subtitle="Holdings after splits, bonus and similar actions" e={null}>
      <Note t="Corporate actions are applied straight to holdings when an admin presses Apply, so holdings already include the adjustments. Announced and applied actions are listed under Corporate Actions (Dividends, Bonus, Splits, Buyback, Rights, Merger). A per-holding adjustment history is not stored." />
    </Page>
  )
}