import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/authContext'

const highlights = [
  { title: 'KYC review and approvals', icon: 'M9 12l2 2 4-4M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z' },
  { title: 'Fund requests and reconciliation', icon: 'M3 7h18M3 12h18M3 17h12' },
  { title: 'Risk monitoring and reports', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
]

const candles = [
  { x: 40, y: 150, h: 26, w1: 140, w2: 186, up: true },
  { x: 82, y: 140, h: 24, w1: 130, w2: 176, up: true },
  { x: 124, y: 146, h: 18, w1: 136, w2: 172, up: false },
  { x: 166, y: 128, h: 28, w1: 118, w2: 168, up: true },
  { x: 208, y: 118, h: 22, w1: 108, w2: 150, up: true },
  { x: 250, y: 122, h: 16, w1: 112, w2: 146, up: false },
  { x: 292, y: 100, h: 26, w1: 90, w2: 134, up: true },
  { x: 334, y: 88, h: 24, w1: 78, w2: 122, up: true },
  { x: 376, y: 92, h: 14, w1: 82, w2: 114, up: false },
  { x: 418, y: 66, h: 28, w1: 56, w2: 104, up: true },
]

const styles = `
@keyframes sp-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sp-float { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -26px, 0); } }
@keyframes sp-draw { to { stroke-dashoffset: 0; } }
@keyframes sp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sp-rise { from { transform: scaleY(0); opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
@keyframes sp-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(3); opacity: 0; } }
.sp-fade-up { opacity: 0; animation: sp-fade-up 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
.sp-float { animation: sp-float 10s ease-in-out infinite; }
.sp-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: sp-draw 2.4s 0.6s ease-out forwards; }
.sp-area { opacity: 0; animation: sp-fade 1.2s 1.8s ease-out forwards; }
.sp-candle { transform-box: fill-box; transform-origin: bottom; opacity: 0; animation: sp-rise 0.6s ease-out forwards; }
.sp-pulse { transform-box: fill-box; transform-origin: center; animation: sp-pulse 2s 2.8s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .sp-fade-up, .sp-float, .sp-draw, .sp-area, .sp-candle { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; transform: none !important; }
  .sp-pulse { display: none; }
}
`

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  if (user) return <Navigate to="/" replace />

  const inputClass =
    'w-full rounded-md border border-border-strong bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-2 outline-none transition focus:ring-2 focus:ring-brand/30 focus:border-brand'

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-bg">
      <style>{styles}</style>

      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-ink px-14 py-12 text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="sp-float pointer-events-none absolute -top-24 -left-20 h-96 w-96 rounded-full bg-brand/25 blur-3xl" />
        <div className="sp-float pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-blue/20 blur-3xl" style={{ animationDelay: '-5s' }} />

        <div className="sp-fade-up relative flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-brand flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M15 7h6v6" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight">StockPro</span>
        </div>

        <div className="relative">
          <h1 className="sp-fade-up text-3xl font-semibold tracking-tight leading-tight" style={{ animationDelay: '0.1s' }}>
            Operations console
          </h1>
          <p className="sp-fade-up mt-3 max-w-sm text-sm text-white/60" style={{ animationDelay: '0.2s' }}>
            Manage users, funds, settlements and risk from one place.
          </p>

          <div
            className="sp-fade-up mt-8 max-w-lg rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur"
            style={{ animationDelay: '0.3s' }}
          >
            <div className="mb-3 flex items-center justify-between text-xs text-white/50">
              <span>Platform overview</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                Secure
              </span>
            </div>
            <svg viewBox="0 0 480 210" className="w-full h-auto" role="img" aria-label="Market chart illustration">
              <defs>
                <linearGradient id="spArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2FAD5C" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2FAD5C" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[40, 90, 140, 190].map((y) => (
                <line key={y} x1="10" x2="470" y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 5" />
              ))}
              {candles.map((c, i) => (
                <g key={c.x} className="sp-candle" style={{ animationDelay: `${0.5 + i * 0.12}s` }}>
                  <line x1={c.x} x2={c.x} y1={c.w1} y2={c.w2} stroke={c.up ? '#2FAD5C' : '#C24444'} strokeWidth="1.5" />
                  <rect x={c.x - 7} y={c.y} width="14" height={c.h} rx="2" fill={c.up ? '#2FAD5C' : '#C24444'} opacity="0.85" />
                </g>
              ))}
              <path
                className="sp-area"
                d="M20 190 C 70 175, 100 182, 140 160 S 220 150, 260 120 S 340 110, 380 80 S 440 50, 470 34 L470 210 L20 210 Z"
                fill="url(#spArea)"
              />
              <path
                className="sp-draw"
                pathLength="1"
                d="M20 190 C 70 175, 100 182, 140 160 S 220 150, 260 120 S 340 110, 380 80 S 440 50, 470 34"
                fill="none"
                stroke="#5EE08A"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="470" cy="34" r="4" fill="#5EE08A" />
              <circle className="sp-pulse" cx="470" cy="34" r="4" fill="#5EE08A" />
            </svg>
          </div>

          <ul className="mt-8 space-y-3.5">
            {highlights.map((item, i) => (
              <li
                key={item.title}
                className="sp-fade-up flex items-center gap-3 text-sm text-white/80"
                style={{ animationDelay: `${0.5 + i * 0.12}s` }}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-brand">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon} />
                  </svg>
                </span>
                {item.title}
              </li>
            ))}
          </ul>
        </div>

        <p className="sp-fade-up relative text-xs text-white/40" style={{ animationDelay: '0.9s' }}>
          StockPro. Internal use only.
        </p>
      </aside>

      <main className="relative flex items-center justify-center overflow-hidden px-6 py-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(18,22,26,0.10) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 75%)',
              maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 75%)',
            }}
          />
          <div className="sp-float absolute -top-24 -right-24 h-80 w-80 rounded-full bg-brand/15 blur-3xl" />
          <div className="sp-float absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-blue/10 blur-3xl" style={{ animationDelay: '-5s' }} />

          <svg viewBox="0 0 800 240" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-56 w-full">
            <defs>
              <linearGradient id="spLightArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2FAD5C" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#2FAD5C" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 190 C 100 170, 180 205, 280 160 S 450 120, 540 138 S 700 70, 800 52 L800 240 L0 240 Z" fill="url(#spLightArea)" />
            <path d="M0 190 C 100 170, 180 205, 280 160 S 450 120, 540 138 S 700 70, 800 52" fill="none" stroke="#2FAD5C" strokeOpacity="0.28" strokeWidth="2" />
          </svg>

          <div
            className="sp-float absolute right-14 top-16 hidden w-52 rounded-xl border border-border bg-white/80 p-4 shadow-sm backdrop-blur xl:block"
            style={{ animationDelay: '-2s' }}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-tint text-brand">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
                </svg>
              </span>
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-20 rounded bg-border-strong/60" />
                <div className="h-2 w-12 rounded bg-border" />
              </div>
            </div>
          </div>

          <div
            className="sp-float absolute bottom-40 left-10 hidden w-44 rounded-xl border border-border bg-white/80 p-4 shadow-sm backdrop-blur xl:block"
            style={{ animationDelay: '-7s' }}
          >
            <div className="flex h-12 items-end gap-1.5">
              {[40, 62, 48, 78, 58, 92].map((h, i) => (
                <div key={i} className="flex-1 rounded-sm bg-brand/30" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="mt-3 h-2 w-16 rounded bg-border-strong/60" />
          </div>
        </div>
        <div className="sp-fade-up relative w-full max-w-sm" style={{ animationDelay: '0.15s' }}>
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-brand flex items-center justify-center text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M15 7h6v6" />
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink">StockPro</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-ink">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted">Use your staff account to access the admin console.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={inputClass + ' pr-16'}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3.5 text-xs font-medium text-muted hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm text-red bg-red-tint border border-red/20 rounded-md px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-brand text-white text-sm font-medium py-2.5 shadow-sm hover:bg-brand-dark hover:shadow-md active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && (
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-2">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 018 0v3" />
            </svg>
            Access is restricted to authorized staff accounts.
          </p>
        </div>
      </main>
    </div>
  )
}