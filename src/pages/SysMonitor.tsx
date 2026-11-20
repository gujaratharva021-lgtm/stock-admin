import { istToday, istDay } from '../lib/ist'
import { withKeys } from '../lib/rowKeys'
import { toArr } from '../lib/arr'
import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, type AuditLog, type PortfolioOverview, type ReconciliationDetails } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const msg = (x: unknown) => (x instanceof Error ? x.message : 'Failed to load')
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

type Probe = { name: string; path: string; db: boolean; ok: boolean; ms: number; err: string }

const TARGETS: { name: string; path: string; db: boolean; api: boolean }[] = [
  { name: 'Admin UI (static)', path: '/admin/', db: false, api: false },
  { name: 'Users', path: '/auth/admin/all-users', db: true, api: true },
  { name: 'Orders', path: '/portfolio/admin/all-transactions?limit=1', db: true, api: true },
  { name: 'Funds overview', path: '/admin/funds-overview', db: true, api: true },
  { name: 'Portfolio overview', path: '/admin/portfolio-overview', db: true, api: true },
  { name: 'Pending orders', path: '/admin/pending-orders', db: true, api: true },
  { name: 'Halted instruments', path: '/admin/halted-instruments', db: true, api: true },
  { name: 'Audit logs', path: '/admin/audit-logs', db: true, api: true },
]

async function probeOne(t: (typeof TARGETS)[number]): Promise<Probe> {
  const t0 = performance.now()
  try {
    if (t.api) {
      await api.get<unknown>(t.path)
    } else {
      const r = await fetch(t.path, { cache: 'no-store' })
      if (!r.ok) throw new Error('HTTP ' + r.status)
    }
    return { name: t.name, path: t.path, db: t.db, ok: true, ms: Math.round(performance.now() - t0), err: '' }
  } catch (x) {
    return { name: t.name, path: t.path, db: t.db, ok: false, ms: Math.round(performance.now() - t0), err: msg(x) }
  }
}

function useProbes() {
  const [rows, setRows] = useState<Probe[] | null>(null)
  const [busy, setBusy] = useState(true)
  const [at, setAt] = useState('')
  const run = useCallback(async () => {
    setBusy(true)
    const res = await Promise.all(TARGETS.map(probeOne))
    setRows(res)
    setAt(new Date().toLocaleTimeString())
    setBusy(false)
  }, [])
  useEffect(() => {
    let cancelled = false
    Promise.all(TARGETS.map(probeOne)).then((res) => {
      if (cancelled) return
      setRows(res)
      setAt(new Date().toLocaleTimeString())
      setBusy(false)
    })
    return () => { cancelled = true }
  }, [])
  return { rows, busy, at, run }
}

const st = (p: Probe) => (!p.ok ? 'Down' : p.ms >= 1500 ? 'Slow' : 'OK')

function ProbeTable({ rows }: { rows: Probe[] | null }) {
  return (
    <Table
      cols={['Check', 'Path', 'Status', 'Response', 'Error']}
      rows={rows ? rows.map((p) => [p.name, p.path, <span key={p.path} className={st(p) === 'OK' ? 'text-ink' : 'text-red'}>{st(p)}</span>, `${p.ms} ms`, p.err || '-']) : null}
      empty="No checks."
    />
  )
}

export function SmApiPage() {
  const { rows, busy, at, run } = useProbes()
  const down = rows ? rows.filter((p) => !p.ok).length : null
  const slow = rows ? rows.filter((p) => p.ok && p.ms >= 1500).length : null
  const avg = rows && rows.length > 0 ? Math.round(rows.reduce((s, p) => s + p.ms, 0) / rows.length) : null
  return (
    <Page title="API Health" subtitle="Live check of the admin API from this browser" e={null}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Checks failing" value={down === null ? '-' : String(down)} tone={down ? 'red' : 'brand'} />
        <StatCard label="Slow (1.5 s or more)" value={slow === null ? '-' : String(slow)} tone={slow ? 'amber' : 'default'} />
        <StatCard label="Average response" value={avg === null ? '-' : `${avg} ms`} />
        <StatCard label="Last checked" value={at || '-'} />
      </div>
      <div className="flex items-center gap-3">
        <button className={btnCls} disabled={busy} onClick={run}>{busy ? 'Checking...' : 'Re-check'}</button>
      </div>
      <ProbeTable rows={rows} />
      <Note t="Each row is a real call to an existing endpoint, timed from your browser, so it includes your network. The first call after the server has been idle can be slow. This is a point-in-time check: there is no history, uptime percentage or alerting stored anywhere." />
    </Page>
  )
}

export function SmWsPage() {
  return (
    <Page title="WebSocket Health" subtitle="Live price feed connection to clients" e={null}>
      <Note t="Not available. The backend runs a websocket hub and a price broadcaster, but exposes no connected-client count, last-broadcast time or status endpoint. To support it, a small read-only status endpoint on the hub is needed (clients connected, last broadcast time, errors). Nothing is shown rather than made-up numbers." />
    </Page>
  )
}

export function SmExchangePage() {
  return (
    <Page title="Exchange Connection" subtitle="Link to the exchange or broker" e={null}>
      <Note t="Not available. Orders are executed inside the platform by a simulated executor, so there is no exchange or broker session to monitor. Quotes come from a market data source, but the backend has no status or heartbeat for it. To support it, a real gateway and a heartbeat log have to be built." />
    </Page>
  )
}

type Po = { status: string }

export function SmJobsPage() {
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [po, setPo] = useState<Po[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<PortfolioOverview>('/admin/portfolio-overview').then(setP).catch((x) => setE(msg(x)))
    api.get<unknown>('/admin/pending-orders').then((d) => setPo(toArr<Po>(d, 'orders'))).catch((x) => setE(msg(x)))
  }, [])
  const today = istToday()
  const late = p ? p.options.filter((x) => x.status === 'OPEN' && istDay(x.expiry_date) < today).length : null
  const openMtf = p ? p.mtf.filter((x) => x.status === 'OPEN').length : null
  const pend = po ? po.filter((x) => x.status === 'PENDING').length : null
  const rows: string[][] = [
    ['Pending orders checker', 'Every 15 seconds', pend === null ? '-' : `${pend} orders waiting for trigger`],
    ['MTF checker', 'Every 1 minute', openMtf === null ? '-' : `${openMtf} open MTF positions`],
    ['F&O checker (expiry settlement)', 'Every 5 minutes', late === null ? '-' : late === 0 ? 'No option is open past expiry' : `${late} options open past expiry, job may be behind`],
    ['Alerts checker', 'Every 2 minutes', '-'],
    ['News fetcher', 'Every 30 minutes', '-'],
  ]
  return (
    <Page title="Job / Queue Monitoring" subtitle="Background jobs started by the backend" e={e}>
      <Table cols={['Job', 'Runs', 'Backlog signal']} rows={rows} empty="No jobs." />
      <Note t="The job list and intervals come from the server startup code, so they are fixed text, not live status. The signal column is the only live part and is a hint, not proof that a job ran. There is no last-run time, failure count or queue (jobs are in-process loops). To support it, each job needs to write a heartbeat row." />
    </Page>
  )
}

export function SmErrorsPage() {
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<unknown>('/admin/audit-logs').then((d) => setLogs(toArr<AuditLog>(d, 'logs'))).catch((x) => setE(msg(x)))
  }, [])
  const fails = logs ? logs.filter((l) => l.result === 'FAILURE') : null
  return (
    <Page title="Error Logs" subtitle="Audit entries that ended in failure" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Failed entries" value={fails ? String(fails.length) : '-'} tone={fails && fails.length > 0 ? 'red' : 'brand'} />
        <StatCard label="Entries loaded" value={logs ? String(logs.length) : '-'} />
      </div>
      <Table
        cols={['Time', 'Action', 'Resource', 'User ID', 'Result']}
        rows={fails ? fails.slice(0, 200).map((l) => [new Date(l.created_at).toLocaleString(), l.action, `${l.resource_type ?? ''} ${l.resource_id ?? ''}`.trim(), l.user_id ?? '', l.result]) : null}
        empty="No failed entries in the loaded rows."
      />
      <Note t="This shows failed actions recorded in the audit log, not server errors or crashes. Application error logs (panics, DB errors, stack traces) are not stored in the database. Check the Logs tab of the service on Render for those. Counts cover the latest rows the audit API returns." />
    </Page>
  )
}

export function SmAlertsPage() {
  const { rows: pr } = useProbes()
  const [p, setP] = useState<PortfolioOverview | null>(null)
  const [r, setR] = useState<ReconciliationDetails | null>(null)
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [e, setE] = useState<string | null>(null)
  const probesDone = pr !== null
  useEffect(() => {
    if (!probesDone) return
    let cancelled = false
    api.get<PortfolioOverview>('/admin/portfolio-overview').then((d) => { if (!cancelled) setP(d) }).catch((x) => { if (!cancelled) setE(msg(x)) })
    api.get<ReconciliationDetails>('/admin/reconciliation/details').then((d) => { if (!cancelled) setR(d) }).catch((x) => { if (!cancelled) setE(msg(x)) })
    api.get<unknown>('/admin/audit-logs').then((d) => { if (!cancelled) setLogs(toArr<AuditLog>(d, 'logs')) }).catch((x) => { if (!cancelled) setE(msg(x)) })
    return () => { cancelled = true }
  }, [probesDone])
  const today = istToday()
  const alerts: string[][] | null = (() => {
    if (!pr || !p || !r || !logs) return null
    const out: string[][] = []
    pr.filter((x) => !x.ok).forEach((x) => out.push(['High', 'API', `${x.name} is down: ${x.err}`]))
    pr.filter((x) => x.ok && x.ms >= 1500).forEach((x) => out.push(['Medium', 'API', `${x.name} is slow (${x.ms} ms)`]))
    const late = p.options.filter((x) => x.status === 'OPEN' && istDay(x.expiry_date) < today).length
    if (late > 0) out.push(['High', 'Jobs', `${late} options are open past expiry. Check the expiry settlement job.`])
    const uns = p.unsettled.filter((x) => istDay(x.settle_date) < today).length
    if (uns > 0) out.push(['Medium', 'Settlement', `${uns} positions are unsettled past their settle date`])
    const mm = r.users.filter((x) => x.status === 'MISMATCHED').length
    if (mm > 0) out.push(['High', 'Reconciliation', `${mm} clients have a balance mismatch`])
    if (r.failedOrders.length > 0) out.push(['Medium', 'Payments', `${r.failedOrders.length} failed payment orders`])
    const fl = logs.filter((l) => l.result === 'FAILURE').length
    if (fl > 0) out.push(['Low', 'Audit', `${fl} failed actions in the loaded audit rows`])
    return out
  })()
  return (
    <Page title="System Alerts" subtitle="Problems found right now from live data" e={e}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Active alerts" value={alerts ? String(alerts.length) : '-'} tone={alerts && alerts.length > 0 ? 'red' : 'brand'} />
        <StatCard label="High severity" value={alerts ? String(alerts.filter((a) => a[0] === 'High').length) : '-'} tone={alerts && alerts.some((a) => a[0] === 'High') ? 'red' : 'default'} />
      </div>
      <Table cols={['Severity', 'Area', 'Detail']} rows={alerts} empty="No problems found." />
      <Note t="Alerts are worked out in this page each time you open it from current data. They are not stored, not sent by email or SMS, and cannot be acknowledged or silenced. To support that, an alerts table, a checker job and a notification channel have to be built." />
    </Page>
  )
}

export function SmDbPage() {
  const { rows, busy, at, run } = useProbes()
  const dbRows = rows ? rows.filter((p) => p.db) : null
  const bad = dbRows ? dbRows.filter((p) => !p.ok).length : null
  const worst = dbRows && dbRows.length > 0 ? Math.max(...dbRows.map((p) => p.ms)) : null
  return (
    <Page title="Database Health" subtitle="Whether database-backed endpoints answer, and how fast" e={null}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="DB-backed checks failing" value={bad === null ? '-' : String(bad)} tone={bad ? 'red' : 'brand'} />
        <StatCard label="Slowest response" value={worst === null ? '-' : `${worst} ms`} tone={worst !== null && worst >= 1500 ? 'amber' : 'default'} />
        <StatCard label="Last checked" value={at || '-'} />
      </div>
      <div className="flex items-center gap-3">
        <button className={btnCls} disabled={busy} onClick={run}>{busy ? 'Checking...' : 'Re-check'}</button>
      </div>
      <ProbeTable rows={dbRows} />
      <Note t="This is an indirect check: if endpoints that read the database answer quickly, the database is reachable. Connection count, pool usage, storage size, slow queries and replication are not exposed by the backend. Check those in the Render Postgres dashboard." />
    </Page>
  )
}

export function SmDrPage() {
  return (
    <Page title="Disaster Recovery" subtitle="Backups, restore and failover" e={null}>
      <Note t="Not available. No backup, restore test or failover record exists in the app. Backups of the database depend on the Postgres plan and settings on Render, so confirm there that automatic backups are on, how long they are kept, and that a restore has been tried at least once. Nothing is shown here rather than made-up status." />
    </Page>
  )
}