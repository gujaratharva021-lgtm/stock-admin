import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

interface Item {
  key: string
  label: string
  category: string
  configured: boolean
  status: string
  detail: string
  lastAt?: string
  lastError?: string
}

interface Data {
  integrations: Item[]
  payments: Record<string, number>
  withdrawals: Record<string, number>
  webhookUrl: string
  api: {
    baseUrl: string
    environment: string
    rateLimitPerMinute: number
    corsOrigins: string
    trustedProxies: string
    adminTwoFactor: boolean
    demoSeed: boolean
  }
}

const statusLabel: Record<string, string> = {
  HEALTHY: 'Healthy',
  DEGRADED: 'Failing',
  UNKNOWN: 'No calls yet',
  CONFIGURED: 'Configured',
  NOT_CONFIGURED: 'Not configured',
}

const statusTone = (s: string) =>
  s === 'HEALTHY' ? 'bg-brand-tint text-brand-dark' : s === 'DEGRADED' ? 'bg-red-tint text-red' : s === 'NOT_CONFIGURED' ? 'bg-amber-tint text-amber' : 'bg-bg text-muted'

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '-')
const th = 'px-4 py-2.5 font-medium'

function useData() {
  const [d, setD] = useState<Data | null>(null)
  const [e, setE] = useState<string | null>(null)
  useEffect(() => {
    api.get<Data>('/admin/integrations').then(setD).catch((x) => setE(x instanceof Error ? x.message : 'Failed to load'))
  }, [])
  return { d, e }
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

function Items({ items }: { items: Item[] | null }) {
  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className={th}>Service</th>
            <th className={th}>Status</th>
            <th className={th}>Details</th>
            <th className={th}>Last success</th>
            <th className={th}>Last error</th>
          </tr>
        </thead>
        <tbody>
          {items === null && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>}
          {items?.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted text-xs">Nothing here.</td></tr>}
          {items?.map((i) => (
            <tr key={i.key} className="border-b border-border last:border-0 hover:bg-bg align-top">
              <td className="px-4 py-2.5 text-ink font-medium">{i.label}</td>
              <td className="px-4 py-2.5"><span className={`text-xs px-1.5 py-0.5 rounded ${statusTone(i.status)}`}>{statusLabel[i.status] ?? i.status}</span></td>
              <td className="px-4 py-2.5 text-muted text-xs">{i.detail}</td>
              <td className="px-4 py-2.5 text-muted text-xs">{fmt(i.lastAt)}</td>
              <td className="px-4 py-2.5 text-red text-xs">{i.lastError ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Counts({ title, data }: { title: string; data: Record<string, number> | undefined }) {
  const entries = Object.entries(data ?? {})
  return (
    <div>
      <h2 className="text-sm font-medium text-ink mb-2">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {entries.length === 0 && <div className="text-sm text-muted">No records yet.</div>}
        {entries.map(([k, v]) => <StatCard key={k} label={k} value={v} />)}
      </div>
    </div>
  )
}

const by = (d: Data | null, cat: string) => (d ? d.integrations.filter((i) => i.category === cat) : null)

export function ExchangeIntegration() {
  const { d, e } = useData()
  return (
    <Page title="Exchange" subtitle="Exchange connectivity" e={e}>
      <Items items={by(d, 'exchange')} />
      <Note t="The app simulates trading. There is no order routing to NSE or BSE, no exchange session or order acknowledgement tracking." />
    </Page>
  )
}

export function MarketDataIntegration() {
  const { d, e } = useData()
  return (
    <Page title="Market Data" subtitle="Quote, fundamentals and news providers" e={e}>
      <Items items={by(d, 'marketdata')} />
      <Note t="Only Upstox and Yahoo Finance report live success or failure. Other providers show only whether a key is set, because the backend does not track their calls yet." />
    </Page>
  )
}

export function PaymentIntegration() {
  const { d, e } = useData()
  return (
    <Page title="Payment Gateway" subtitle="Razorpay status and payment orders" e={e}>
      <Items items={by(d, 'payment')} />
      <Counts title="Payment orders by status" data={d?.payments} />
      <Note t="A test mode key means no real money moves. Switch to live keys on the server only after your business account is approved by Razorpay." />
    </Page>
  )
}

export function BankIntegration() {
  const { d, e } = useData()
  return (
    <Page title="Bank" subtitle="Bank connectivity and payouts" e={e}>
      <Items items={by(d, 'bank')} />
      <Counts title="Withdrawal requests by status" data={d?.withdrawals} />
      <Note t="Payouts are manual: an admin approves a request and money has to be sent from outside this system. Automatic payouts, bank statement import and penny drop verification are not built." />
    </Page>
  )
}

export function KycIntegration() {
  const { d, e } = useData()
  return (
    <Page title="KYC Provider" subtitle="Identity verification provider" e={e}>
      <Note t="No KYC provider is integrated in the backend, so there is nothing to list or monitor here." />
      <Note t="KYC in the app is currently checked locally (PAN format, simulated Aadhaar OTP) and approved manually under KYC. A live provider also needs a registered business with business PAN and bank account." />
    </Page>
  )
}

export function CommsIntegration() {
  const { d, e } = useData()
  return (
    <Page title="SMS / Email" subtitle="Messaging providers" e={e}>
      <Items items={by(d, 'comms')} />
      <Note t="Email delivery success is not tracked by the backend, so the status shows only whether a key is set." />
    </Page>
  )
}

export function ApiIntegration() {
  const { d, e } = useData()
  const a = d?.api
  const rows: [string, string][] = a
    ? [
        ['Base URL', a.baseUrl],
        ['Environment', a.environment],
        ['Rate limit', `${a.rateLimitPerMinute} requests per minute per IP`],
        ['CORS allowed origins', a.corsOrigins || 'None set (same-origin only)'],
        ['Trusted proxies', a.trustedProxies || 'None set'],
        ['Admin two-factor', a.adminTwoFactor ? 'Enforced' : 'OFF (ADMIN_2FA=off)'],
        ['Demo data on signup', a.demoSeed ? 'ON (new accounts get fake portfolio and wallet)' : 'Off'],
      ]
    : []
  return (
    <Page title="API" subtitle="Backend API settings read from the server" e={e}>
      <div className="bg-surface border border-border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {a === undefined && <tr><td className="px-4 py-6 text-center text-muted text-xs">Loading...</td></tr>}
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 text-muted text-xs w-56">{k}</td>
                <td className="px-4 py-2.5 text-ink">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note t="Read-only view. API keys for third parties, per-key usage and request logs are not built. Change these values in the Render environment." />
    </Page>
  )
}

export function WebhooksIntegration() {
  const { d, e } = useData()
  return (
    <Page title="Webhooks" subtitle="Incoming webhooks" e={e}>
      <Items items={by(d, 'webhooks')} />
      <div className="bg-surface border border-border rounded-md px-6 py-4 text-sm space-y-1">
        <div className="text-xs text-muted">Razorpay webhook URL (paste in Razorpay dashboard, Settings, Webhooks)</div>
        <div className="select-all font-mono text-ink">{d ? d.webhookUrl : '-'}</div>
      </div>
      <Note t="Every webhook is verified by its signature before use. Delivery logs and replay are not built. A job also checks stuck payment orders every 15 minutes, so a missed webhook is recovered." />
    </Page>
  )
}