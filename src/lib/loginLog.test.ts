import { describe, expect, it } from 'vitest'
import { ignoreIp, isLoginLog } from './loginLog'

describe('ignoreIp', () => {
  it('ignores missing, unknown and loopback', () => {
    for (const ip of [undefined, null, '', 'unknown', '::1', '127.0.0.1', '[::1]:8080']) expect(ignoreIp(ip)).toBe(true)
  })
  it('ignores private ranges', () => {
    for (const ip of ['10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.5', '169.254.1.1', '::ffff:192.168.0.9', 'fd12::1', 'fe80::1', '192.168.1.5:5000']) expect(ignoreIp(ip)).toBe(true)
  })
  it('keeps public addresses', () => {
    for (const ip of ['8.8.8.8', '172.15.0.1', '172.32.0.1', '192.169.0.1', '203.0.113.9', '2001:db8::1']) expect(ignoreIp(ip)).toBe(false)
  })
})

describe('isLoginLog', () => {
  it('matches login-type actions', () => {
    expect(isLoginLog({ action: 'login' })).toBe(true)
    expect(isLoginLog({ action: 'admin_2fa_verify' })).toBe(true)
    expect(isLoginLog({ action: 'order_create', resource_type: 'order' })).toBe(false)
  })
})
