import { askReason } from '../lib/reason'
import { kycOf, kycLabel } from '../lib/kyc'
import { useEffect, useMemo, useState } from 'react'
import { api, type User, type UserStatus } from '../lib/api'
import PageHeader from '../components/PageHeader'

export default function Users() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({})
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const PAGE = 50

  const load = () => {
    const p1 = api
      .get<{ users: User[] }>('/auth/admin/all-users')
      .then((r) => setUsers(r.users ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
    const p2 = api
      .get<{ statuses: UserStatus[] }>('/admin/user-statuses')
      .then((r) => setStatuses(Object.fromEntries((r.statuses ?? []).map((s) => [s.id, s]))))
      .catch(() => {})
    return Promise.all([p1, p2])
  }

  useEffect(() => { load() }, [])

  const toggleBlock = async (u: User) => {
    const blocked = statuses[u.id]?.is_blocked
    let reason = ''
    if (!blocked) {
      const r = askReason(`Block ${u.email}? Enter a reason:`)
      if (r === null) return
      reason = r
    } else if (!window.confirm(`Unblock ${u.email}?`)) {
      return
    }
    setBusy(u.id)
    try {
      await api.post(`/admin/users/${u.id}/${blocked ? 'unblock' : 'block'}`, { reason })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const filtered = useMemo(() => {
    if (!users) return null
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => String(u.name ?? '').toLowerCase().includes(q) || String(u.email ?? '').toLowerCase().includes(q)
    )
  }, [users, query])

  return (
    <div>
      <PageHeader title="Users" subtitle={users ? `${users.length} registered accounts` : undefined} />
      <div className="p-6 space-y-4">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Search by name or email..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(0) }}
          className="w-full max-w-sm rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
        />

        <div className="flex items-center justify-between text-xs text-muted">
          <span>{filtered ? `${filtered.length === 0 ? 0 : page * PAGE + 1}-${Math.min((page + 1) * PAGE, filtered.length)} of ${filtered.length}` : ''}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="rounded border border-border-strong bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={!filtered || (page + 1) * PAGE >= filtered.length}
              onClick={() => setPage(page + 1)}
              className="rounded border border-border-strong bg-white px-3 py-1.5 text-xs text-ink hover:bg-bg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div><div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">KYC</th>
                <th className="px-4 py-2.5 font-medium">Verified</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Balance</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered === null && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted text-xs">
                    Loading...
                  </td>
                </tr>
              )}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted text-xs">
                    {query.trim() ? `No users match "${query}".` : 'No users yet.'}
                  </td>
                </tr>
              )}
              {filtered?.slice(page * PAGE, page * PAGE + PAGE).map((u) => {
                const st = statuses[u.id]
                const blocked = !!st?.is_blocked
                const kyc = kycOf(u, st)
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="px-4 py-2.5 text-ink font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-muted">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          kyc === 'approved' ? 'bg-brand-tint text-brand-dark' : kyc === 'rejected' ? 'bg-red-tint text-red' : 'bg-amber-tint text-amber'
                        }`}
                      >
                        {kycLabel(u, st)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{u.email_verified ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {u.is_admin ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-tint text-blue">Admin</span>
                      ) : (
                        <span className="text-muted">Customer</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {blocked ? (
                        <span title={st?.blocked_reason ?? ''} className="px-1.5 py-0.5 rounded bg-red-tint text-red">Blocked</span>
                      ) : (
                        <span className="text-muted">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-ink">
                      ₹{(Number(u.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      {!u.is_admin && (
                        <button
                          disabled={busy === u.id}
                          onClick={() => toggleBlock(u)}
                          className={`text-xs px-2.5 py-1 rounded border disabled:opacity-50 ${
                            blocked ? 'border-border text-ink' : 'border-red/30 text-red'
                          }`}
                        >
                          {blocked ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}