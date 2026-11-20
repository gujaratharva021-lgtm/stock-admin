import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

export default function Settlement() {
  return (
    <div>
      <PageHeader title="Settlement" subtitle="Settlement obligations and pay-in / pay-out" />
      <div className="p-6 space-y-6">
        <div className="bg-surface border border-border rounded-md px-6 py-8 text-center space-y-3">
          <p className="text-sm text-ink font-medium">Settlement batch history is not available yet.</p>
          <p className="text-sm text-muted">
            Settlement batches and run history are not stored. Pay-in, pay-out and obligations are shown under Clearing, on the Pay-In, Pay-Out and Obligation pages.
          </p>
          <p className="text-sm text-muted">
            Unsettled T+1 positions are already listed under{' '}
            <Link to="/portfolio" className="text-brand-dark underline">
              Portfolio / Positions
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}