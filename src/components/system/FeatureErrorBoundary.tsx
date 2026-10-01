import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/src/components/ui/button'
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
          className="flex flex-col items-center justify-center gap-4 p-8 text-center"
          role="alert"
          aria-live="polite"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <WarningCircle
              size={24}
              weight="duotone"
              className="text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Unable to load {this.props.featureName}
            </p>
            <p className="text-xs text-muted-foreground">
              An unexpected error occurred. Please try again.
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
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
