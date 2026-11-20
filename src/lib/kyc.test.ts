import { describe, expect, it } from 'vitest'
import { kycOf, kycLabel } from './kyc'

describe('kycOf', () => {
  it('prefers the status row', () => {
    expect(kycOf({ kyc_completed: false }, { kyc_status: 'rejected' })).toBe('rejected')
    expect(kycOf({ kyc_completed: false }, { kyc_status: 'APPROVED' })).toBe('approved')
  })
  it('falls back to kyc_completed when there is no row', () => {
    expect(kycOf({ kyc_completed: true })).toBe('approved')
    expect(kycOf({ kyc_completed: false })).toBe('pending')
    expect(kycOf({ kyc_completed: false }, { kyc_status: null })).toBe('pending')
    expect(kycOf({ kyc_completed: false }, { kyc_status: 'weird' })).toBe('pending')
  })
  it('labels rejected', () => {
    expect(kycLabel({ kyc_completed: false }, { kyc_status: 'rejected' })).toBe('Rejected')
  })
})
