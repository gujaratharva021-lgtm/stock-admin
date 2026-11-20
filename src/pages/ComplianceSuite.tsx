import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type FundsOverview, type AuditLog, type AdminTransaction, type User } from '../lib/api'
import { kycOf } from '../lib/kyc'
import { ignoreIp, isLoginLog } from '../lib/loginLog'
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

type UserStatus = { id?: string; kyc_status?: string; is_blocked?: boolean }

function useData() {
  const [f, setF] = useState<FundsOverview | null>(null)
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [orders, setOrders] = useState<AdminTransaction[] | null>(null)
  const [users, setUsers] = useState<UserStatus[] | null>(null)
  const [people, setPeople] = useState<User[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<FundsOverview>('/admin/funds-overview').then(setF).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/audit-logs').then((d) => setLogs(toArr<AuditLog>(d, 'logs'))).catch((x) => setE(msg(x)))
    api.get<unknown>('/portfolio/admin/all-transactions?limit=20000').then((d) => setOrders(toArr<AdminTransaction>(d, 'transactions'))).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/user-statuses').then((d) => setUsers(toArr<UserStatus>(d, 'statuses'))).catch(() => setUsers([]))
    api.get<unknown>('/auth/admin/all-users').then((d) => setPeople(toArr<User>(d, 'users'))).catch((x) => setE(msg(x)))
  }, [])
  return { f, logs, orders, users, people, e }
}

type Txn = { kind: string; name: string; email: string; amount: number; at: string }

function largeTxns(f: FundsOverview, t: number): Txn[] {
  const all: Txn[] = [
    ...f.deposits.map((x) => ({ kind: 'Deposit', name: x.user_name, email: x.user_email, amount: Math.abs(x.amount), at: x.created_at })),
    ...f.withdrawals.map((x) => ({ kind: 'Withdrawal', name: x.user_name, email: x.user_email, amount: Math.abs(x.amount), at: x.created_at })),
  ]
  return all.filter((x) => x.amount >= t).sort((a, b) => b.amount - a.amount)
}

function flowUsers(f: FundsOverview) {
  const m = new Map<string, { name: string; email: string; dep: number; wd: number }>()
  const get = (id: string, name: string, email: string) => {
    let v = m.get(id)
    if (!v) {
      v = { name, email, dep: 0, wd: 0 }
      m.set(id, v)
    }
    return v
  }
  f.deposits.forEach((x) => { get(x.user_id, x.user_name, x.user_email).dep += Math.abs(x.amount) })
  f.withdrawals.forEach((x) => { get(x.user_id, x.user_name, x.user_email).wd += Math.abs(x.amount) })
  return [...m.values()].filter((v) => v.dep > 0 && v.wd >= 0.8 * v.dep).sort((a, b) => b.wd - a.wd)
}

// ignoreIp and isLoginLog come from ../lib/loginLog

function failedByIp(logs: AuditLog[]) {
  const m = new Map<string, number>()
  logs.filter((l) => isLoginLog(l) && l.result === 'FAILURE').forEach((l) => {
    const ip = l.ip_address || 'unknown'
    m.set(ip, (m.get(ip) ?? 0) + 1)
  })
  return [...m.entries()].filter(([ip, n]) => n >= 5 && !ignoreIp(ip)).sort((a, b) => b[1] - a[1])
}

export function ComplianceDashboard() {
  const { f, logs, users, people, e } = useData()
  const show = (n: number | null) => (n === null ? '-' : String(n))
  const fails = logs ? logs.filter((l) => isLoginLog(l) && l.result === 'FAILURE').length : null
  const big = f ? largeTxns(f, 1000000).length : null
  const heavy = f ? flowUsers(f).length : null
  const stMap = new Map((users ?? []).map((s) => [String(s.id), s] as const))
  const kyc = people && users ? people.filter((u) => kycOf(u, stMap.get(String(u.id))) === 'pending').length : null
  const blocked = users ? users.filter((u) => u.is_blocked).length : null
  return (
    <Page title="Compliance Dashboard" subtitle="Compliance indicators from live data" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="KYC pending" value={show(kyc)} tone="amber" />
        <StatCard label="Blocked users" value={show(blocked)} />
        <StatCard label="Large transactions (1,000,000 or more)" value={show(big)} tone="amber" />
        <StatCard label="Withdrew 80% or more of deposits" value={show(heavy)} tone="amber" />
        <StatCard label="Failed logins (latest 300 audit rows)" value={show(fails)} tone="red" />
        <StatCard label="Audit entries loaded" value={logs ? String(logs.length) : '-'} />
      </div>
      <Note t="These are review indicators. Open AML, Transaction Monitoring, Compliance Cases and Audit from the sidebar for the details." />
    </Page>
  )
}

export function RegulatoryReports() {
  const { f, logs, orders, e } = useData()
  const ready = f !== null && logs !== null && orders !== null
  return (
    <Page title="Regulatory Reports" subtitle="Download CSV extracts of the data the backend provides" e={e}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-md p-4 space-y-2">
          <H t="Orders and trades" />
          <button className={btnCls} disabled={!orders} onClick={() => orders && downloadCsv('orders.csv', ['time', 'user', 'email', 'symbol', 'side', 'quantity', 'price', 'charges'], orders.map((o) => [o.created_at, o.user_name, o.user_email, o.symbol, o.buy_sell, o.quantity, o.price, o.charges]))}>Download CSV</button>
        </div>
        <div className="bg-surface border border-border rounded-md p-4 space-y-2">
          <H t="Deposits and withdrawals" />
          <button className={btnCls} disabled={!f} onClick={() => f && downloadCsv('funds.csv', ['time', 'type', 'user', 'email', 'amount', 'description'], [...f.deposits.map((x) => [x.created_at, 'Deposit', x.user_name, x.user_email, x.amount, x.description]), ...f.withdrawals.map((x) => [x.created_at, 'Withdrawal', x.user_name, x.user_email, x.amount, x.description])])}>Download CSV</button>
        </div>
        <div className="bg-surface border border-border rounded-md p-4 space-y-2">
          <H t="Large transactions (1,000,000 or more)" />
          <button className={btnCls} disabled={!f} onClick={() => f && downloadCsv('large-transactions.csv', ['time', 'type', 'user', 'email', 'amount'], largeTxns(f, 1000000).map((x) => [x.at, x.kind, x.name, x.email, x.amount]))}>Download CSV</button>
        </div>
        <div className="bg-surface border border-border rounded-md p-4 space-y-2">
          <H t="Audit log (latest 300)" />
          <button className={btnCls} disabled={!logs} onClick={() => logs && downloadCsv('audit-log.csv', ['time', 'action', 'resource_type', 'resource_id', 'user_id', 'ip_address', 'result'], logs.map((l) => [l.created_at, l.action, l.resource_type ?? '', l.resource_id ?? '', l.user_id ?? '', l.ip_address ?? '', l.result]))}>Download CSV</button>
        </div>
      </div>
      <Note t={ready ? 'These are plain CSV extracts. Official formats (STR, CTR and similar) and scheduled filing are not built because the backend has no such data.' : 'Loading data...'} />
    </Page>
  )
}

export function MonitoringPage() {
  const { f, orders, e } = useData()
  const [kind, setKind] = useState('All')
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    if (!f || !orders) return null
    const all = [
      ...orders.map((o) => ({ kind: 'Order', name: o.user_name, email: o.user_email, detail: `${o.buy_sell} ${o.symbol} x ${o.quantity}`, amount: o.quantity * o.price, at: o.created_at })),
      ...f.deposits.map((x) => ({ kind: 'Deposit', name: x.user_name, email: x.user_email, detail: x.description, amount: Math.abs(x.amount), at: x.created_at })),
      ...f.withdrawals.map((x) => ({ kind: 'Withdrawal', name: x.user_name, email: x.user_email, detail: x.description, amount: Math.abs(x.amount), at: x.created_at })),
    ]
    const s = q.trim().toLowerCase()
    return all
      .filter((x) => (kind === 'All' || x.kind === kind) && (!s || String(x.name ?? '').toLowerCase().includes(s) || String(x.email ?? '').toLowerCase().includes(s)))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 200)
      .map((x) => [new Date(x.at).toLocaleString(), x.kind, `${x.name} (${x.email})`, x.detail, inr(x.amount)])
  }, [f, orders, kind, q])
  return (
    <Page title="Transaction Monitoring" subtitle="Orders, deposits and withdrawals in one feed (latest 200 matches)" e={e}>
      <div className="flex flex-wrap gap-3">
        <select value={kind} onChange={(ev) => setKind(ev.target.value)} className={inputCls}>
          <option>All</option>
          <option>Order</option>
          <option>Deposit</option>
          <option>Withdrawal</option>
        </select>
        <input type="text" placeholder="Filter by user..." value={q} onChange={(ev) => setQ(ev.target.value)} className={inputCls} />
      </div>
      <Table cols={[{ h: 'Time' }, { h: 'Type' }, { h: 'User' }, { h: 'Detail' }, { h: 'Amount', right: true }]} rows={rows} empty="No transactions." />
    </Page>
  )
}

export function CasesPage() {
  const { f, logs, e } = useData()
  const rows: string[][] | null = f && logs ? [
    ...failedByIp(logs).map(([ip, n]) => ['Fraud', `IP ${ip}`, `${n} failed logins`]),
    ...largeTxns(f, 1000000).map((x) => ['AML', `${x.name} (${x.email})`, `${x.kind} of ${inr(x.amount)}`]),
    ...flowUsers(f).map((v) => ['AML', `${v.name} (${v.email})`, `Withdrew ${inr(v.wd)} against ${inr(v.dep)} deposited`]),
  ].map((r) => [...r, 'Needs review']) : null
  return (
    <Page title="Compliance Cases" subtitle="Review queue built from fraud and AML flags" e={e}>
      <Table cols={[{ h: 'Source' }, { h: 'Subject' }, { h: 'Reason' }, { h: 'Status' }]} rows={rows} empty="Nothing needs review." />
      <Note t="This is a read-only queue. Creating cases, assigning, notes and closing need a cases table in the backend, which does not exist yet. Internal and private IPs are ignored in the fraud rule." />
    </Page>
  )
}

export function AuditPage() {
  const { logs, e } = useData()
  const [action, setAction] = useState('All')
  const [result, setResult] = useState('All')
  const [q, setQ] = useState('')
  const actions = useMemo(() => (logs ? ['All', ...Array.from(new Set(logs.map((l) => l.action)))] : ['All']), [logs])
  const rows = logs
    ? logs
        .filter((l) => (action === 'All' || l.action === action) && (result === 'All' || l.result === result) && (!q.trim() || JSON.stringify(l).toLowerCase().includes(q.trim().toLowerCase())))
        .map((l) => [new Date(l.created_at).toLocaleString(), l.action, `${l.resource_type ?? ''} ${l.resource_id ?? ''}`.trim(), l.user_id ?? '', l.ip_address ?? '', l.result])
    : null
  return (
    <Page title="Audit" subtitle="Latest 300 audit log entries" e={e}>
      <div className="flex flex-wrap gap-3">
        <select value={action} onChange={(ev) => setAction(ev.target.value)} className={inputCls}>
          {actions.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={result} onChange={(ev) => setResult(ev.target.value)} className={inputCls}>
          <option>All</option>
          <option>SUCCESS</option>
          <option>FAILURE</option>
        </select>
        <input type="text" placeholder="Search..." value={q} onChange={(ev) => setQ(ev.target.value)} className={inputCls} />
      </div>
      <Table cols={[{ h: 'Time' }, { h: 'Action' }, { h: 'Resource' }, { h: 'User ID' }, { h: 'IP' }, { h: 'Result' }]} rows={rows} empty="No audit entries match." />
    </Page>
  )
}