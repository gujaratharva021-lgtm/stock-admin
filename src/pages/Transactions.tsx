import { useEffect, useMemo, useState } from 'react'
import { api, type AdminTransaction } from '../lib/api'
import PageHeader from '../components/PageHeader'

export default function Transactions() {
  const [txns, setTxns] = useState<AdminTransaction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    api
      .get<{ transactions: AdminTransaction[] }>('/portfolio/admin/all-transactions?limit=5000')
      .then((r) => setTxns(r.transactions))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load transactions'))
  }, [])

  const filtered = useMemo(() => {
    if (!txns) return null
    const q = query.trim().toLowerCase()
    if (!q) return txns
    return txns.filter(
      (t) =>
        String(t.user_email ?? '').toLowerCase().includes(q) ||
        String(t.user_name ?? '').toLowerCase().includes(q) ||
        String(t.symbol ?? '').toLowerCase().includes(q)
    )
  }, [txns, query])

  return (
    <div>
      <PageHeader
        title="Orders & Trades"
        subtitle={txns ? `${txns.length} recent transactions` : undefined}
      />
      <div className="p-6 space-y-4">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Search by user, email, or symbol..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
        />

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Symbol</th>
                <th className="px-4 py-2.5 font-medium">Side</th>
                <th className="px-4 py-2.5 font-medium text-right">Quantity</th>
                <th className="px-4 py-2.5 font-medium text-right">Price</th>
                <th className="px-4 py-2.5 font-medium text-right">Charges</th>
                <th className="px-4 py-2.5 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered === null && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted text-xs">
                    Loading...
                  </td>
                </tr>
              )}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted text-xs">
                    {query.trim() ? `No transactions match "${query}".` : 'No transactions recorded yet.'}
                  </td>
                </tr>
              )}
              {filtered?.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-2.5">
                    <div className="text-ink font-medium">{t.user_name}</div>
                    <div className="text-muted text-xs">{t.user_email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-ink">
                    <div className="font-medium">{t.symbol}</div>
                    <div className="text-muted text-xs">{t.company_name}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        t.buy_sell === 'BUY'
                          ? 'bg-brand-tint text-brand-dark'
                          : 'bg-red-tint text-red'
                      }`}
                    >
                      {t.buy_sell}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-ink">{t.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular text-ink">
                    {(Number(t.price) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular text-ink">
                    {(Number(t.charges) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}