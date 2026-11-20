import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { useContext } from 'react'
import { api, getToken, setToken } from '../lib/api'
import { AuthProvider } from './auth'
import { AuthContext, type AuthContextValue } from './authContext'

vi.mock('./api', async (orig) => {
  const real = await orig<typeof import('./api')>()
  return { ...real, api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

function Probe({ onCtx }: { onCtx: (c: AuthContextValue) => void }) {
  const c = useContext(AuthContext)
  if (c) onCtx(c)
  return <div>{c?.loading ? 'loading' : c?.user ? 'user:' + c.user.email : 'no-user'}</div>
}

describe('AuthProvider admin checks', () => {
  it('login rejects non-admin accounts and stores no token', async () => {
    let ctx: any
    vi.mocked(api.post).mockResolvedValue({ token: 't', user: { id: '1', email: 'c@x.y', is_admin: false } })
    render(<AuthProvider><Probe onCtx={(c) => (ctx = c)} /></AuthProvider>)
    await expect(ctx.login('c@x.y', 'pw')).rejects.toThrow('admin access')
    expect(getToken()).toBeNull()
  })

  it('session restore clears the token for non-admin users', async () => {
    setToken('t')
    vi.mocked(api.get).mockResolvedValue({ id: '1', email: 'c@x.y', is_admin: false })
    render(<AuthProvider><Probe onCtx={() => {}} /></AuthProvider>)
    expect(await screen.findByText('no-user')).toBeTruthy()
    expect(getToken()).toBeNull()
  })

  it('session restore keeps admin users', async () => {
    setToken('t')
    vi.mocked(api.get).mockResolvedValue({ id: '1', email: 'a@x.y', is_admin: true })
    render(<AuthProvider><Probe onCtx={() => {}} /></AuthProvider>)
    expect(await screen.findByText('user:a@x.y')).toBeTruthy()
  })
})
