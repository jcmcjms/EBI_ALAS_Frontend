import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/src/shared/ui/button'
import { WarningOctagon, ArrowClockwise, House } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(
        '[ErrorBoundary] Unhandled rendering error:',
        error,
        errorInfo,
      )
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6 text-center">
            <div className="w-full max-w-md space-y-6 rounded-xl border bg-card p-8 shadow-sm">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <WarningOctagon size={32} weight="duotone" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Application Encountered an Error
                </h2>
                <p className="text-sm text-muted-foreground">
                  An unexpected problem occurred while rendering this section.
                  You can try refreshing the view or returning to the dashboard.
                </p>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-left">
                  <p className="font-mono text-xs font-semibold text-destructive">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-destructive/80 font-mono">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReset}
                  className="gap-2"
                >
                  <ArrowClockwise size={16} weight="bold" />
                  Try Again
                </Button>
                <Button
                  size="sm"
                  onClick={this.handleReload}
                  className="gap-2"
                >
                  <House size={16} weight="bold" />
                  Reload Page
                </Button>
              </div>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              ALAS &bull; Enterprise Bank Inc. Loan Application System
            </p>
          </div>
        )
      )
    }

    return this.props.children
  }
}

