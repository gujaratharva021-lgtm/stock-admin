import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { api } from '../lib/api'
import Security from './Security'

vi.mock('../lib/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,xx') } }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Security 2FA lifecycle', () => {
  it('shows the QR code after setup, then recovery codes after enabling', async () => {
    vi.mocked(api.get).mockResolvedValue({ enabled: false })
    vi.mocked(api.post).mockImplementation(async (path: string) => {
      if (path === '/admin-2fa/setup') return { secret: 'ABCDEFGHABCDEFGH', otpauth_url: 'otpauth://totp/x' }
      if (path === '/admin-2fa/enable') return { enabled: true }
      if (path === '/admin-2fa/recovery') return { codes: ['aaaa-bbbb-cccc', 'dddd-eeee-ffff'] }
      return {}
    })
    render(<Security />)
    fireEvent.click(await screen.findByText('Start setup'))
    expect(await screen.findByAltText('2FA QR code')).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Turn on 2FA'))
    expect(await screen.findByText('aaaa-bbbb-cccc')).toBeTruthy()
    expect(screen.getByText('dddd-eeee-ffff')).toBeTruthy()
  })

  it('regenerate does nothing when the confirm is cancelled', async () => {
    vi.mocked(api.get).mockResolvedValue({ enabled: true })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Security />)
    fireEvent.click(await screen.findByText('Generate new recovery codes'))
    expect(api.post).not.toHaveBeenCalled()
  })
})
