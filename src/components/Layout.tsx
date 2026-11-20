import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/authContext'
import { api } from '../lib/api'
import TwoFactorGate from './TwoFactorGate'
import ErrorBoundary from './ErrorBoundary'

type Item = { to: string; label: string; icon: string; end?: boolean }
type Group = { title: string; items: Item[] }

const GROUPS: Group[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', end: true, icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
      { to: '/users', label: 'Users', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8' },
      { to: '/kyc', label: 'KYC', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
    ],
  },
  {
    title: 'Trading',
    items: [
      { to: '/orders', label: 'Orders & Trades', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/portfolio', label: 'Portfolio / Positions', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/risk', label: 'Risk', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/assets', label: 'ETF / Commodity / MF', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/pending-orders', label: 'Pending Orders', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
      { to: '/market', label: 'Market & Instruments', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
    ],
  },
  {
    title: 'Money',
    items: [
      { to: '/funds', label: 'Funds & Withdrawals', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/deposits', label: 'Deposits', icon: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
      { to: '/fund-transfers', label: 'Fund Transfers', icon: 'M4 12h16M14 6l6 6-6 6' },
      { to: '/ledger', label: 'Wallet / Ledger', icon: 'M4 4h14v16H4zM8 8h6M8 12h6M8 16h4' },
      { to: '/failed-payments', label: 'Failed Payments', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/refunds', label: 'Refunds', icon: 'M4 4v6h6M4 10a8 8 0 1114 5' },
      { to: '/withdrawals', label: 'Withdrawal Requests', icon: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
      { to: '/charges', label: 'Charges & Brokerage', icon: 'M19 5L5 19M7 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
      { to: '/settlement', label: 'Settlement', icon: 'M5 12l5 5L20 7' },
      { to: '/reconciliation', label: 'Reconciliation', icon: 'M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.3 6.3L4 10M4 14a8 8 0 0013.7 3.7L20 14' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/ipos', label: 'IPOs', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
      { to: '/news', label: 'News', icon: 'M4 4h14v16H4zM18 8h2v10a2 2 0 01-2 2M8 8h6M8 12h6M8 16h4' },
      { to: '/notifications', label: 'Notifications', icon: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
      { to: '/support', label: 'Support / Tickets', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
      { to: '/reports', label: 'Reports & Audit', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h8' },
    ],
  },
  {
    title: 'Risk & Surveillance',
    items: [
      { to: '/risk-dashboard', label: 'Risk Dashboard', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/margin', label: 'Margin', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/exposure', label: 'Exposure', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/trading-limits', label: 'Trading Limits', icon: 'M4 12h16M12 4v16' },
      { to: '/fraud', label: 'Fraud Monitoring', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
      { to: '/aml', label: 'AML Monitoring', icon: 'M3 6h18v12H3zM8 12h8' },
      { to: '/surveillance', label: 'Trade Surveillance', icon: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zM12 15a3 3 0 100-6 3 3 0 000 6z' },
      { to: '/risk-alerts', label: 'Risk Alerts', icon: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
    ],
  },
  
  {
    title: 'Compliance',
    items: [
      { to: '/compliance', label: 'Compliance Dashboard', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' },
      { to: '/regulatory-reports', label: 'Regulatory Reports', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h8' },
      { to: '/transaction-monitoring', label: 'Transaction Monitoring', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/compliance-cases', label: 'Compliance Cases', icon: 'M4 11h16v9H4zM8 11V8a4 4 0 018 0v3' },
      { to: '/audit', label: 'Audit', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
    ],
  },
  
  {
    title: 'Reports & Analytics',
    items: [
      { to: '/trading-reports', label: 'Trading Reports', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/revenue-reports', label: 'Revenue Reports', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/brokerage-reports', label: 'Brokerage Reports', icon: 'M19 5L5 19M7 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
      { to: '/pnl-reports', label: 'P&L Reports', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
      { to: '/tax-reports', label: 'Tax Reports', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h8' },
      { to: '/user-reports', label: 'User Reports', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z' },
      { to: '/custom-reports', label: 'Custom Reports', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3' },
      { to: '/export-center', label: 'Export Center', icon: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
    ],
  },
  
  {
    title: 'Corporate Actions',
    items: [
      { to: '/ca-dividends', label: 'Dividends', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/ca-bonus', label: 'Bonus', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
      { to: '/ca-splits', label: 'Stock Split', icon: 'M4 12h16M12 4v16' },
      { to: '/ca-buyback', label: 'Buyback', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
      { to: '/ca-rights', label: 'Rights Issue', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6' },
      { to: '/ca-merger', label: 'Merger / Demerger', icon: 'M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.3 6.3L4 10' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { to: '/int-exchange', label: 'Exchange', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
      { to: '/int-market-data', label: 'Market Data', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/int-payment', label: 'Payment Gateway', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/int-bank', label: 'Bank', icon: 'M3 10l9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18' },
      { to: '/int-kyc', label: 'KYC Provider', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
      { to: '/int-comms', label: 'SMS / Email', icon: 'M4 6h16v12H4zM4 7l8 6 8-6' },
      { to: '/int-api', label: 'API', icon: 'M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14' },
      { to: '/int-webhooks', label: 'Webhooks', icon: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
    ],
  },
  {
    title: 'Instrument / Scrip Master',
    items: [
      { to: '/scrip-symbols', label: 'NSE / BSE Symbols', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
      { to: '/scrip-isin', label: 'ISIN', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/scrip-lot-size', label: 'Lot Size', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/scrip-tick-size', label: 'Tick Size', icon: 'M12 3v18M3 12h18' },
      { to: '/scrip-fno', label: 'F&O Contracts', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/scrip-expiry', label: 'Expiry', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
      { to: '/scrip-status', label: 'Trading Status', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
    ],
  },
  
  {
    title: 'Margin Management',
    items: [
      { to: '/mm-used', label: 'Available / Used Margin', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/mm-span', label: 'SPAN Margin', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/mm-exposure', label: 'Exposure Margin', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/mm-collateral', label: 'Collateral', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/mm-shortfall', label: 'Margin Shortfall', icon: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
      { to: '/mm-calls', label: 'Margin Calls', icon: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
    ],
  },
  
  {
    title: 'Demat / Holdings',
    items: [
      { to: '/dm-holdings', label: 'Holdings', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/dm-sync', label: 'Demat Sync', icon: 'M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.3 6.3L4 10M4 14a8 8 0 0013.7 3.7L20 14' },
      { to: '/dm-pledge', label: 'Pledge / Unpledge', icon: 'M4 11h16v9H4zM8 11V8a4 4 0 018 0v3' },
      { to: '/dm-dp', label: 'DP Transactions', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/dm-ca', label: 'Corporate-action Holdings', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
    ],
  },
  
  {
    title: 'Order Management (OMS)',
    items: [
      { to: '/oms-lifecycle', label: 'Order Lifecycle', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
      { to: '/oms-exchange-id', label: 'Exchange Order ID', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/oms-fills', label: 'Execution / Fills', icon: 'M5 12l5 5L20 7' },
      { to: '/oms-partial', label: 'Partial Fills', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/oms-rejections', label: 'Rejections', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/oms-modify-cancel', label: 'Modify / Cancel', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3' },
      { to: '/oms-ack', label: 'Exchange Acknowledgement', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
    ],
  },
  
  {
    title: 'Client Account',
    items: [
      { to: '/ca-activation', label: 'Account Activation', icon: 'M5 12l5 5L20 7' },
      { to: '/ca-freeze', label: 'Account Status / Freeze', icon: 'M4 11h16v9H4zM8 11V8a4 4 0 018 0v3' },
      { to: '/ca-nomination', label: 'Nomination', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z' },
      { to: '/ca-ucc', label: 'UCC / Client Code', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/ca-ddpi', label: 'DDPI / POA', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6' },
      { to: '/ca-bank', label: 'Client Bank Mapping', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
    ],
  },
  
  {
    title: 'Depository / DP',
    items: [
      { to: '/dp-cdsl', label: 'CDSL', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/dp-nsdl', label: 'NSDL', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/dp-edis', label: 'eDIS', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6' },
      { to: '/dp-mapping', label: 'Demat Account Mapping', icon: 'M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.3 6.3L4 10M4 14a8 8 0 0013.7 3.7L20 14' },
      { to: '/dp-repledge', label: 'Pledge / Re-pledge', icon: 'M4 11h16v9H4zM8 11V8a4 4 0 018 0v3' },
      { to: '/dp-recon', label: 'DP Reconciliation', icon: 'M5 12l5 5L20 7' },
    ],
  },
  
  {
    title: 'Clearing & Settlement',
    items: [
      { to: '/cl-member', label: 'Clearing Member', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z' },
      { to: '/cl-payin', label: 'Pay-in', icon: 'M12 3v12M7 10l5 5 5-5M4 21h16' },
      { to: '/cl-payout', label: 'Pay-out', icon: 'M12 21V9M7 14l5-5 5 5M4 3h16' },
      { to: '/cl-obligation', label: 'Obligation', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/cl-auction', label: 'Auction', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/cl-exceptions', label: 'Settlement Exceptions', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
    ],
  },
  
  {
    title: 'Client Documents',
    items: [
      { to: '/cd-contract-notes', label: 'Contract Notes', icon: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9zM14 3v6h6M8 13h8M8 17h8' },
      { to: '/cd-confirmations', label: 'Trade Confirmations', icon: 'M5 12l5 5L20 7' },
      { to: '/cd-ledger', label: 'Ledger Statements', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/cd-holdings', label: 'Holding Statements', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/cd-tax', label: 'Tax Statements', icon: 'M19 5L5 19M7 7.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
      { to: '/cd-history', label: 'Email / Download History', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
    ],
  },
  
  {
    title: 'Advanced RMS',
    items: [
      { to: '/rms-circuit', label: 'Client Risk Limits', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/rms-bands', label: 'Price Bands', icon: 'M4 7h16M4 12h16M4 17h10' },
      { to: '/rms-kill', label: 'Kill Switch', icon: 'M12 3v9M6.4 6.4a8 8 0 1011.2 0' },
      { to: '/rms-squareoff', label: 'Auto Square-off', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
      { to: '/rms-exposure', label: 'Client Exposure Limits', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/rms-product', label: 'Product-wise Limits', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/rms-intraday', label: 'Intraday Risk Controls', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
    ],
  },
  {
    title: 'Market Operations',
    items: [
      { to: '/mo-open-close', label: 'Market Open / Close', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
      { to: '/mo-holidays', label: 'Trading Holidays', icon: 'M8 3v4M16 3v4M4 9h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z' },
      { to: '/mo-exchange', label: 'Exchange Status', icon: 'M3 12h4l3-8 4 16 3-8h4' },
      { to: '/mo-freeze', label: 'Scrip Freeze / Unfreeze', icon: 'M4 11h16v9H4zM8 11V8a4 4 0 018 0v3' },
      { to: '/mo-halt', label: 'Trading Halt', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/mo-circuit', label: 'Circuit Limits', icon: 'M3 3v18h18M7 14l4-4 4 4 5-6' },
      { to: '/mo-auction', label: 'Auction Market', icon: 'M4 7h16M4 12h16M4 17h10' },
    ],
  },
  {
    title: 'System Monitoring',
    items: [
      { to: '/sm-api', label: 'API Health', icon: 'M3 12h4l3-8 4 16 3-8h4' },
      { to: '/sm-ws', label: 'WebSocket Health', icon: 'M4 4v6h6M20 20v-6h-6M20 10A8 8 0 006.3 6.3L4 10M4 14a8 8 0 0013.7 3.7L20 14' },
      { to: '/sm-exchange', label: 'Exchange Connection', icon: 'M3 7h18v13H3zM8 7V4h8v3' },
      { to: '/sm-jobs', label: 'Job / Queue Monitoring', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
      { to: '/sm-errors', label: 'Error Logs', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/sm-alerts', label: 'System Alerts', icon: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
      { to: '/sm-db', label: 'Database Health', icon: 'M3 6h18v12H3zM3 10h18M7 15h3' },
      { to: '/sm-dr', label: 'Disaster Recovery', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
    ],
  },
  {
    title: 'Cyber Security',
    items: [
      { to: '/cs-dashboard', label: 'Security Dashboard', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3zM9 12l2 2 4-4' },
      { to: '/cs-login', label: 'Login Monitoring', icon: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3' },
      { to: '/cs-device', label: 'Device Management', icon: 'M5 4h14v12H5zM2 20h20' },
      { to: '/cs-session', label: 'Session Management', icon: 'M12 8v4l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
      { to: '/cs-suspicious', label: 'Suspicious Login', icon: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01' },
      { to: '/cs-block', label: 'IP / Device Blocking', icon: 'M4 11h16v9H4zM8 11V8a4 4 0 018 0v3' },
      { to: '/cs-incident', label: 'Security Incidents', icon: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0' },
      { to: '/cs-access', label: 'Access Logs', icon: 'M4 7h16M4 12h16M4 17h10' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/security', label: 'Security (2FA)', icon: 'M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z' },
      { to: '/admin-management', label: 'Admin Management', icon: 'M4 11h16v9H4zM8 11V8a4 4 0 018 0v3' },
      { to: '/system', label: 'System / Configuration', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1' },
    ],
  },
]

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export default function Layout() {
  const { user, loading, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const [tfa, setTfa] = useState<{ enabled: boolean; verified: boolean } | null>(null)
  const [tfaError, setTfaError] = useState(false)
  const [tfaTry, setTfaTry] = useState(0)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .get<{ enabled: boolean; verified: boolean }>('/admin-2fa/status')
      .then((r) => { if (!cancelled) { setTfa(r); setTfaError(false) } })
      .catch(() => { if (!cancelled) setTfaError(true) })
    return () => { cancelled = true }
  }, [user, tfaTry])

  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    setOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-sm text-muted">
        <span className="h-4 w-4 rounded-full border-2 border-border-strong border-t-brand animate-spin" />
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (tfaError) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4 rounded-md border border-border bg-surface p-6 text-center">
          <h2 className="text-lg font-semibold text-ink">Could not verify two-factor status</h2>
          <p className="text-sm text-muted">The admin console stays locked until this check succeeds.</p>
          <button
            type="button"
            onClick={() => { setTfaError(false); setTfaTry((n) => n + 1) }}
            className="w-full rounded-md bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Retry
          </button>
          <button type="button" onClick={logout} className="w-full text-xs text-muted hover:text-ink">
            Sign out
          </button>
        </div>
      </div>
    )
  }
  if (tfa === null) return <div className="min-h-screen bg-bg" />
  if (tfa.enabled && !tfa.verified) {
    return <TwoFactorGate onDone={() => setTfa({ enabled: true, verified: true })} />
  }
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col bg-ink text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M15 7h6v6" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">StockPro</div>
            <div className="text-[11px] text-white/45">Admin console</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {GROUPS.map((g) => (
            <div key={g.title} className="mt-4">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/35">{g.title}</div>
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors ${
                      isActive ? 'bg-white/10 font-medium text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-brand" />}
                      <span className={isActive ? 'text-brand' : 'text-white/45 group-hover:text-white/80'}>
                        <Icon d={item.icon} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-white/45">{user.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-md border border-white/10 py-1.5 text-xs text-white/70 transition-colors hover:border-red/50 hover:bg-red/10 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-md p-1.5 text-ink hover:bg-bg">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold tracking-tight">StockPro</span>
          <span className="text-xs text-muted">Admin</span>
        </div>
        <main>
          <ErrorBoundary key={location.pathname}><Suspense fallback={<div className="p-6 text-sm text-muted">Loading...</div>}><Outlet /></Suspense></ErrorBoundary>
        </main>
      </div>
    </div>
  )
}