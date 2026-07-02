import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-8">
          <div className="max-w-lg rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
            <p className="mb-2 text-lg font-semibold text-rose-300">Algo deu errado</p>
            <pre className="mb-4 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-black/30 p-3 text-left text-xs text-rose-200 font-mono">
              {this.state.error?.message || 'Erro desconhecido'}
              {'\n\n'}
              {this.state.error?.stack?.split('\n').slice(0, 8).join('\n') || ''}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-rose-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
