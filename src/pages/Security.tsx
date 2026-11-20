import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../lib/api'
import PageHeader from '../components/PageHeader'

export default function Security() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState('')
  const [offCode, setOffCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .get<{ enabled: boolean }>('/admin-2fa/status')
      .then((r) => setEnabled(r.enabled))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load status'))
  }, [])

  const loadCodes = async () => {
    const r = await api.post<{ codes: string[] }>('/admin-2fa/recovery')
    setCodes(r.codes ?? [])
  }

  const start = async () => {
    setError(null)
    setBusy(true)
    try {
      const r = await api.post<{ secret: string; otpauth_url: string }>('/admin-2fa/setup')
      setQr(await QRCode.toDataURL(r.otpauth_url, { width: 200, margin: 1 }))
      setSecret(r.secret)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed')
    } finally {
      setBusy(false)
    }
  }

  const enable = async () => {
    setError(null)
    setBusy(true)
    try {
      await api.post('/admin-2fa/enable', { code })
      setEnabled(true)
      setSecret(null)
      setQr(null)
      setCode('')
      await loadCodes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not enable 2FA')
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async () => {
    if (!window.confirm('This replaces all existing recovery codes. Continue?')) return
    setError(null)
    setBusy(true)
    try {
      await loadCodes()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate recovery codes')
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    if (!window.confirm('Turn off two-factor authentication for this account?')) return
    setError(null)
    setBusy(true)
    try {
      await api.post('/admin-2fa/disable', { code: offCode })
      setEnabled(false)
      setOffCode('')
      setCodes(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not turn off 2FA')
    } finally {
      setBusy(false)
    }
  }

  const pretty = secret ? secret.replace(/(.{4})/g, '$1 ').trim() : ''

  return (
    <div>
      <PageHeader title="Security" subtitle="Two-factor authentication for this admin account" />
      <div className="p-6 space-y-4 max-w-xl">
        {error && <div className="text-sm text-red bg-red-tint border border-red/20 rounded px-3 py-2">{error}</div>}

        {enabled === null && <p className="text-sm text-muted">Loading...</p>}

        {codes && (
          <div className="rounded-md border border-border bg-surface p-5 space-y-3">
            <div className="text-sm font-medium text-ink">Your recovery codes</div>
            <p className="text-xs text-muted">Each code works once if you lose your authenticator app. They are shown only now. Save them somewhere safe.</p>
            <div className="grid grid-cols-2 gap-2 font-mono text-sm text-ink">
              {codes.map((c) => (
                <div key={c} className="select-all rounded border border-border bg-bg px-3 py-1.5">{c}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(codes.join('\n'))} className="rounded border border-border-strong px-3 py-2 text-sm text-ink">
                Copy all
              </button>
              <button onClick={() => setCodes(null)} className="rounded bg-ink px-3 py-2 text-sm text-white">
                I have saved these codes
              </button>
            </div>
          </div>
        )}

        {enabled === true && (
          <div className="rounded-md border border-border bg-surface p-5 space-y-3">
            <div className="text-sm font-medium text-ink">Two-factor authentication is ON</div>
            <p className="text-sm text-muted">Your authenticator app is required to open this panel.</p>
            <div className="flex gap-2 pt-2">
              <input
                value={offCode}
                onChange={(e) => setOffCode(e.target.value.replace(/[^0-9a-fA-F-]/g, ''))}
                maxLength={14}
                placeholder="Code to turn off"
                className="w-48 rounded border border-border-strong bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
              <button
                disabled={busy || offCode.replace(/-/g, '').length < 6}
                onClick={disable}
                className="rounded border border-red/30 px-3 py-2 text-sm text-red disabled:opacity-50"
              >
                Turn off 2FA
              </button>
            </div>
            <button disabled={busy} onClick={regenerate} className="rounded border border-border-strong px-3 py-2 text-sm text-ink disabled:opacity-50">
              Generate new recovery codes
            </button>
          </div>
        )}

        {enabled === false && !secret && (
          <div className="rounded-md border border-border bg-surface p-5 space-y-3">
            <div className="text-sm font-medium text-ink">Two-factor authentication is OFF</div>
            <p className="text-sm text-muted">Install Google Authenticator, Microsoft Authenticator or Authy on your phone first.</p>
            <button disabled={busy} onClick={start} className="rounded bg-ink px-3 py-2 text-sm text-white disabled:opacity-50">
              Start setup
            </button>
          </div>
        )}

        {enabled === false && secret && (
          <div className="rounded-md border border-border bg-surface p-5 space-y-4">
            <div>
              <div className="text-sm font-medium text-ink">1. Scan this QR code in your authenticator app</div>
              {qr && <img src={qr} alt="2FA QR code" width={200} height={200} className="mt-2 rounded border border-border bg-white" />}
              <p className="mt-2 text-xs text-muted">Or choose "Enter a setup key", account name StockPro, type: time based.</p>
              <div className="mt-2 select-all rounded border border-border bg-bg px-3 py-2 font-mono text-sm tracking-wider text-ink">{pretty}</div>
              <p className="mt-1 text-xs text-muted">Save this key somewhere safe. It is shown only now.</p>
            </div>
            <div>
              <div className="text-sm font-medium text-ink">2. Enter the 6-digit code from the app</div>
              <div className="mt-2 flex gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-36 rounded border border-border-strong bg-white px-3 py-2 text-center tracking-widest outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <button disabled={busy || code.length !== 6} onClick={enable} className="rounded bg-ink px-3 py-2 text-sm text-white disabled:opacity-50">
                  Turn on 2FA
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}