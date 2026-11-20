import { istToday, istDay } from '../lib/ist'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type PortfolioOverview, type FundsOverview, type MoneyOverview, type ReconciliationDetails } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) => `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const day = (s: string) => istDay(s)

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

export function ClearingMemberPage() {
  return (
    <Page title="Clearing Member" subtitle="Clearing member / clearing corporation relationship" e={null}>
      <Note t="Not available. The backend has no clearing member ID, no clearing corporation (NSCCL / ICCL) link and no exchange funds or securities pay-in/pay-out file. Trades are settled inside the platform. Nothing is shown rather than made-up data." />
    </Page>
  )
}

export function PayInPage() {
  const [f, setF] = useState<FundsOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => { api.get<FundsOverview>('/admin/funds-overview').then(setF).catch((x) => setE(msg(x))) }, [])
  const total = f ? f.deposits.reduce((s, x) => s + Math.abs(Number(x.amount) || 0), 0) : null
  return (
    <Page title="Pay-in" subtitle="Client money coming in (wallet deposits)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Deposits completed" value={f ? String(f.summary.depositsCount) : '-'} tone="brand" />
        <StatCard label="Amount (loaded rows)" value={total === null ? '-' : inr(total)} />
        <StatCard label="Deposits pending" value={f ? String(f.summary.pendingCount) : '-'} tone="amber" />
      </div>
      <Table
        cols={['Time', 'Client', 'Amount', 'Description']}
        rows={f ? f.deposits.slice(0, 200).map((x) => [new Date(x.created_at).toLocaleString(), `${x.user_name} (${x.user_email})`, inr(Math.abs(Number(x.amount) || 0)), x.description]) : null}
        empty="No deposits."
      />
      <Note t="This is client wallet pay-in, the closest data available. Pay-in of funds or securities to a clearing corporation does not exist. Showing the latest rows the API returns." />
    </Page>
  )
}

type W = { user_email?: string; amount?: number; status?: string; reason?: string; created_at?: string; bank_name?: string }

export function PayOutPage() {
  const [f, setF] = useState<FundsOverview | null>(null)
  const [w, setW] = useState<W[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<FundsOverview>('/admin/funds-overview').then(setF).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/withdrawals').then((d) => setW(toArr<W>(d, 'withdrawals'))).catch(() => setW([]))
  }, [])
  return (
    <Page title="Pay-out" subtitle="Client money going out (withdrawals)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Withdrawals completed" value={f ? String(f.summary.withdrawalsCount) : '-'} tone="brand" />
        <StatCard label="Amount completed" value={f ? inr(f.summary.withdrawalsAmount) : '-'} />
        <StatCard label="Requests awaiting action" value={w ? String(w.filter((x) => String(x.status).toLowerCase() === 'pending').length) : '-'} tone="amber" />
      </div>
      <H t="Withdrawal requests" />
      <Table
        cols={['Time', 'Client', 'Amount', 'Bank', 'Status']}
        rows={w ? w.slice(0, 200).map((x) => [x.created_at ? new Date(x.created_at).toLocaleString() : '-', x.user_email ?? '-', inr(x.amount ?? 0), x.bank_name || '-', x.status ?? '-']) : null}
        empty="No withdrawal requests."
      />
      <Note t="Approve or reject requests on the Withdrawal Requests page. Pay-out of funds or securities from a clearing corporation does not exist in the backend." />
    </Page>
  )
}

export function ObligationPage() {
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [m, setM] = useState<MoneyOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
    api.get<MoneyOverview>('/admin/money-overview').then(setM).catch(() => {})
  }, [])
  const today = istToday()
  const rows = (() => {
    if (!p) return null
    const g = new Map<string, { n: number; v: number; users: Set<string> }>()
    p.unsettled.forEach((x) => {
      const d = day(x.settle_date)
      const v = g.get(d) ?? { n: 0, v: 0, users: new Set<string>() }
      v.n++
      v.v += Number(x.invested) || 0
      v.users.add(x.user_id)
      g.set(d, v)
    })
    return [...g.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([d, v]) => [d, String(v.n), String(v.users.size), inr(v.v), d < today ? 'Past settle date' : d === today ? 'Due today' : 'Upcoming'])
  })()
  return (
    <Page title="Obligation" subtitle="Pending settlement obligations by settle date" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Settlement obligations" value={m ? inr(m.settlementObligations) : '-'} tone="amber" />
        <StatCard label="Unsettled positions" value={p ? String(p.summary.unsettled) : '-'} />
      </div>
      <Table cols={['Settle date', 'Positions', 'Clients', 'Value (at entry)', 'Status']} rows={rows} empty="No pending obligations." />
      <Note t="Obligations here are the platform's own T+1 unsettled buys. Net obligation per clearing member and per client against the exchange is not calculated." />
    </Page>
  )
}

export function AuctionPage() {
  return (
    <Page title="Auction" subtitle="Auction of shares not delivered by the seller" e={null}>
      <Note t="Not available. There is no short-delivery handling, no auction record and no exchange auction file. Orders are filled completely inside the platform, so deliveries cannot fail in this way." />
    </Page>
  )
}

export function ExceptionsPage() {
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [r, setR] = useState<ReconciliationDetails | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
    api.get<ReconciliationDetails>('/admin/reconciliation/details').then(setR).catch((x) => setE(msg(x)))
  }, [])
  const today = istToday()
  const rows: string[][] | null = p && r ? [
    ...p.unsettled.filter((x) => day(x.settle_date) < today).map((x) => ['Unsettled past settle date', `${x.user_name} (${x.user_email})`, `${x.symbol} x ${x.quantity}, settle date ${day(x.settle_date)}`]),
    ...r.users.filter((x) => x.status === 'MISMATCHED').map((x) => ['Balance mismatch', `${x.user_name} (${x.user_email})`, `Difference ${inr(x.difference)}. ${x.reason}`]),
    ...r.failedOrders.map((x) => ['Failed payment order', `${x.user_name} (${x.user_email})`, `${inr(x.amount)} on ${day(x.created_at)}`]),
  ] : null
  return (
    <Page title="Settlement Exceptions" subtitle="Items that did not settle or reconcile cleanly" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Exceptions" value={rows ? String(rows.length) : '-'} tone={rows && rows.length > 0 ? 'red' : 'brand'} />
      </div>
      <Table cols={['Type', 'Client', 'Detail']} rows={rows} empty="No exceptions found." />
      <Note t="Built from unsettled positions past their settle date, reconciliation mismatches and failed payment orders. There is no exception workflow (assign, resolve, notes) in the backend yet." />
    </Page>
  )
}