import { useEffect, useState } from 'react'
import { toArr } from '../lib/arr'
import { kycOf } from '../lib/kyc'
import { api, type User, type UserStatus, type AuditLog, type ReconciliationSummary, type TradingOverview, type MoneyOverview, type SystemHealth, type RiskOverview } from '../lib/api'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

function statusTone(status: string): 'brand' | 'amber' | 'red' | 'default' {
  if (status === 'HEALTHY') return 'brand'
  if (status === 'DEGRADED') return 'amber'
  if (status === 'DOWN') return 'red'
  return 'default'
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [st, setSt] = useState<Record<string, UserStatus> | null>(null)
  const [recon, setRecon] = useState<ReconciliationSummary | null>(null)
  const [trading, setTrading] = useState<TradingOverview | null>(null)
  const [money, setMoney] = useState<MoneyOverview | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [risk, setRisk] = useState<RiskOverview | null>(null)
  const [activity, setActivity] = useState<AuditLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get<{ users: User[] }>('/auth/admin/all-users').then((r) => setUsers(r.users)),
      api
        .get<unknown>('/admin/user-statuses')
        .then((d) => setSt(Object.fromEntries(toArr<UserStatus>(d, 'statuses').map((s) => [s.id, s]))))
        .catch(() => setSt({})),
      api
        .get<ReconciliationSummary>('/admin/reconciliation/summary')
        .then(setRecon)
        .catch(() => setRecon(null)),
      api
        .get<TradingOverview>('/admin/trading-overview')
        .then(setTrading)
        .catch(() => setTrading(null)),
      api
        .get<MoneyOverview>('/admin/money-overview')
        .then(setMoney)
        .catch(() => setMoney(null)),
      api
        .get<SystemHealth>('/admin/system-health')
        .then(setHealth)
        .catch(() => setHealth(null)),
      api
        .get<RiskOverview>('/admin/risk-overview')
        .then(setRisk)
        .catch(() => setRisk(null)),
      api
        .get<{ logs: AuditLog[] }>('/admin/audit-logs')
        .then((r) => setActivity((r.logs ?? []).slice(0, 8)))
        .catch(() => setActivity([])),
    ]).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
  }, [])

  const kycPending = users && st ? users.filter((u) => kycOf(u, st[u.id]) === 'pending').length : null
  const kycDone = users && st ? users.filter((u) => kycOf(u, st[u.id]) === 'approved').length : null

  const inr = (n: number) =>
    `${(Number(n) || 0) < 0 ? '-' : ''}\u20b9${Math.abs(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

  const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '-')

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total users" value={users ? users.length : '-'} />
          <StatCard label="KYC completed" value={kycDone ?? '-'} tone="brand" />
          <StatCard label="KYC pending" value={kycPending ?? '-'} tone="amber" />
          <StatCard
            label="Reconciliation mismatches"
            value={recon ? recon.mismatched : '-'}
            tone={recon && recon.mismatched > 0 ? 'red' : 'default'}
          />
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Trading overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Orders today" value={trading ? trading.ordersToday : '-'} />
            <StatCard label="Executed orders" value={trading ? trading.executedOrders : '-'} tone="brand" />
            <StatCard
              label="Rejected orders"
              value={trading ? trading.rejectedOrders : '-'}
              tone={trading && trading.rejectedOrders > 0 ? 'red' : 'default'}
            />
            <StatCard label="Cancelled orders" value={trading ? trading.cancelledOrders : '-'} tone="amber" />
            <StatCard label="Open orders" value={trading ? trading.openOrders : '-'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <StatCard
              label="Trade volume"
              value={trading ? (Number(trading.tradeVolume) || 0).toLocaleString('en-IN') : '-'}
            />
            <StatCard
              label="Turnover"
              value={trading ? inr(trading.turnover) : '-'}
            />
            <StatCard
              label="Buy volume"
              value={trading ? (Number(trading.buyVolume) || 0).toLocaleString('en-IN') : '-'}
              tone="brand"
            />
            <StatCard
              label="Sell volume"
              value={trading ? (Number(trading.sellVolume) || 0).toLocaleString('en-IN') : '-'}
              tone="red"
            />
            <StatCard label="Active traders" value={trading ? trading.activeTraders : '-'} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Money overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total client funds"
              value={money ? inr(money.totalClientFunds) : '-'}
              tone="brand"
            />
            <StatCard
              label="Deposits completed"
              value={money ? `${inr(money.depositsCompletedAmount)} (${money.depositsCompletedCount})` : '-'}
            />
            <StatCard
              label="Withdrawals completed"
              value={money ? `${inr(money.withdrawalsCompletedAmount)} (${money.withdrawalsCompletedCount})` : '-'}
              tone="red"
            />
            <StatCard
              label="Deposits pending"
              value={money ? `${inr(money.depositsPendingAmount)} (${money.depositsPendingCount})` : '-'}
              tone="amber"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <StatCard
              label="Settlement obligations"
              value={money ? inr(money.settlementObligations) : '-'}
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">System health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Database"
              value={health ? health.database.status : '-'}
              tone={health ? statusTone(health.database.status) : 'default'}
            />
            <StatCard
              label="API"
              value={health ? health.api.status : '-'}
              tone={health ? statusTone(health.api.status) : 'default'}
            />
            <StatCard
              label="Background jobs"
              value={health ? health.backgroundJobs.reconcilePendingOrders.status : '-'}
              tone={health ? statusTone(health.backgroundJobs.reconcilePendingOrders.status) : 'default'}
            />
          </div>
          {health && (
            <div className="bg-surface border border-border rounded-md overflow-hidden mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2.5 font-medium">Quote provider</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Last successful fetch</th>
                    <th className="px-4 py-2.5 font-medium">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {health.quoteProviders.map((p) => (
                    <tr key={p.name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 text-ink">{p.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            p.status === 'HEALTHY'
                              ? 'bg-brand-tint text-brand-dark'
                              : p.status === 'DEGRADED'
                                ? 'bg-amber-tint text-amber'
                                : 'bg-red-tint text-red'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted text-xs">{fmtTime(p.lastFetchAt)}</td>
                      <td className="px-4 py-2.5 text-muted text-xs max-w-xs truncate" title={p.lastError || ''}>
                        {p.lastError || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {health?.backgroundJobs.reconcilePendingOrders.lastRunAt && (
            <div className="text-xs text-muted mt-2">
              Reconcile pending orders - last run: {fmtTime(health.backgroundJobs.reconcilePendingOrders.lastRunAt)}
              {health.backgroundJobs.reconcilePendingOrders.lastError && (
                <span className="text-red"> - {health.backgroundJobs.reconcilePendingOrders.lastError}</span>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Risk overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              label="MTF exposure"
              value={risk ? inr(risk.mtfExposure) : '-'}
              tone="amber"
            />
            <StatCard
              label="MTF margin paid"
              value={risk ? inr(risk.mtfMarginPaid) : '-'}
            />
            <StatCard
              label="Futures margin used"
              value={risk ? inr(risk.futuresMarginUsed) : '-'}
              tone="amber"
            />
            <StatCard
              label="Options premium at risk"
              value={risk ? inr(risk.optionsPremiumAtRisk) : '-'}
              tone="amber"
            />
            <StatCard
              label="Total exposure"
              value={risk ? inr(risk.totalExposure) : '-'}
              tone={risk && risk.totalExposure > 0 ? 'red' : 'default'}
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-ink mb-2">Recent activity</h2>
          <div className="bg-surface border border-border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                  <th className="px-4 py-2.5 font-medium">IP</th>
                  <th className="px-4 py-2.5 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {activity === null && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted text-xs">
                      Loading...
                    </td>
                  </tr>
                )}
                {activity?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted text-xs">
                      No activity recorded yet.
                    </td>
                  </tr>
                )}
                {activity?.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-ink">{log.action}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          log.result === 'SUCCESS'
                            ? 'bg-brand-tint text-brand-dark'
                            : 'bg-red-tint text-red'
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted tabular text-xs">{log.ip_address || '-'}</td>
                    <td className="px-4 py-2.5 text-muted text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}