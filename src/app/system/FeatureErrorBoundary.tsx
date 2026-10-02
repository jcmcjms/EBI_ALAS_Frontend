import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/src/shared/ui/button'
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react'

interface Props {
  children: ReactNode
  featureName: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class FeatureErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(
        `[${this.props.featureName}] Feature error:`,
        error,
        errorInfo,
      )
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-card p-6 text-center shadow-xs"
          role="alert"
          aria-live="polite"
        >
          <div className="flex size-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
            <WarningCircle
              size={22}
              weight="duotone"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Unable to load {this.props.featureName}
            </p>
            <p className="max-w-xs text-xs text-muted-foreground">
              A temporary issue prevented this section from rendering properly.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-1.5"
            aria-label={`Retry loading ${this.props.featureName}`}
          >
            <ArrowClockwise size={14} weight="bold" aria-hidden="true" />
            Reload section
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

