import { useEffect, useMemo, useState } from 'react'
import { api, type User } from '../lib/api'
import { useAuth } from '../lib/authContext'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString()

const inputCls =
  'rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand'

function Empty({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-muted text-xs">
        {text}
      </td>
    </tr>
  )
}

export default function AdminManagement() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = () =>
    api
      .get<{ users: User[] }>('/auth/admin/all-users')
      .then((r) => setUsers(r.users))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))

  useEffect(() => {
    load()
  }, [])

  const admins = users?.filter((u) => u.is_admin) ?? null

  const toggle = async (u: User) => {
    if (u.is_admin && u.id === me?.id) return
    if (u.is_admin && (admins?.length ?? 0) <= 1) return
    const msg = u.is_admin
      ? `Remove admin access from ${u.email}?`
      : `Give admin access to ${u.email}? They will get full control of this panel.`
    if (!window.confirm(msg)) return
    setError(null)
    setBusy(u.id)
    try {
      await api.post(`/admin/admins/${u.id}/${u.is_admin ? 'revoke' : 'grant'}`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(null)
    }
  }



  const filtered = useMemo(() => {
    if (!users) return null
    const q = search.trim().toLowerCase()
    const list = [...users].sort((a, b) => Number(b.is_admin) - Number(a.is_admin))
    if (!q) return list
    return list.filter(
      (u) => String(u.name ?? '').toLowerCase().includes(q) || String(u.email ?? '').toLowerCase().includes(q)
    )
  }, [users, search])

  const verifiedAdmins = admins?.filter((u) => u.email_verified).length ?? 0
  const customers = users ? users.length - (admins?.length ?? 0) : 0

  const th = 'px-4 py-2.5 font-medium'
  const wrap = 'bg-surface border border-border rounded-md overflow-hidden'
  const head = 'border-b border-border text-left text-xs text-muted'
  const row = 'border-b border-border last:border-0 hover:bg-bg'

  return (
    <div>
      <PageHeader title="Admin Management" subtitle="Grant or remove admin access" />
      <div className="p-6 space-y-6">
        {error && (
          <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Total admins" value={admins ? admins.length : '-'} tone="brand" />
          <StatCard label="Email-verified admins" value={admins ? verifiedAdmins : '-'} />
          <StatCard label="Customers" value={users ? customers : '-'} />
        </div>

        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} w-72`}
        />

        <div className={wrap}>
          <table className="w-full text-sm">
            <thead>
              <tr className={head}>
                <th className={th}>Name</th>
                <th className={th}>Email</th>
                <th className={th}>Role</th>
                <th className={th}>Email verified</th>
                <th className={th}>Created</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered === null && <Empty cols={6} text="Loading..." />}
              {filtered?.length === 0 && <Empty cols={6} text="No users found." />}
              {filtered?.map((u) => (
                <tr key={u.id} className={row}>
                  <td className="px-4 py-2.5 text-ink font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 text-muted">{u.email}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {u.is_admin ? (
                      <span className="px-1.5 py-0.5 rounded bg-blue-tint text-blue">Admin</span>
                    ) : (
                      <span className="text-muted">Customer</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted text-xs">{u.email_verified ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2.5 text-muted text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      disabled={busy === u.id || (u.is_admin && (u.id === me?.id || (admins?.length ?? 0) <= 1))}
      title={u.is_admin && u.id === me?.id ? 'You cannot remove your own admin access' : u.is_admin && (admins?.length ?? 0) <= 1 ? 'At least one admin is required' : undefined}
                      onClick={() => toggle(u)}
                      className={`text-xs px-2.5 py-1 rounded border disabled:opacity-50 ${
                        u.is_admin ? 'border-red/30 text-red' : 'border-border text-ink'
                      }`}
                    >
                      {u.is_admin ? 'Remove admin' : 'Make admin'}
                    </button>
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