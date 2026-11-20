import { askReason } from '../lib/reason'
import { useEffect, useMemo, useState } from 'react'
import { api, type User, type UserStatus } from '../lib/api'
import PageHeader from '../components/PageHeader'

type Filter = 'all' | 'pending' | 'approved' | 'rejected'

export default function Kyc() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [statuses, setStatuses] = useState<Record<string, UserStatus>>({})
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('pending')
  const [busy, setBusy] = useState<string | null>(null)

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

  const statusOf = (u: User) => statuses[u.id]?.kyc_status ?? (u.kyc_completed ? 'approved' : 'pending')

  const review = async (u: User, approve: boolean) => {
    let reason = ''
    if (!approve) {
      const r = askReason(`Reject KYC for ${u.email}? Enter a reason:`)
      if (r === null) return
      reason = r
    } else if (!window.confirm(`Approve KYC for ${u.email}?`)) {
      return
    }
    setBusy(u.id)
    try {
      await api.post(`/admin/kyc/${u.id}/${approve ? 'approve' : 'reject'}`, { reason })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const filtered = useMemo(() => {
    if (!users) return null
    if (filter === 'all') return users
    return users.filter((u) => (statuses[u.id]?.kyc_status ?? (u.kyc_completed ? 'approved' : 'pending')) === filter)
  }, [users, statuses, filter])

  const pendingCount = users?.filter((u) => statusOf(u) === 'pending').length ?? 0

  const badge = (s: string) =>
    s === 'approved' ? 'bg-brand-tint text-brand-dark' : s === 'rejected' ? 'bg-red-tint text-red' : 'bg-amber-tint text-amber'

  return (
    <div>
      <PageHeader title="KYC" subtitle="Review and approve identity verification" />
      <div className="p-6 space-y-4">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-1.5">
          {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors capitalize ${
                filter === f
                  ? 'bg-ink text-white border-ink'
                  : 'bg-surface text-muted border-border hover:text-ink'
              }`}
            >
              {f === 'pending' ? `Pending (${pendingCount})` : f}
            </button>
          ))}
        </div>

        <div className="bg-surface border border-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered === null && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted text-xs">Loading...</td>
                </tr>
              )}
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted text-xs">No users in this view.</td>
                </tr>
              )}
              {filtered?.map((u) => {
                const s = statusOf(u)
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="px-4 py-2.5 text-ink font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-muted">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${badge(s)}`}>{s}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right space-x-2">
                      {s !== 'approved' && (
                        <button disabled={busy === u.id} onClick={() => review(u, true)} className="text-xs px-2.5 py-1 rounded border border-border text-ink disabled:opacity-50">
                          Approve
                        </button>
                      )}
                      {s !== 'rejected' && (
                        <button disabled={busy === u.id} onClick={() => review(u, false)} className="text-xs px-2.5 py-1 rounded border border-red/30 text-red disabled:opacity-50">
                          Reject
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