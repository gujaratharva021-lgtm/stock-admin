import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { api } from '../lib/api'
import AdminManagement from './AdminManagement'

vi.mock('../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))

const users = [
  { id: 'me', name: 'Me', email: 'me@x.y', is_admin: true, email_verified: true, created_at: '2026-01-01' },
  { id: 'a2', name: 'Other', email: 'o@x.y', is_admin: true, email_verified: true, created_at: '2026-01-01' },
  { id: 'c1', name: 'Cust', email: 'c@x.y', is_admin: false, email_verified: true, created_at: '2026-01-01' },
]

let authUserId = 'me'
vi.mock('../lib/authContext', () => ({
  useAuth: () => ({ user: { id: authUserId }, loading: false, login: vi.fn(), logout: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AdminManagement guards', () => {
  it('disables removing your own admin access but not other admins', async () => {
    authUserId = 'me'
    vi.mocked(api.get).mockResolvedValue({ users })
    render(<AdminManagement />)
    const buttons = await screen.findAllByText('Remove admin')
    expect((buttons[0] as HTMLButtonElement).disabled).toBe(true)
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false)
  })

  it('disables removing the last remaining admin', async () => {
    authUserId = 'someone-else'
    vi.mocked(api.get).mockResolvedValue({ users: [users[0], users[2]] })
    render(<AdminManagement />)
    const btn = (await screen.findByText('Remove admin')) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })
})
