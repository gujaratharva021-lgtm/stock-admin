type KycStatusRow = { kyc_status?: string | null }

export type KycState = 'approved' | 'pending' | 'rejected'

export function kycOf(u: { kyc_completed?: boolean }, s?: KycStatusRow): KycState {
  const v = String(s?.kyc_status ?? '').toLowerCase()
  if (v === 'approved' || v === 'rejected' || v === 'pending') return v
  return u.kyc_completed ? 'approved' : 'pending'
}

export function kycLabel(u: { kyc_completed?: boolean }, s?: KycStatusRow): string {
  const k = kycOf(u, s)
  return k === 'approved' ? 'Completed' : k === 'rejected' ? 'Rejected' : 'Pending'
}
