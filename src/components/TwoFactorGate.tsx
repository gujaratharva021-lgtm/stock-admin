import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'

export default function TwoFactorGate({ onDone }: { onDone: () => void }) {
  const { logout } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await api.post('/admin-2fa/verify', { code })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-bg items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-md border border-border bg-surface p-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Two-factor verification</h2>
          <p className="mt-1 text-sm text-muted">Enter the 6-digit code from your authenticator app, or a recovery code (xxxx-xxxx-xxxx).</p>
        </div>
        <input
          autoFocus
          inputMode="text"
          autoComplete="one-time-code"
          maxLength={14}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9a-fA-F-]/g, ''))}
          placeholder="123456 or xxxx-xxxx-xxxx"
          className="w-full rounded border border-border-strong bg-white px-3.5 py-2.5 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        {error && <div role="alert" className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}
        <button
          type="submit"
          disabled={busy || (code.replace(/-/g, '').length !== 6 && code.replace(/-/g, '').length !== 12)}
          className="w-full rounded-md bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Verifying...' : 'Verify'}
        </button>
        <button type="button" onClick={logout} className="w-full text-xs text-muted hover:text-ink">
          Sign out
        </button>
      </form>
    </div>
  )
}