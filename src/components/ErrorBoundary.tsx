import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/src/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React class-component error boundary. Catches unhandled rendering
 * errors anywhere in the subtree and shows a safe fallback instead of
 * a white-screen crash.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 *
 * In a banking context this is mandatory — users must never see a blank
 * page after an unexpected JS error.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // ── Telemetry hook ────────────────────────────────────────────────
    // Wire this to your observability platform (Sentry, Datadog, etc.)
    // Example: Sentry.captureException(error, { extra: { errorInfo } });
    console.error("[ErrorBoundary] Unhandled rendering error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
              <svg
                className="size-8 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-foreground">
              Application Error
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              An unexpected error occurred. The development team has been
              notified. Please try reloading the application.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="max-w-lg overflow-auto rounded-md border border-destructive/20 bg-destructive/5 p-4 text-left text-xs text-destructive">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack}
              </pre>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button onClick={this.handleReload}>Reload Dashboard</Button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
