import { withKeys } from '../lib/rowKeys'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type PortfolioOverview, type ReconciliationDetails, type NotificationsOverview } from '../lib/api'
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

type M = { name: string; email: string; bal: number; fut: number; opt: number; mtfM: number; mtfB: number; mtfV: number }

function useMargin() {
  const [pf, setPf] = useState<PortfolioOverview | null>(null)
  const [rc, setRc] = useState<ReconciliationDetails | null>(null)
  const [nt, setNt] = useState<NotificationsOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setPf).catch((x) => setE(msg(x)))
    api.get<ReconciliationDetails>('/admin/reconciliation/details').then(setRc).catch((x) => setE(msg(x)))
    api.get<NotificationsOverview>('/admin/notifications-overview').then(setNt).catch((x) => setE(msg(x)))
  }, [])
  let rows: M[] | null = null
  if (pf && rc) {
    const m = new Map<string, M>()
    const get = (id: string, name: string, email: string) => {
      let v = m.get(id)
      if (!v) {
        v = { name, email, bal: 0, fut: 0, opt: 0, mtfM: 0, mtfB: 0, mtfV: 0 }
        m.set(id, v)
      }
      return v
    }
    rc.users.forEach((x) => { get(x.user_id, x.user_name, x.user_email).bal = x.balance })
    pf.futures.filter((x) => x.status === 'OPEN').forEach((x) => { get(x.user_id, x.user_name, x.user_email).fut += x.margin_used })
    pf.options.filter((x) => x.status === 'OPEN').forEach((x) => { get(x.user_id, x.user_name, x.user_email).opt += x.premium * x.lot_size })
    pf.mtf.filter((x) => x.status === 'OPEN').forEach((x) => {
      const v = get(x.user_id, x.user_name, x.user_email)
      v.mtfM += x.margin_paid
      v.mtfB += x.borrowed_amount
      v.mtfV += x.quantity * x.entry_price
    })
    rows = [...m.values()]
  }
  return { rows, nt, e }
}

const who = (v: M) => `${v.name} (${v.email})`

export function UsedMarginPage() {
  const { rows, e } = useMargin()
  const used = (v: M) => v.fut + v.opt + v.mtfM
  const tU = rows ? rows.reduce((s, v) => s + used(v), 0) : null
  const tA = rows ? rows.reduce((s, v) => s + Math.max(0, v.bal), 0) : null
  return (
    <Page title="Available / Used Margin" subtitle="Wallet balance (available) and margin locked in futures and MTF, per user" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Available (wallet balance, negatives excluded)" value={tA === null ? '-' : inr(tA)} tone="brand" />
        <StatCard label="Margin used" value={tU === null ? '-' : inr(tU)} tone="amber" />
        <StatCard label="Users with margin in use" value={rows ? String(rows.filter((v) => used(v) > 0).length) : '-'} />
      </div>
      <Table
        cols={[{ h: 'User' }, { h: 'Available', right: true }, { h: 'Futures margin', right: true }, { h: 'Options premium', right: true }, { h: 'MTF margin', right: true }, { h: 'Used total', right: true }]}
        rows={rows ? rows.filter((v) => used(v) > 0 || v.bal !== 0).sort((a, b) => used(b) - used(a)).map((v) => [who(v), inr(v.bal), inr(v.fut), inr(v.opt), inr(v.mtfM), inr(used(v))]) : null}
        empty="No data."
      />
      <Note t="Available means the wallet balance. Margin utilisation % against a limit is not shown because there are no limits in the backend." />
    </Page>
  )
}

export function SpanPage() {
  return (
    <Page title="SPAN Margin" subtitle="Risk-array based margin" e={null}>
      <Note t="SPAN margin is not calculated. The backend charges a fixed margin when a futures position opens and stores it as margin used (see Available / Used Margin). SPAN needs price scan ranges and volatility data that the backend does not have. Nothing is shown rather than made-up numbers." />
    </Page>
  )
}

export function ExposureMarginPage() {
  const { rows, e } = useMargin()
  const tot = (v: M) => v.fut + v.opt + v.mtfB
  return (
    <Page title="Exposure Margin" subtitle="Leveraged exposure per user: futures margin + options premium + MTF borrowed" e={e}>
      <Table
        cols={[{ h: 'User' }, { h: 'Futures margin', right: true }, { h: 'Options premium', right: true }, { h: 'MTF borrowed', right: true }, { h: 'Total exposure', right: true }]}
        rows={rows ? rows.filter((v) => tot(v) > 0).sort((a, b) => tot(b) - tot(a)).map((v) => [who(v), inr(v.fut), inr(v.opt), inr(v.mtfB), inr(tot(v))]) : null}
        empty="No open leveraged positions."
      />
      <Note t="This is the exposure the platform carries. A separate exposure margin charged on top of SPAN is not part of the backend." />
    </Page>
  )
}

export function CollateralPage() {
  const { rows, e } = useMargin()
  return (
    <Page title="Collateral" subtitle="Value of open MTF holdings against the amount borrowed" e={e}>
      <Table
        cols={[{ h: 'User' }, { h: 'MTF holding value (at entry)', right: true }, { h: 'Margin paid', right: true }, { h: 'Borrowed', right: true }, { h: 'Cover (x borrowed)', right: true }]}
        rows={rows ? rows.filter((v) => v.mtfB > 0).sort((a, b) => b.mtfB - a.mtfB).map((v) => [who(v), inr(v.mtfV), inr(v.mtfM), inr(v.mtfB), (v.mtfV / v.mtfB).toFixed(2)]) : null}
        empty="No open MTF positions."
      />
      <Note t="Pledging of shares or funds as collateral does not exist in the backend. Values are at entry price because live prices are not stored, so the cover is not marked to market." />
    </Page>
  )
}

export function ShortfallPage() {
  const { rows, e } = useMargin()
  const list = rows ? rows.filter((v) => v.bal < 0 && v.fut + v.opt + v.mtfM + v.mtfB > 0) : null
  return (
    <Page title="Margin Shortfall" subtitle="Users with a negative wallet balance while holding open margin positions" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Users in shortfall" value={list ? String(list.length) : '-'} tone={list && list.length > 0 ? 'red' : 'default'} />
        <StatCard label="Total shortfall" value={list ? inr(list.reduce((s, v) => s - v.bal, 0)) : '-'} tone={list && list.length > 0 ? 'red' : 'default'} />
      </div>
      <Table
        cols={[{ h: 'User' }, { h: 'Wallet balance', right: true }, { h: 'Futures margin', right: true }, { h: 'MTF borrowed', right: true }]}
        rows={list ? list.sort((a, b) => a.bal - b.bal).map((v) => [who(v), inr(v.bal), inr(v.fut), inr(v.mtfB)]) : null}
        empty="No shortfall found."
      />
      <Note t="Shortfall here means balance below zero with positions open. A mark-to-market shortfall needs live prices, which the backend does not store." />
    </Page>
  )
}

export function MarginCallsPage() {
  const { nt, e } = useMargin()
  const list = nt ? nt.notifications.filter((n) => /margin/i.test(`${n.title} ${n.body}`)) : null
  return (
    <Page title="Margin Calls" subtitle="Margin-related notifications sent to users" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Margin notifications" value={list ? String(list.length) : '-'} tone={list && list.length > 0 ? 'amber' : 'default'} />
      </div>
      <Table
        cols={[{ h: 'Time' }, { h: 'User' }, { h: 'Title' }, { h: 'Message' }, { h: 'Read' }]}
        rows={list ? list.map((n) => [new Date(n.created_at).toLocaleString(), `${n.user_name} (${n.user_email})`, n.title, n.body, n.read ? 'Yes' : 'No']) : null}
        empty="No margin call notifications found."
      />
      <Note t="Taken from the notifications table (messages that mention margin), within the rows the API returns. A dedicated margin call record with status and follow-up does not exist in the backend." />
    </Page>
  )
}