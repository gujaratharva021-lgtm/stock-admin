import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type AdminTransaction } from '../lib/api'
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

function Table({ cols, rows, empty }: { cols: { h: string; right?: boolean }[]; rows: ReactNode[][] | null; empty: string }) {
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

type Po = { id: string; user_email: string; symbol: string; buy_sell: string; order_type: string; quantity: number; trigger_price: number; status: string; created_at: string }

function usePending() {
  const [rows, setRows] = useState<Po[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  const load = () => {
    return api.get<unknown>('/admin/pending-orders').then((d) => { setRows(toArr<Po>(d, 'orders')); setE(null) }).catch((x) => setE(msg(x)))
  }
  useEffect(() => { load() }, [])
  return { rows, e, setE, load }
}

const cnt = (r: Po[] | null, s: string) => (r ? String(r.filter((x) => x.status === s).length) : '-')

export function LifecyclePage() {
  const { rows, e } = usePending()
  const stage = (s: string) => (s === 'PENDING' ? 'Waiting for trigger price' : s === 'EXECUTED' ? 'Triggered and filled' : s === 'CANCELLED' ? 'Cancelled' : s === 'REJECTED' ? 'Rejected' : s)
  return (
    <Page title="Order Lifecycle" subtitle="Status of limit, stop-loss and GTT orders from placement to completion" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={cnt(rows, 'PENDING')} tone="amber" />
        <StatCard label="Executed" value={cnt(rows, 'EXECUTED')} tone="brand" />
        <StatCard label="Cancelled" value={cnt(rows, 'CANCELLED')} />
        <StatCard label="Rejected" value={cnt(rows, 'REJECTED')} tone="red" />
      </div>
      <Table
        cols={[{ h: 'Placed' }, { h: 'User' }, { h: 'Symbol' }, { h: 'Side' }, { h: 'Type' }, { h: 'Quantity', right: true }, { h: 'Trigger', right: true }, { h: 'Status' }, { h: 'Stage' }]}
        rows={rows ? rows.map((o) => [new Date(o.created_at).toLocaleString(), o.user_email, o.symbol, o.buy_sell, o.order_type, String(o.quantity), inr(o.trigger_price), o.status, stage(o.status)]) : null}
        empty="No orders."
      />
      <Note t="Covers pending-type orders only (latest 200). Market orders fill instantly and appear in Execution / Fills. Time of each status change is not stored, so the full history of an order is not available." />
    </Page>
  )
}

export function ExchangeIdPage() {
  return (
    <Page title="Exchange Order ID" subtitle="Order identifier issued by an exchange or broker" e={null}>
      <Note t="Not available. There is no exchange or broker connection. F&O orders get a simulated ID (SIM-...) from the built-in executor, but it is not saved in any table, so no ID can be listed. To support it, an exchange_order_id column has to be added to orders and positions, and a real broker executor connected." />
    </Page>
  )
}

export function FillsPage() {
  const [o, setO] = useState<AdminTransaction[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/portfolio/admin/all-transactions?limit=20000').then((d) => setO(toArr<AdminTransaction>(d, 'transactions'))).catch((x) => setE(msg(x)))
  }, [])
  const val = o ? o.reduce((s, x) => s + x.quantity * x.price, 0) : null
  return (
    <Page title="Execution / Fills" subtitle="Executed trades with price, quantity and charges" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Fills" value={o ? String(o.length) : '-'} tone="brand" />
        <StatCard label="Filled value" value={val === null ? '-' : inr(val)} />
      </div>
      <Table
        cols={[{ h: 'Time' }, { h: 'User' }, { h: 'Symbol' }, { h: 'Side' }, { h: 'Quantity', right: true }, { h: 'Fill price', right: true }, { h: 'Value', right: true }, { h: 'Charges', right: true }]}
        rows={o ? o.slice(0, 200).map((x) => [new Date(x.created_at).toLocaleString(), `${x.user_name} (${x.user_email})`, x.symbol, x.buy_sell, String(x.quantity), inr(x.price), inr(x.quantity * x.price), inr(x.charges)]) : null}
        empty="No executed trades."
      />
      <Note t="Each row is one complete fill at one price. Showing the latest 200. Order ID, venue and fill sequence are not stored." />
    </Page>
  )
}

export function PartialFillsPage() {
  return (
    <Page title="Partial Fills" subtitle="Orders filled in more than one part" e={null}>
      <Note t="Not available. Every order is filled completely in one step at one price. There is no filled quantity or remaining quantity column, so partial fills cannot occur or be shown." />
    </Page>
  )
}

export function RejectionsPage() {
  const { rows, e } = usePending()
  const rej = rows ? rows.filter((x) => x.status === 'REJECTED') : null
  return (
    <Page title="Rejections" subtitle="Orders that were rejected" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Rejected orders" value={rej ? String(rej.length) : '-'} tone={rej && rej.length > 0 ? 'red' : 'default'} />
      </div>
      <Table
        cols={[{ h: 'Time' }, { h: 'User' }, { h: 'Symbol' }, { h: 'Side' }, { h: 'Type' }, { h: 'Quantity', right: true }, { h: 'Trigger', right: true }]}
        rows={rej ? rej.map((o) => [new Date(o.created_at).toLocaleString(), o.user_email, o.symbol, o.buy_sell, o.order_type, String(o.quantity), inr(o.trigger_price)]) : null}
        empty="No rejected orders."
      />
      <Note t="The reason for rejection (insufficient funds, halted symbol and so on) is not stored, so only the order itself is listed. Orders refused at placement time may never be saved, so they are not counted here." />
    </Page>
  )
}

export function ModifyCancelPage() {
  const { rows, e, setE, load } = usePending()
  const [busy, setBusy] = useState<string | null>(null)
  const open = rows ? rows.filter((x) => x.status === 'PENDING') : null
  async function cancel(o: Po) {
    if (!window.confirm(`Cancel ${o.buy_sell} ${o.quantity} ${o.symbol} for ${o.user_email}?`)) return
    setBusy(o.id)
    try {
      await api.post(`/admin/pending-orders/${o.id}/cancel`)
      await load()
    } catch (x) {
      setE(msg(x))
    } finally {
      setBusy(null)
    }
  }
  return (
    <Page title="Modify / Cancel" subtitle="Open orders that an admin can cancel" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Open orders" value={open ? String(open.length) : '-'} tone="amber" />
      </div>
      <Table
        cols={[{ h: 'Placed' }, { h: 'User' }, { h: 'Symbol' }, { h: 'Side' }, { h: 'Type' }, { h: 'Quantity', right: true }, { h: 'Trigger', right: true }, { h: 'Action', right: true }]}
        rows={open ? open.map((o) => [new Date(o.created_at).toLocaleString(), o.user_email, o.symbol, o.buy_sell, o.order_type, String(o.quantity), inr(o.trigger_price), <button key={o.id} disabled={busy === o.id} onClick={() => cancel(o)} className="text-xs px-2.5 py-1 rounded border border-red/30 text-red disabled:opacity-50">Cancel</button>]) : null}
        empty="No open orders."
      />
      <Note t="Cancel is supported. Modify (change quantity or price) is not, because the backend has no modify endpoint. Cancel is an action on a user's order, so use it only when needed." />
    </Page>
  )
}

export function AckPage() {
  return (
    <Page title="Exchange Acknowledgement" subtitle="Confirmation received from the exchange for an order" e={null}>
      <Note t="Not available. There is no exchange connection, so no acknowledgement (accepted, rejected, or traded message) is ever received or recorded. Orders are executed inside the platform. To support it, a real broker or exchange gateway and an acknowledgement log table have to be built first." />
    </Page>
  )
}