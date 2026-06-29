import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-slate-500">
          <p className="text-sm font-medium text-rose-300">Something went wrong</p>
          <pre className="max-w-lg overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-400">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded border border-indigo-500/30 px-3 py-1 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/10"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
