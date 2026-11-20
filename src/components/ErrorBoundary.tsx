import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI crash:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong on this page</h2>
          <p style={{ marginBottom: 12, opacity: 0.7 }}>{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: '6px 14px', border: '1px solid currentColor', borderRadius: 6, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
