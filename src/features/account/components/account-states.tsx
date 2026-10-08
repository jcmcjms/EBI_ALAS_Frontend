export { EmptyState, ErrorState } from '@/src/shared/ui/feedback/empty-state'

import { Spinner } from '@/src/shared/ui/feedback/spinner'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
    >
      <Spinner className="h-4 w-4" />
      <span>{label}</span>
    </div>
  )
}
