import { withKeys } from '../lib/rowKeys'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) => `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const fmtT = (s: string) => (s ? new Date(s).toLocaleString() : '-')
const th = 'px-4 py-2.5 font-medium'
const thr = 'px-4 py-2.5 font-medium text-right'
const td = 'px-4 py-2.5 text-ink'
const tdr = 'px-4 py-2.5 text-right tabular text-ink'
const inputCls = 'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'
const btnCls = 'rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60'
const ghostCls = 'rounded border border-border-strong bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg disabled:opacity-40'

function useGet<T>(path: string) {
  const [st, setSt] = useState<{ path: string; d: T | null; e: string | null }>({ path, d: null, e: null })
  useEffect(() => {
    let cancelled = false
    api.get<T>(path)
      .then((d) => { if (!cancelled) setSt({ path, d, e: null }) })
      .catch((x) => { if (!cancelled) setSt({ path, d: null, e: msg(x) }) })
    return () => { cancelled = true }
  }, [path])
  const cur = st.path === path
  return { d: cur ? st.d : null, e: cur ? st.e : null }
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

interface Order {
  order_id: string
  user_email: string
  user_name: string
  amount: number
  created_at: string
  confirmed_at: string
  age_min: number
}
interface OrderRes {
  rows: Order[]
  count: number
  total: number
}

export function DepositsPage() {
  const { d, e } = useGet<OrderRes>('/admin/deposits')
  return (
    <Page title="Deposits" subtitle="Confirmed Razorpay payments credited to wallets (latest 500)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Confirmed deposits" value={d ? String(d.count) : '-'} />
        <StatCard label="Total deposited" value={d ? inr(d.total) : '-'} tone="brand" />
      </div>
      <Table
        cols={[{ h: 'Confirmed at' }, { h: 'Order ID' }, { h: 'User' }, { h: 'Amount', right: true }]}
        rows={d ? d.rows.map((r) => [fmtT(r.confirmed_at || r.created_at), r.order_id, `${r.user_name} (${r.user_email})`, inr(r.amount)]) : null}
        empty="No confirmed deposits."
      />
      <Note t="Only payments through the payment gateway are listed here. Wallet credits from other sources (dividends, refunds) appear in Wallet / Ledger." />
    </Page>
  )
}

export function FailedPaymentsPage() {
  const { d, e } = useGet<OrderRes>('/admin/failed-payments')
  return (
    <Page title="Failed Payments" subtitle="Payment orders still unconfirmed after 20 minutes" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Unconfirmed orders" value={d ? String(d.count) : '-'} tone={d && d.count > 0 ? 'amber' : undefined} />
        <StatCard label="Amount involved" value={d ? inr(d.total) : '-'} tone="amber" />
      </div>
      <Table
        cols={[{ h: 'Created' }, { h: 'Order ID' }, { h: 'User' }, { h: 'Amount', right: true }, { h: 'Age', right: true }]}
        rows={d ? d.rows.map((r) => [fmtT(r.created_at), r.order_id, `${r.user_name} (${r.user_email})`, inr(r.amount), r.age_min >= 120 ? `${Math.round(r.age_min / 60)} h` : `${r.age_min} min`]) : null}
        empty="No unconfirmed payments."
      />
      <Note t="The backend does not store a failed status or the Razorpay error. These are orders that never got confirmed, which usually means the user abandoned or failed the payment. The reconciliation job checks them every 15 minutes and credits any that were actually captured. Read-only." />
    </Page>
  )
}

interface Xfer {
  id: string
  user_email: string
  user_name: string
  amount: number
  status: string
  reason: string
  bank_name: string
  last4: string
  created_at: string
  reviewed_at: string
}

export function FundTransfersPage() {
  const { d, e } = useGet<{ rows: Xfer[] }>('/admin/fund-transfers')
  const [st, setSt] = useState('All')
  const list = d ? d.rows.filter((r) => st === 'All' || r.status === st) : null
  return (
    <Page title="Fund Transfers" subtitle="Withdrawals from wallet to bank accounts (latest 500)" e={e}>
      <div className="flex gap-3">
        <select value={st} onChange={(ev) => setSt(ev.target.value)} className={inputCls}>
          <option>All</option>
          <option>PENDING</option>
          <option>APPROVED</option>
          <option>REJECTED</option>
        </select>
      </div>
      <Table
        cols={[{ h: 'Requested' }, { h: 'User' }, { h: 'Bank' }, { h: 'Amount', right: true }, { h: 'Status' }, { h: 'Reviewed' }, { h: 'Reason' }]}
        rows={list ? list.map((r) => [fmtT(r.created_at), `${r.user_name} (${r.user_email})`, r.bank_name ? `${r.bank_name} ****${r.last4}` : '-', inr(r.amount), r.status, fmtT(r.reviewed_at), r.reason]) : null}
        empty="No transfers."
      />
      <Note t="User-to-user and gift transfers do not exist in the backend, so only withdrawals to bank are shown. Approve or reject under Withdrawal Requests." />
    </Page>
  )
}

interface LRow {
  id: string
  user_email: string
  user_name: string
  type: string
  amount: number
  description: string
  created_at: string
}
interface LRes {
  rows: LRow[]
  total: number
  credits: number
  debits: number
  limit: number
  offset: number
}

const PAGE = 100

export function LedgerPage() {
  const [type, setType] = useState('')
  const [qIn, setQIn] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [off, setOff] = useState(0)
  const { d, e } = useGet<LRes>(`/admin/ledger?type=${type}&q=${encodeURIComponent(q)}&from=${from}&to=${to}&limit=${PAGE}&offset=${off}`)
  const reset = (fn: () => void) => {
    fn()
    setOff(0)
  }
  return (
    <Page title="Wallet / Ledger" subtitle="Every wallet credit and debit, newest first" e={e}>
      <div className="flex flex-wrap gap-3 items-center">
        <select value={type} onChange={(ev) => reset(() => setType(ev.target.value))} className={inputCls}>
          <option value="">All types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
        <input type="text" placeholder="User or description..." value={qIn} onChange={(ev) => setQIn(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') reset(() => setQ(qIn)) }} className={inputCls} />
        <button className={btnCls} onClick={() => reset(() => setQ(qIn))}>Search</button>
        <input type="date" value={from} onChange={(ev) => reset(() => setFrom(ev.target.value))} className={inputCls} />
        <input type="date" value={to} onChange={(ev) => reset(() => setTo(ev.target.value))} className={inputCls} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Matching entries" value={d ? String(d.total) : '-'} />
        <StatCard label="Total credits" value={d ? inr(d.credits) : '-'} tone="brand" />
        <StatCard label="Total debits" value={d ? inr(d.debits) : '-'} tone="red" />
      </div>
      <Table
        cols={[{ h: 'Time' }, { h: 'User' }, { h: 'Type' }, { h: 'Description' }, { h: 'Amount', right: true }]}
        rows={d ? d.rows.map((r) => [fmtT(r.created_at), `${r.user_name} (${r.user_email})`, r.type, r.description, (String(r.type).toLowerCase() === 'debit' ? '-' : '+') + inr(Math.abs(Number(r.amount) || 0))]) : null}
        empty="No ledger entries match."
      />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{d ? `${d.total === 0 ? 0 : d.offset + 1}-${Math.min(d.offset + d.limit, d.total)} of ${d.total}` : ''}</span>
        <div className="flex gap-2">
          <button className={ghostCls} disabled={off === 0} onClick={() => setOff(Math.max(0, off - PAGE))}>Prev</button>
          <button className={ghostCls} disabled={!d || off + PAGE >= d.total} onClick={() => setOff(off + PAGE)}>Next</button>
        </div>
      </div>
      <Note t="Dates use India time. The ledger has no reference id or category column, so the description text is the only label." />
    </Page>
  )
}

interface Ref {
  id: string
  source: string
  user_email: string
  user_name: string
  amount: number
  reason: string
  wallet_credited: boolean
  created_at: string
}

export function RefundsPage() {
  const [n, setN] = useState(0)
  const { d, e } = useGet<{ rows: Ref[] }>(`/admin/refunds?v=${n}`)
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [credit, setCredit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    setInfo(null)
    const amt = Number(amount)
    const em = email.trim()
    const why = reason.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr('Enter a valid user email'); return }
    if (!why) { setErr('A reason is required'); return }
    if (!(amt > 0)) { setErr('Amount must be greater than 0'); return }
    const text = credit
      ? `Record a refund of ${inr(amt)} for ${em} AND credit it to their wallet now?`
      : `Record a refund of ${inr(amt)} for ${em}? The wallet will NOT be changed.`
    if (!window.confirm(text)) return
    setBusy(true)
    try {
      await api.post('/admin/refunds', { user_email: em, amount: amt, reason: why, credit_wallet: credit })
      setInfo(credit ? 'Refund recorded and wallet credited.' : 'Refund recorded. Wallet was not changed.')
      setEmail('')
      setAmount('')
      setReason('')
      setCredit(false)
      setN(n + 1)
    } catch (x) {
      setErr(msg(x))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Page title="Refunds" subtitle="Refunds to wallets: rejected withdrawals and manual records" e={e}>
      {err && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{err}</div>}
      {info && <div className="text-sm text-brand-dark bg-brand-tint border border-brand/20 rounded px-3 py-2">{info}</div>}
      <div className="bg-surface border border-border rounded-md p-4 space-y-3">
        <h2 className="text-sm font-medium text-ink">Record a manual refund</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className={inputCls} placeholder="User email" value={email} onChange={(ev) => setEmail(ev.target.value)} />
          <input className={inputCls} placeholder="Amount (INR)" type="number" value={amount} onChange={(ev) => setAmount(ev.target.value)} />
          <input className={inputCls} placeholder="Reason" value={reason} onChange={(ev) => setReason(ev.target.value)} />
          <button className={btnCls} disabled={busy || !email.trim() || !reason.trim() || !(Number(amount) > 0)} onClick={submit}>{busy ? 'Saving...' : 'Record refund'}</button>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={credit} onChange={(ev) => setCredit(ev.target.checked)} />
          Also credit this amount to the user wallet now
        </label>
      </div>
      <Table
        cols={[{ h: 'Time' }, { h: 'Source' }, { h: 'User' }, { h: 'Reason' }, { h: 'Wallet credited' }, { h: 'Amount', right: true }]}
        rows={d ? d.rows.map((r) => [fmtT(r.created_at), r.source === 'MANUAL' ? 'Manual' : 'Withdrawal rejected', `${r.user_name} (${r.user_email})`, r.reason, r.wallet_credited ? 'Yes' : 'No', inr(r.amount)]) : null}
        empty="No refunds yet."
      />
      <Note t="No money is sent back through Razorpay from here. A manual record without the wallet tick is only a log entry, so the actual payout must be done outside this system. Razorpay refund API is not integrated." />
    </Page>
  )
}