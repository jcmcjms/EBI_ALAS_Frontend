import type { ComponentType, ReactNode } from 'react'
import {
  ArrowClockwise,
  Tray,
  WarningCircle,
} from '@phosphor-icons/react'
import { Button } from './button'
import { cn } from '@/src/shared/lib/utils'

interface EmptyStateProps {
  title: string
  hint?: string
  action?: ReactNode
  className?: string
  icon?: ComponentType<{
    size?: number
    weight?: 'bold' | 'duotone' | 'regular' | 'fill'
    className?: string
  }>
}

export function EmptyState({
  title,
  hint,
  action,
  className,
  icon: Icon = Tray,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3.5 py-12 px-4 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground shadow-2xs">
        <Icon size={24} weight="duotone" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </p>
        {hint && (
          <p className="mx-auto max-w-[360px] text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3.5 py-12 px-4 text-center',
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive shadow-2xs">
        <WarningCircle
          size={24}
          weight="duotone"
          aria-hidden="true"
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Unable to Load Data
        </p>
        <p className="mx-auto max-w-[360px] text-xs leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 mt-1"
        onClick={onRetry}
      >
        <ArrowClockwise size={14} weight="bold" />
        Try again
      </Button>
    </div>
  )
}

