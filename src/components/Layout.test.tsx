import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'
import { api } from '../lib/api'

vi.mock('../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('../lib/authContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Admin', email: 'a@b.c' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mount = () => render(<MemoryRouter><Layout /></MemoryRouter>)

describe('Layout 2FA gate', () => {
  it('fails closed when the status call errors', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('boom'))
    mount()
    expect(await screen.findByText('Could not verify two-factor status')).toBeTruthy()
    expect(screen.queryByText('Two-factor verification')).toBeNull()
  })

  it('shows the 2FA form when enabled and not verified', async () => {
    vi.mocked(api.get).mockResolvedValue({ enabled: true, verified: false })
    mount()
    expect(await screen.findByText('Two-factor verification')).toBeTruthy()
  })
})
