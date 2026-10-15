import type { ReactNode } from 'react'
import { cn } from '@/src/shared/lib/utils'

export function CompactEmpty({
  message,
  action,
  className,
}: {
  message: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <p>{message}</p>
      {action}
    </div>
  )
}
