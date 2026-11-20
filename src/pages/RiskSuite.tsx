import { ignoreIp, isLoginLog } from '../lib/loginLog'
import { withKeys } from '../lib/rowKeys'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type RiskOverview, type PortfolioOverview, type FundsOverview, type AuditLog, type AdminTransaction } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const inr = (n: number) => `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
const th = 'px-4 py-2.5 font-medium'
const thr = 'px-4 py-2.5 font-medium text-right'
const td = 'px-4 py-2.5 text-ink'
const tdr = 'px-4 py-2.5 text-right tabular text-ink'
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

function useAll() {
  const [r, setR] = useState<RiskOverview | null>(null)
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [f, setF] = useState<FundsOverview | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<RiskOverview>('/admin/risk-overview').then(setR).catch((x) => setE(msg(x)))
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
    api.get<{ logs: AuditLog[] }>('/admin/audit-logs').then((d) => setLogs(d.logs ?? [])).catch((x) => setE(msg(x)))
    api.get<FundsOverview>('/admin/funds-overview').then(setF).catch((x) => setE(msg(x)))
  }, [])
  return { r, p, logs, f, e }
}

type UE = { name: string; email: string; fut: number; opt: number; mtfB: number; mtfM: number; total: number }

function exposureByUser(p: PortfolioOverview | null): UE[] | null {
  if (!p) return null
  const m = new Map<string, UE>()
  const get = (x: { user_id: string; user_name: string; user_email: string }) => {
    let v = m.get(x.user_id)
    if (!v) {
      v = { name: x.user_name, email: x.user_email, fut: 0, opt: 0, mtfB: 0, mtfM: 0, total: 0 }
      m.set(x.user_id, v)
    }
    return v
  }
  p.futures.filter((x) => x.status === 'OPEN').forEach((x) => { get(x).fut += x.margin_used })
  p.options.filter((x) => x.status === 'OPEN').forEach((x) => { get(x).opt += x.premium * x.lot_size })
  p.mtf.filter((x) => x.status === 'OPEN').forEach((x) => {
    const v = get(x)
    v.mtfB += x.borrowed_amount
    v.mtfM += x.margin_paid
  })
  const a = [...m.values()]
  a.forEach((v) => { v.total = v.fut + v.opt + v.mtfB })
  return a.sort((x, y) => y.total - x.total)
}

type FraudRow = { ip: string; fails: number; emails: number; ok: number; users: number }

function fraudRows(logs: AuditLog[]): FraudRow[] {
  const m = new Map<string, { fails: number; emails: Set<string>; ok: number; users: Set<string> }>()
  logs.filter((l) => isLoginLog(l) && !ignoreIp(l.ip_address)).forEach((l) => {
    const ip = l.ip_address || 'unknown'
    let x = m.get(ip)
    if (!x) {
      x = { fails: 0, emails: new Set(), ok: 0, users: new Set() }
      m.set(ip, x)
    }
    if (l.result === 'FAILURE') {
      x.fails++
      x.emails.add(l.resource_id || '')
    } else {
      x.ok++
      x.users.add(l.user_id || '')
    }
  })
  return [...m.entries()]
    .map(([ip, x]) => ({ ip, fails: x.fails, emails: x.emails.size, ok: x.ok, users: x.users.size }))
    .sort((a, b) => b.fails - a.fails || b.users - a.users)
}

const suspicious = (r: FraudRow) => r.fails >= 5 || r.users >= 3

type Txn = { kind: string; name: string; email: string; amount: number; at: string }

function amlLarge(f: FundsOverview, t: number): Txn[] {
  const all: Txn[] = [
    ...f.deposits.map((x) => ({ kind: 'Deposit', name: x.user_name, email: x.user_email, amount: Math.abs(x.amount), at: x.created_at })),
    ...f.withdrawals.map((x) => ({ kind: 'Withdrawal', name: x.user_name, email: x.user_email, amount: Math.abs(x.amount), at: x.created_at })),
  ]
  return all.filter((x) => x.amount >= t).sort((a, b) => b.amount - a.amount)
}

function amlFlow(f: FundsOverview) {
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

type Alert = { sev: string; src: string; msg: string }

function buildAlerts(ue: UE[], logs: AuditLog[], f: FundsOverview): Alert[] {
  const out: Alert[] = []
  const sum = ue.reduce((s, v) => s + v.total, 0)
  if (ue.length > 1 && sum > 0) {
    ue.forEach((v) => {
      const share = v.total / sum
      if (share >= 0.3) out.push({ sev: 'High', src: 'Exposure', msg: `${v.name} holds ${(share * 100).toFixed(0)}% of total exposure (${inr(v.total)})` })
    })
  }
  ue.forEach((v) => {
    if (v.mtfM > 0 && v.mtfB / v.mtfM >= 4) out.push({ sev: 'Medium', src: 'Margin', msg: `${v.name} MTF borrowed is ${(v.mtfB / v.mtfM).toFixed(1)}x margin paid` })
  })
  fraudRows(logs).filter(suspicious).forEach((x) => {
    out.push({ sev: x.fails >= 5 ? 'High' : 'Medium', src: 'Fraud', msg: `IP ${x.ip}: ${x.fails} failed logins, ${x.users} accounts logged in` })
  })
  const big = amlLarge(f, 1000000)
  if (big.length > 0) out.push({ sev: 'Medium', src: 'AML', msg: `${big.length} deposits/withdrawals of ${inr(1000000)} or more` })
  amlFlow(f).forEach((v) => out.push({ sev: 'Medium', src: 'AML', msg: `${v.name} withdrew ${inr(v.wd)} against ${inr(v.dep)} deposited` }))
  return out
}

export function RiskDashboard() {
  const { r, p, logs, f, e } = useAll()
  const ue = exposureByUser(p)
  const alerts = ue && logs && f ? buildAlerts(ue, logs, f) : null
  return (
    <Page title="Risk Dashboard" subtitle="Platform risk at a glance, built from live data" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total exposure" value={r ? inr(r.totalExposure) : '-'} tone="red" />
        <StatCard label="Margin in use" value={r ? inr(r.futuresMarginUsed + r.mtfMarginPaid) : '-'} tone="amber" />
        <StatCard label="Open positions" value={p ? String(p.summary.openFutures + p.summary.openOptions + p.summary.openMtf) : '-'} />
        <StatCard label="Active alerts" value={alerts ? String(alerts.length) : '-'} tone={alerts && alerts.length > 0 ? 'red' : undefined} />
      </div>
      <div>
        <H t="Top 5 exposures" />
        <Table
          cols={[{ h: 'User' }, { h: 'Total exposure', right: true }, { h: 'Share', right: true }]}
          rows={ue ? ue.slice(0, 5).map((v) => { const s = ue.reduce((a, b) => a + b.total, 0); return [`${v.name} (${v.email})`, inr(v.total), s > 0 ? `${((v.total / s) * 100).toFixed(1)}%` : '-'] }) : null}
          empty="No open leveraged positions."
        />
      </div>
    </Page>
  )
}

export function MarginPage() {
  const { r, p, e } = useAll()
  const ue = exposureByUser(p)
  return (
    <Page title="Margin" subtitle="Margin used by futures and borrowed against MTF, per user" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Futures margin used" value={r ? inr(r.futuresMarginUsed) : '-'} tone="amber" />
        <StatCard label="MTF margin paid" value={r ? inr(r.mtfMarginPaid) : '-'} />
        <StatCard label="MTF borrowed" value={r ? inr(r.mtfExposure) : '-'} tone="amber" />
      </div>
      <Table
        cols={[{ h: 'User' }, { h: 'Futures margin', right: true }, { h: 'MTF margin paid', right: true }, { h: 'MTF borrowed', right: true }, { h: 'Margin used (excl. borrowed)', right: true }]}
        rows={ue ? ue.map((v) => [`${v.name} (${v.email})`, inr(v.fut), inr(v.mtfM), inr(v.mtfB), inr(v.fut + v.mtfM)]) : null}
        empty="No open margin positions."
      />
      <Note t="Margin utilization %, margin calls and maintenance margin are not tracked by the backend yet, so they are not shown." />
    </Page>
  )
}

export function ExposurePage() {
  const { r, p, e } = useAll()
  const ue = exposureByUser(p)
  const sum = ue ? ue.reduce((s, v) => s + v.total, 0) : 0
  return (
    <Page title="Exposure" subtitle="Open leveraged exposure per user (futures margin + options premium + MTF borrowed)" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total exposure" value={r ? inr(r.totalExposure) : '-'} tone="red" />
        <StatCard label="Futures margin" value={r ? inr(r.futuresMarginUsed) : '-'} tone="amber" />
        <StatCard label="Options premium at risk" value={r ? inr(r.optionsPremiumAtRisk) : '-'} tone="amber" />
        <StatCard label="MTF borrowed" value={r ? inr(r.mtfExposure) : '-'} tone="amber" />
      </div>
      <Table
        cols={[{ h: 'User' }, { h: 'Futures', right: true }, { h: 'Options', right: true }, { h: 'MTF', right: true }, { h: 'Total', right: true }, { h: 'Share', right: true }]}
        rows={ue ? ue.map((v) => [`${v.name} (${v.email})`, inr(v.fut), inr(v.opt), inr(v.mtfB), inr(v.total), sum > 0 ? `${((v.total / sum) * 100).toFixed(1)}%` : '-']) : null}
        empty="No open leveraged positions."
      />
    </Page>
  )
}

export function LimitsPage() {
  const { p, e } = useAll()
  const ue = exposureByUser(p)
  return (
    <Page title="Trading Limits" subtitle="Current usage per user. Limit values are not configurable yet" e={e}>
      <Note t="The backend has no limits table, so per-user limits cannot be set or enforced from here yet. Below is the current usage a limit would apply to." />
      <Table
        cols={[{ h: 'User' }, { h: 'Current exposure', right: true }, { h: 'Futures margin', right: true }, { h: 'MTF borrowed', right: true }, { h: 'Limit' }]}
        rows={ue ? ue.map((v) => [`${v.name} (${v.email})`, inr(v.total), inr(v.fut), inr(v.mtfB), 'Not configured']) : null}
        empty="No open leveraged positions."
      />
    </Page>
  )
}

export function FraudPage() {
  const { logs, e } = useAll()
  const rows = logs ? fraudRows(logs) : null
  return (
    <Page title="Fraud Monitoring" subtitle="Login activity grouped by IP, from the latest 300 audit log entries" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="IPs seen" value={rows ? String(rows.length) : '-'} />
        <StatCard label="Suspicious IPs" value={rows ? String(rows.filter(suspicious).length) : '-'} tone={rows && rows.some(suspicious) ? 'red' : undefined} />
        <StatCard label="Failed logins" value={rows ? String(rows.reduce((s, x) => s + x.fails, 0)) : '-'} tone="amber" />
      </div>
      <Table
        cols={[{ h: 'IP' }, { h: 'Failed logins', right: true }, { h: 'Emails targeted', right: true }, { h: 'Successful logins', right: true }, { h: 'Accounts used', right: true }, { h: 'Flag' }]}
        rows={rows ? rows.map((x) => [x.ip, String(x.fails), String(x.emails), String(x.ok), String(x.users), suspicious(x) ? 'Review' : '']) : null}
        empty="No login activity."
      />
      <Note t="Flag rule: 5 or more failed logins from one IP, or 3 or more different accounts logging in from one IP." />
    </Page>
  )
}

export function AmlPage() {
  const { f, e } = useAll()
  const [t, setT] = useState(1000000)
  const big = f ? amlLarge(f, t) : null
  const flow = f ? amlFlow(f) : null
  return (
    <Page title="AML Monitoring" subtitle="Large transactions and deposit-then-withdraw patterns" e={e}>
      <div className="flex items-center gap-3 text-sm text-muted">
        Large transaction threshold (INR)
        <input type="number" value={t} onChange={(ev) => setT(Number(ev.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <H t="Large deposits and withdrawals" />
        <Table
          cols={[{ h: 'Type' }, { h: 'User' }, { h: 'Amount', right: true }, { h: 'Date' }]}
          rows={big ? big.map((x) => [x.kind, `${x.name} (${x.email})`, inr(x.amount), new Date(x.at).toLocaleString()]) : null}
          empty="No transactions above the threshold."
        />
      </div>
      <div>
        <H t="Withdrew 80% or more of what was deposited" />
        <Table
          cols={[{ h: 'User' }, { h: 'Deposited', right: true }, { h: 'Withdrawn', right: true }]}
          rows={flow ? flow.map((v) => [`${v.name} (${v.email})`, inr(v.dep), inr(v.wd)]) : null}
          empty="No such users in the loaded data."
        />
      </div>
      <Note t="Based on the funds data the backend returns. These are review flags, not confirmed cases." />
    </Page>
  )
}

export function SurveillancePage() {
  const [orders, setOrders] = useState<AdminTransaction[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  const [t, setT] = useState(500000)
  useEffect(() => {
    api.get<unknown>('/portfolio/admin/all-transactions?limit=20000')
      .then((d) => {
        if (Array.isArray(d)) return setOrders(d as AdminTransaction[])
        const o = d as Record<string, unknown>
        const a = o.orders ?? o.transactions ?? o.trades
        setOrders(Array.isArray(a) ? (a as AdminTransaction[]) : [])
      })
      .catch((x) => setE(msg(x)))
  }, [])
  const big = orders ? orders.filter((o) => o.quantity * o.price >= t).sort((a, b) => b.quantity * b.price - a.quantity * a.price) : null
  const trips: string[][] | null = (() => {
    if (!orders) return null
    const m = new Map<string, AdminTransaction[]>()
    orders.forEach((o) => {
      const k = `${o.user_id}|${o.symbol}`
      m.set(k, [...(m.get(k) ?? []), o])
    })
    const out: string[][] = []
    m.forEach((list) => {
      const s = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      for (let i = 1; i < s.length; i++) {
        const gap = (new Date(s[i].created_at).getTime() - new Date(s[i - 1].created_at).getTime()) / 60000
        if (s[i].buy_sell !== s[i - 1].buy_sell && gap <= 10) {
          out.push([`${s[i].user_name} (${s[i].user_email})`, s[i].symbol, `${s[i - 1].buy_sell} then ${s[i].buy_sell}`, `${gap.toFixed(1)} min`, new Date(s[i].created_at).toLocaleString()])
        }
      }
    })
    return out
  })()
  return (
    <Page title="Trade Surveillance" subtitle="Unusual trading patterns in the loaded orders" e={e}>
      <div className="flex items-center gap-3 text-sm text-muted">
        Large order threshold (INR value)
        <input type="number" value={t} onChange={(ev) => setT(Number(ev.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <H t="Large orders" />
        <Table
          cols={[{ h: 'User' }, { h: 'Symbol' }, { h: 'Side' }, { h: 'Quantity', right: true }, { h: 'Value', right: true }, { h: 'Time' }]}
          rows={big ? big.map((o) => [`${o.user_name} (${o.user_email})`, o.symbol, o.buy_sell, String(o.quantity), inr(o.quantity * o.price), new Date(o.created_at).toLocaleString()]) : null}
          empty="No orders above the threshold."
        />
      </div>
      <div>
        <H t="Buy and sell of the same symbol within 10 minutes" />
        <Table
          cols={[{ h: 'User' }, { h: 'Symbol' }, { h: 'Pattern' }, { h: 'Gap', right: true }, { h: 'Time' }]}
          rows={trips}
          empty="No quick round trips found."
        />
      </div>
      <Note t="Review flags only. A quick buy and sell can be normal trading." />
    </Page>
  )
}

export function AlertsPage() {
  const { p, logs, f, e } = useAll()
  const ue = exposureByUser(p)
  const alerts = ue && logs && f ? buildAlerts(ue, logs, f) : null
  return (
    <Page title="Risk Alerts" subtitle="Alerts computed live from exposure, margin, login and funds data" e={e}>
      <Table
        cols={[{ h: 'Severity' }, { h: 'Area' }, { h: 'Alert' }]}
        rows={alerts ? alerts.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === 'High' ? -1 : 1)).map((a) => [a.sev, a.src, a.msg]) : null}
        empty="No active alerts."
      />
      <Note t="Alerts are calculated on page load. Alert history, acknowledging and notifications need backend tables that do not exist yet." />
    </Page>
  )
}