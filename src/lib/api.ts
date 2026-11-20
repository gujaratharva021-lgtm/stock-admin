// API client for the StockPro backend. Deployed same-origin under /admin/,
// so all calls are relative (no CORS needed).

const TOKEN_KEY = 'stockpro_admin_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }
  if (options.body !== undefined && options.body !== null) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`/api/v1${path}`, { ...options, headers })

  if (res.status === 401 && !path.startsWith('/admin-2fa') && path !== '/auth/login') {
    clearToken()
    window.location.href = '/admin/login'
    throw new ApiError(401, 'unauthorized')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'request failed')
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// ---- Types matching the backend's actual response shapes ----

export interface User {
  id: string
  name: string
  email: string
  balance: number
  kyc_completed: boolean
  avatar_url: string | null
  is_admin: boolean
  email_verified: boolean
  created_at: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface AuditLog {
  id: string
  user_id?: string
  action: string
  resource_type?: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
  result: 'SUCCESS' | 'FAILURE'
  created_at: string
}

export interface ReconciliationSummary {
  users_checked: number
  matched: number
  mismatched: number
  pending: number
  failed: number
}

export interface AdminTransaction {
  id: string
  user_id: string
  user_email: string
  user_name: string
  stock_id: string
  symbol: string
  company_name: string
  buy_sell: 'BUY' | 'SELL'
  quantity: number
  price: number
  charges: number
  created_at: string
}

export interface TradingOverview {
  ordersToday: number
  executedOrders: number
  rejectedOrders: number
  cancelledOrders: number
  openOrders: number
  tradeVolume: number
  turnover: number
  buyVolume: number
  sellVolume: number
  activeTraders: number
}

export interface MoneyOverview {
  totalClientFunds: number
  depositsCompletedAmount: number
  depositsCompletedCount: number
  withdrawalsCompletedAmount: number
  withdrawalsCompletedCount: number
  depositsPendingAmount: number
  depositsPendingCount: number
  settlementObligations: number
}

export interface QuoteProviderHealth {
  name: string
  status: 'HEALTHY' | 'DEGRADED' | 'UNKNOWN'
  lastFetchAt?: string
  lastError?: string
}

export interface SystemHealth {
  database: {
    status: 'HEALTHY' | 'DOWN'
  }
  quoteProviders: QuoteProviderHealth[]
  backgroundJobs: {
    reconcilePendingOrders: {
      status: 'HEALTHY' | 'DEGRADED' | 'UNKNOWN'
      lastRunAt: string
      lastError: string
    }
  }
  api: {
    status: 'HEALTHY'
  }
}

export interface RiskOverview {
  mtfExposure: number
  mtfMarginPaid: number
  futuresMarginUsed: number
  optionsPremiumAtRisk: number
  totalExposure: number
}

export interface PortfolioUserRef {
  id: string
  user_id: string
  user_email: string
  user_name: string
  symbol: string
  company_name: string
  exchange: string
}

export interface HoldingRow extends PortfolioUserRef {
  quantity: number
  avg_price: number
  invested: number
  created_at: string
}

export interface UnsettledRow extends PortfolioUserRef {
  quantity: number
  avg_price: number
  invested: number
  order_type: string
  buy_date: string
  settle_date: string
  created_at: string
}

export interface FuturesRow extends PortfolioUserRef {
  position_type: string
  lot_size: number
  entry_price: number
  margin_used: number
  status: string
  exit_price: number | null
  pnl: number | null
  created_at: string
  closed_at: string | null
}

export interface OptionsRow extends PortfolioUserRef {
  option_type: string
  strike_price: number
  premium: number
  lot_size: number
  expiry_date: string
  status: string
  settlement_price: number | null
  pnl: number | null
  created_at: string
  closed_at: string | null
}

export interface MtfRow extends PortfolioUserRef {
  quantity: number
  entry_price: number
  margin_paid: number
  borrowed_amount: number
  interest_rate: number
  status: string
  opened_at: string
  closed_at: string | null
}

export interface PortfolioOverview {
  summary: {
    totalHoldings: number
    totalInvested: number
    unsettled: number
    openFutures: number
    openOptions: number
    openMtf: number
  }
  holdings: HoldingRow[]
  unsettled: UnsettledRow[]
  futures: FuturesRow[]
  options: OptionsRow[]
  mtf: MtfRow[]
}

export interface WalletTxnRow {
  id: string
  user_id: string
  user_email: string
  user_name: string
  amount: number
  description: string
  created_at: string
}

export interface PendingOrderRow {
  order_id: string
  user_id: string
  user_email: string
  user_name: string
  amount: number
  status: string
  created_at: string
}

export interface FundsOverview {
  summary: {
    totalClientFunds: number
    depositsAmount: number
    depositsCount: number
    withdrawalsAmount: number
    withdrawalsCount: number
    pendingAmount: number
    pendingCount: number
  }
  deposits: WalletTxnRow[]
  withdrawals: WalletTxnRow[]
  pending: PendingOrderRow[]
}

export interface ReconUserRow {
  user_id: string
  user_email: string
  user_name: string
  balance: number
  wallet_net_sum: number
  difference: number
  status: 'MATCHED' | 'MISMATCHED'
  reason: string
}

export interface ReconOrderRow {
  order_id: string
  user_id: string
  user_email: string
  user_name: string
  amount: number
  created_at: string
}

export interface ReconciliationDetails {
  users: ReconUserRow[]
  pendingOrders: ReconOrderRow[]
  failedOrders: ReconOrderRow[]
}

export interface InstrumentRow {
  id: string
  symbol: string
  company_name: string
  sector: string
  exchange: string
  created_at: string
}

export interface InstrumentsResponse {
  instruments: InstrumentRow[]
  total: number
  totalAll: number
  limit: number
  offset: number
  exchanges: string[]
  sectors: string[]
}

export interface ChargeRow {
  id: string
  user_id: string
  user_email: string
  user_name: string
  symbol: string
  company_name: string
  buy_sell: 'BUY' | 'SELL'
  quantity: number
  price: number
  charges: number
  created_at: string
}

export interface ChargeUserRow {
  user_id: string
  user_email: string
  user_name: string
  transactions: number
  total_charges: number
}

export interface ChargesOverview {
  summary: {
    totalCharges: number
    transactions: number
    chargesToday: number
  }
  transactions: ChargeRow[]
  perUser: ChargeUserRow[]
}

export interface NotificationRow {
  id: string
  user_id: string
  user_email: string
  user_name: string
  title: string
  body: string
  read: boolean
  created_at: string
}

export interface NotificationUserRow {
  user_id: string
  user_email: string
  user_name: string
  total: number
  unread: number
}

export interface NotificationsOverview {
  summary: {
    total: number
    unread: number
    read: number
    today: number
    usersReached: number
  }
  notifications: NotificationRow[]
  perUser: NotificationUserRow[]
}


export interface UserStatus {
  id: string
  is_blocked: boolean
  kyc_status: 'pending' | 'approved' | 'rejected'
  blocked_reason: string | null
}
