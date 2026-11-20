import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, getToken, setToken } from './api'

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status, ok: status < 400, json: () => Promise.resolve(body) }))
}

describe('api 401 handling', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('location', { href: '/admin/login' })
  })

  it('login 401 throws the server error and does not redirect', async () => {
    setToken('keep-me')
    mockFetch(401, { error: 'invalid credentials' })
    await expect(api.post('/auth/login', { email: 'a', password: 'b' })).rejects.toThrow('invalid credentials')
    expect(window.location.href).toBe('/admin/login')
    expect(getToken()).toBe('keep-me')
  })

  it('401 on other paths clears the token and redirects', async () => {
    setToken('stale')
    mockFetch(401, { error: 'unauthorized' })
    await expect(api.get('/admin/orders')).rejects.toThrow('unauthorized')
    expect(getToken()).toBeNull()
  })
})
