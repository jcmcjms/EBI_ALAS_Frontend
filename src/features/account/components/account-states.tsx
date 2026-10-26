export { EmptyState, ErrorState } from '@/src/shared/ui/feedback/empty-state'

import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { Skeleton } from '@/src/shared/ui/feedback/skeleton'

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

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading profile"
      className="flex w-full flex-col items-center pt-2"
    >
      <Skeleton className="size-24 rounded-full" />
      <Skeleton className="mt-4 h-5 w-40" />
      <Skeleton className="mt-2 h-3.5 w-28" />
      <div className="mt-6 grid w-full grid-cols-3 divide-x rounded-md border bg-muted/30">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 px-2 py-3">
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
      <div className="mt-6 w-full space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4 shrink-0" />
            <Skeleton className="h-3.5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}
