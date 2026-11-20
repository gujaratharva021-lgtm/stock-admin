import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Users = lazy(() => import('./pages/Users'))
const Kyc = lazy(() => import('./pages/Kyc'))
const System = lazy(() => import('./pages/System'))
const AdminManagement = lazy(() => import('./pages/AdminManagement'))
const Security = lazy(() => import('./pages/Security'))
const Reports = lazy(() => import('./pages/Reports'))
const Support = lazy(() => import('./pages/Support'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Reconciliation = lazy(() => import('./pages/Reconciliation'))
const Settlement = lazy(() => import('./pages/Settlement'))
const Charges = lazy(() => import('./pages/Charges'))
const Market = lazy(() => import('./pages/Market'))
const Risk = lazy(() => import('./pages/Risk'))
const Funds = lazy(() => import('./pages/Funds'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Ipos = lazy(() => import('./pages/Ipos'))
const News = lazy(() => import('./pages/News'))
const PendingOrders = lazy(() => import('./pages/PendingOrders'))
const AssetHalts = lazy(() => import('./pages/AssetHalts'))
const Withdrawals = lazy(() => import('./pages/Withdrawals'))
const RiskDashboard = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.RiskDashboard })))
const MarginPage = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.MarginPage })))
const ExposurePage = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.ExposurePage })))
const LimitsPage = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.LimitsPage })))
const FraudPage = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.FraudPage })))
const AmlPage = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.AmlPage })))
const SurveillancePage = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.SurveillancePage })))
const AlertsPage = lazy(() => import('./pages/RiskSuite').then((m) => ({ default: m.AlertsPage })))
const ComplianceDashboard = lazy(() => import('./pages/ComplianceSuite').then((m) => ({ default: m.ComplianceDashboard })))
const RegulatoryReports = lazy(() => import('./pages/ComplianceSuite').then((m) => ({ default: m.RegulatoryReports })))
const MonitoringPage = lazy(() => import('./pages/ComplianceSuite').then((m) => ({ default: m.MonitoringPage })))
const CasesPage = lazy(() => import('./pages/ComplianceSuite').then((m) => ({ default: m.CasesPage })))
const AuditPage = lazy(() => import('./pages/ComplianceSuite').then((m) => ({ default: m.AuditPage })))
const TradingReports = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.TradingReports })))
const RevenueReports = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.RevenueReports })))
const BrokerageReports = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.BrokerageReports })))
const PnlReports = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.PnlReports })))
const TaxReports = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.TaxReports })))
const UserReports = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.UserReports })))
const CustomReports = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.CustomReports })))
const ExportCenter = lazy(() => import('./pages/ReportsSuite').then((m) => ({ default: m.ExportCenter })))
const SymbolsPage = lazy(() => import('./pages/ScripMaster').then((m) => ({ default: m.SymbolsPage })))
const IsinPage = lazy(() => import('./pages/ScripMaster').then((m) => ({ default: m.IsinPage })))
const LotSizePage = lazy(() => import('./pages/ScripMaster').then((m) => ({ default: m.LotSizePage })))
const TickSizePage = lazy(() => import('./pages/ScripMaster').then((m) => ({ default: m.TickSizePage })))
const ContractsPage = lazy(() => import('./pages/ScripMaster').then((m) => ({ default: m.ContractsPage })))
const ExpiryPage = lazy(() => import('./pages/ScripMaster').then((m) => ({ default: m.ExpiryPage })))
const TradingStatusPage = lazy(() => import('./pages/ScripMaster').then((m) => ({ default: m.TradingStatusPage })))
const UsedMarginPage = lazy(() => import('./pages/MarginMgmt').then((m) => ({ default: m.UsedMarginPage })))
const SpanPage = lazy(() => import('./pages/MarginMgmt').then((m) => ({ default: m.SpanPage })))
const ExposureMarginPage = lazy(() => import('./pages/MarginMgmt').then((m) => ({ default: m.ExposureMarginPage })))
const CollateralPage = lazy(() => import('./pages/MarginMgmt').then((m) => ({ default: m.CollateralPage })))
const ShortfallPage = lazy(() => import('./pages/MarginMgmt').then((m) => ({ default: m.ShortfallPage })))
const MarginCallsPage = lazy(() => import('./pages/MarginMgmt').then((m) => ({ default: m.MarginCallsPage })))
const HoldingsPage = lazy(() => import('./pages/DematMgmt').then((m) => ({ default: m.HoldingsPage })))
const DematSyncPage = lazy(() => import('./pages/DematMgmt').then((m) => ({ default: m.DematSyncPage })))
const PledgePage = lazy(() => import('./pages/DematMgmt').then((m) => ({ default: m.PledgePage })))
const DpTransactionsPage = lazy(() => import('./pages/DematMgmt').then((m) => ({ default: m.DpTransactionsPage })))
const CaAdjustedPage = lazy(() => import('./pages/DematMgmt').then((m) => ({ default: m.CaAdjustedPage })))
const LifecyclePage = lazy(() => import('./pages/OmsSuite').then((m) => ({ default: m.LifecyclePage })))
const ExchangeIdPage = lazy(() => import('./pages/OmsSuite').then((m) => ({ default: m.ExchangeIdPage })))
const FillsPage = lazy(() => import('./pages/OmsSuite').then((m) => ({ default: m.FillsPage })))
const PartialFillsPage = lazy(() => import('./pages/OmsSuite').then((m) => ({ default: m.PartialFillsPage })))
const RejectionsPage = lazy(() => import('./pages/OmsSuite').then((m) => ({ default: m.RejectionsPage })))
const ModifyCancelPage = lazy(() => import('./pages/OmsSuite').then((m) => ({ default: m.ModifyCancelPage })))
const AckPage = lazy(() => import('./pages/OmsSuite').then((m) => ({ default: m.AckPage })))
const ActivationPage = lazy(() => import('./pages/ClientAccount').then((m) => ({ default: m.ActivationPage })))
const FreezePage = lazy(() => import('./pages/ClientAccount').then((m) => ({ default: m.FreezePage })))
const NominationPage = lazy(() => import('./pages/ClientAccount').then((m) => ({ default: m.NominationPage })))
const UccPage = lazy(() => import('./pages/ClientAccount').then((m) => ({ default: m.UccPage })))
const DdpiPage = lazy(() => import('./pages/ClientAccount').then((m) => ({ default: m.DdpiPage })))
const BankMapPage = lazy(() => import('./pages/ClientAccount').then((m) => ({ default: m.BankMapPage })))
const CdslPage = lazy(() => import('./pages/DepositoryDp').then((m) => ({ default: m.CdslPage })))
const NsdlPage = lazy(() => import('./pages/DepositoryDp').then((m) => ({ default: m.NsdlPage })))
const EdisPage = lazy(() => import('./pages/DepositoryDp').then((m) => ({ default: m.EdisPage })))
const MappingPage = lazy(() => import('./pages/DepositoryDp').then((m) => ({ default: m.MappingPage })))
const RepledgePage = lazy(() => import('./pages/DepositoryDp').then((m) => ({ default: m.RepledgePage })))
const DpReconPage = lazy(() => import('./pages/DepositoryDp').then((m) => ({ default: m.DpReconPage })))
const ClearingMemberPage = lazy(() => import('./pages/ClearingSuite').then((m) => ({ default: m.ClearingMemberPage })))
const PayInPage = lazy(() => import('./pages/ClearingSuite').then((m) => ({ default: m.PayInPage })))
const PayOutPage = lazy(() => import('./pages/ClearingSuite').then((m) => ({ default: m.PayOutPage })))
const ObligationPage = lazy(() => import('./pages/ClearingSuite').then((m) => ({ default: m.ObligationPage })))
const AuctionPage = lazy(() => import('./pages/ClearingSuite').then((m) => ({ default: m.AuctionPage })))
const ExceptionsPage = lazy(() => import('./pages/ClearingSuite').then((m) => ({ default: m.ExceptionsPage })))
const ContractNotesPage = lazy(() => import('./pages/ClientDocs').then((m) => ({ default: m.ContractNotesPage })))
const TradeConfirmationsPage = lazy(() => import('./pages/ClientDocs').then((m) => ({ default: m.TradeConfirmationsPage })))
const ClientLedgerPage = lazy(() => import('./pages/ClientDocs').then((m) => ({ default: m.LedgerPage })))
const HoldingStatementsPage = lazy(() => import('./pages/ClientDocs').then((m) => ({ default: m.HoldingStatementsPage })))
const TaxStatementsPage = lazy(() => import('./pages/ClientDocs').then((m) => ({ default: m.TaxStatementsPage })))
const DocHistoryPage = lazy(() => import('./pages/ClientDocs').then((m) => ({ default: m.DocHistoryPage })))
const RmsCircuitPage = lazy(() => import('./pages/AdvancedRms').then((m) => ({ default: m.RmsCircuitPage })))
const RmsBandsPage = lazy(() => import('./pages/AdvancedRms').then((m) => ({ default: m.RmsBandsPage })))
const RmsKillPage = lazy(() => import('./pages/AdvancedRms').then((m) => ({ default: m.RmsKillPage })))
const RmsSquareoffPage = lazy(() => import('./pages/AdvancedRms').then((m) => ({ default: m.RmsSquareoffPage })))
const RmsExposurePage = lazy(() => import('./pages/AdvancedRms').then((m) => ({ default: m.RmsExposurePage })))
const RmsProductPage = lazy(() => import('./pages/AdvancedRms').then((m) => ({ default: m.RmsProductPage })))
const RmsIntradayPage = lazy(() => import('./pages/AdvancedRms').then((m) => ({ default: m.RmsIntradayPage })))
const MoOpenClosePage = lazy(() => import('./pages/MarketOps').then((m) => ({ default: m.MoOpenClosePage })))
const MoHolidaysPage = lazy(() => import('./pages/MarketOps').then((m) => ({ default: m.MoHolidaysPage })))
const MoExchangeStatusPage = lazy(() => import('./pages/MarketOps').then((m) => ({ default: m.MoExchangeStatusPage })))
const MoFreezePage = lazy(() => import('./pages/MarketOps').then((m) => ({ default: m.MoFreezePage })))
const MoHaltPage = lazy(() => import('./pages/MarketOps').then((m) => ({ default: m.MoHaltPage })))
const MoCircuitPage = lazy(() => import('./pages/MarketOps').then((m) => ({ default: m.MoCircuitPage })))
const MoAuctionPage = lazy(() => import('./pages/MarketOps').then((m) => ({ default: m.MoAuctionPage })))
const SmApiPage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmApiPage })))
const SmWsPage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmWsPage })))
const SmExchangePage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmExchangePage })))
const SmJobsPage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmJobsPage })))
const SmErrorsPage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmErrorsPage })))
const SmAlertsPage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmAlertsPage })))
const SmDbPage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmDbPage })))
const SmDrPage = lazy(() => import('./pages/SysMonitor').then((m) => ({ default: m.SmDrPage })))
const CsDashboardPage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsDashboardPage })))
const CsLoginPage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsLoginPage })))
const CsDevicePage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsDevicePage })))
const CsSessionPage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsSessionPage })))
const CsSuspiciousPage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsSuspiciousPage })))
const CsBlockPage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsBlockPage })))
const CsIncidentPage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsIncidentPage })))
const CsAccessPage = lazy(() => import('./pages/CyberSecurity').then((m) => ({ default: m.CsAccessPage })))
const Dividends = lazy(() => import('./pages/CorporateActions').then((m) => ({ default: m.Dividends })))
const Bonus = lazy(() => import('./pages/CorporateActions').then((m) => ({ default: m.Bonus })))
const Splits = lazy(() => import('./pages/CorporateActions').then((m) => ({ default: m.Splits })))
const Buyback = lazy(() => import('./pages/CorporateActions').then((m) => ({ default: m.Buyback })))
const Rights = lazy(() => import('./pages/CorporateActions').then((m) => ({ default: m.Rights })))
const Merger = lazy(() => import('./pages/CorporateActions').then((m) => ({ default: m.Merger })))
const ExchangeIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.ExchangeIntegration })))
const MarketDataIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.MarketDataIntegration })))
const PaymentIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.PaymentIntegration })))
const BankIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.BankIntegration })))
const KycIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.KycIntegration })))
const CommsIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.CommsIntegration })))
const ApiIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.ApiIntegration })))
const WebhooksIntegration = lazy(() => import('./pages/Integrations').then((m) => ({ default: m.WebhooksIntegration })))
const DepositsPage = lazy(() => import('./pages/MoneySuite').then((m) => ({ default: m.DepositsPage })))
const FundTransfersPage = lazy(() => import('./pages/MoneySuite').then((m) => ({ default: m.FundTransfersPage })))
const LedgerPage = lazy(() => import('./pages/MoneySuite').then((m) => ({ default: m.LedgerPage })))
const FailedPaymentsPage = lazy(() => import('./pages/MoneySuite').then((m) => ({ default: m.FailedPaymentsPage })))
const RefundsPage = lazy(() => import('./pages/MoneySuite').then((m) => ({ default: m.RefundsPage })))

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/kyc" element={<Kyc />} />
            <Route path="/orders" element={<Transactions />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/funds" element={<Funds />} />
            <Route path="/risk" element={<Risk />} />
            <Route path="/market" element={<Market />} />
            <Route path="/charges" element={<Charges />} />
            <Route path="/settlement" element={<Settlement />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/support" element={<Support />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/admin-management" element={<AdminManagement />} />
            <Route path="/security" element={<Security />} />
            <Route path="/system" element={<System />} />
            <Route path="/ipos" element={<Ipos />} />
            <Route path="/news" element={<News />} />
            <Route path="/pending-orders" element={<PendingOrders />} />
            <Route path="/assets" element={<AssetHalts />} />
            <Route path="/withdrawals" element={<Withdrawals />} />
            <Route path="/risk-dashboard" element={<RiskDashboard />} />
            <Route path="/margin" element={<MarginPage />} />
            <Route path="/exposure" element={<ExposurePage />} />
            <Route path="/trading-limits" element={<LimitsPage />} />
            <Route path="/fraud" element={<FraudPage />} />
            <Route path="/aml" element={<AmlPage />} />
            <Route path="/surveillance" element={<SurveillancePage />} />
            <Route path="/risk-alerts" element={<AlertsPage />} />
            <Route path="/compliance" element={<ComplianceDashboard />} />
            <Route path="/regulatory-reports" element={<RegulatoryReports />} />
            <Route path="/compliance-aml" element={<Navigate to="/aml" replace />} />
            <Route path="/transaction-monitoring" element={<MonitoringPage />} />
            <Route path="/compliance-cases" element={<CasesPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/trading-reports" element={<TradingReports />} />
            <Route path="/revenue-reports" element={<RevenueReports />} />
            <Route path="/brokerage-reports" element={<BrokerageReports />} />
            <Route path="/pnl-reports" element={<PnlReports />} />
            <Route path="/tax-reports" element={<TaxReports />} />
            <Route path="/user-reports" element={<UserReports />} />
            <Route path="/custom-reports" element={<CustomReports />} />
            <Route path="/export-center" element={<ExportCenter />} />
            <Route path="/scrip-symbols" element={<SymbolsPage />} />
            <Route path="/scrip-isin" element={<IsinPage />} />
            <Route path="/scrip-lot-size" element={<LotSizePage />} />
            <Route path="/scrip-tick-size" element={<TickSizePage />} />
            <Route path="/scrip-fno" element={<ContractsPage />} />
            <Route path="/scrip-expiry" element={<ExpiryPage />} />
            <Route path="/scrip-status" element={<TradingStatusPage />} />
            <Route path="/mm-used" element={<UsedMarginPage />} />
            <Route path="/mm-span" element={<SpanPage />} />
            <Route path="/mm-exposure" element={<ExposureMarginPage />} />
            <Route path="/mm-collateral" element={<CollateralPage />} />
            <Route path="/mm-shortfall" element={<ShortfallPage />} />
            <Route path="/mm-calls" element={<MarginCallsPage />} />
            <Route path="/dm-holdings" element={<HoldingsPage />} />
            <Route path="/dm-sync" element={<DematSyncPage />} />
            <Route path="/dm-pledge" element={<PledgePage />} />
            <Route path="/dm-dp" element={<DpTransactionsPage />} />
            <Route path="/dm-ca" element={<CaAdjustedPage />} />
            <Route path="/oms-lifecycle" element={<LifecyclePage />} />
            <Route path="/oms-exchange-id" element={<ExchangeIdPage />} />
            <Route path="/oms-fills" element={<FillsPage />} />
            <Route path="/oms-partial" element={<PartialFillsPage />} />
            <Route path="/oms-rejections" element={<RejectionsPage />} />
            <Route path="/oms-modify-cancel" element={<ModifyCancelPage />} />
            <Route path="/oms-ack" element={<AckPage />} />
            <Route path="/ca-activation" element={<ActivationPage />} />
            <Route path="/ca-freeze" element={<FreezePage />} />
            <Route path="/ca-nomination" element={<NominationPage />} />
            <Route path="/ca-ucc" element={<UccPage />} />
            <Route path="/ca-ddpi" element={<DdpiPage />} />
            <Route path="/ca-bank" element={<BankMapPage />} />
            <Route path="/dp-cdsl" element={<CdslPage />} />
            <Route path="/dp-nsdl" element={<NsdlPage />} />
            <Route path="/dp-edis" element={<EdisPage />} />
            <Route path="/dp-mapping" element={<MappingPage />} />
            <Route path="/dp-repledge" element={<RepledgePage />} />
            <Route path="/dp-recon" element={<DpReconPage />} />
            <Route path="/cl-member" element={<ClearingMemberPage />} />
            <Route path="/cl-payin" element={<PayInPage />} />
            <Route path="/cl-payout" element={<PayOutPage />} />
            <Route path="/cl-obligation" element={<ObligationPage />} />
            <Route path="/cl-auction" element={<AuctionPage />} />
            <Route path="/cl-exceptions" element={<ExceptionsPage />} />
            <Route path="/cd-contract-notes" element={<ContractNotesPage />} />
            <Route path="/cd-confirmations" element={<TradeConfirmationsPage />} />
            <Route path="/cd-ledger" element={<ClientLedgerPage />} />
            <Route path="/cd-holdings" element={<HoldingStatementsPage />} />
            <Route path="/cd-tax" element={<TaxStatementsPage />} />
            <Route path="/cd-history" element={<DocHistoryPage />} />
            <Route path="/rms-circuit" element={<RmsCircuitPage />} />
            <Route path="/rms-bands" element={<RmsBandsPage />} />
            <Route path="/rms-kill" element={<RmsKillPage />} />
            <Route path="/rms-squareoff" element={<RmsSquareoffPage />} />
            <Route path="/rms-exposure" element={<RmsExposurePage />} />
            <Route path="/rms-product" element={<RmsProductPage />} />
            <Route path="/rms-intraday" element={<RmsIntradayPage />} />
            <Route path="/mo-open-close" element={<MoOpenClosePage />} />
            <Route path="/mo-holidays" element={<MoHolidaysPage />} />
            <Route path="/mo-exchange" element={<MoExchangeStatusPage />} />
            <Route path="/mo-freeze" element={<MoFreezePage />} />
            <Route path="/mo-halt" element={<MoHaltPage />} />
            <Route path="/mo-circuit" element={<MoCircuitPage />} />
            <Route path="/mo-auction" element={<MoAuctionPage />} />
            <Route path="/sm-api" element={<SmApiPage />} />
            <Route path="/sm-ws" element={<SmWsPage />} />
            <Route path="/sm-exchange" element={<SmExchangePage />} />
            <Route path="/sm-jobs" element={<SmJobsPage />} />
            <Route path="/sm-errors" element={<SmErrorsPage />} />
            <Route path="/sm-alerts" element={<SmAlertsPage />} />
            <Route path="/sm-db" element={<SmDbPage />} />
            <Route path="/sm-dr" element={<SmDrPage />} />
            <Route path="/cs-dashboard" element={<CsDashboardPage />} />
            <Route path="/cs-login" element={<CsLoginPage />} />
            <Route path="/cs-device" element={<CsDevicePage />} />
            <Route path="/cs-session" element={<CsSessionPage />} />
            <Route path="/cs-suspicious" element={<CsSuspiciousPage />} />
            <Route path="/cs-block" element={<CsBlockPage />} />
            <Route path="/cs-incident" element={<CsIncidentPage />} />
            <Route path="/cs-access" element={<CsAccessPage />} />
            <Route path="/ca-dividends" element={<Dividends />} />
            <Route path="/ca-bonus" element={<Bonus />} />
            <Route path="/ca-splits" element={<Splits />} />
            <Route path="/ca-buyback" element={<Buyback />} />
            <Route path="/ca-rights" element={<Rights />} />
            <Route path="/ca-merger" element={<Merger />} />
            <Route path="/int-exchange" element={<ExchangeIntegration />} />
            <Route path="/int-market-data" element={<MarketDataIntegration />} />
            <Route path="/int-payment" element={<PaymentIntegration />} />
            <Route path="/int-bank" element={<BankIntegration />} />
            <Route path="/int-kyc" element={<KycIntegration />} />
            <Route path="/int-comms" element={<CommsIntegration />} />
            <Route path="/int-api" element={<ApiIntegration />} />
            <Route path="/int-webhooks" element={<WebhooksIntegration />} />
            <Route path="/deposits" element={<DepositsPage />} />
            <Route path="/fund-transfers" element={<FundTransfersPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/failed-payments" element={<FailedPaymentsPage />} />
            <Route path="/refunds" element={<RefundsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
