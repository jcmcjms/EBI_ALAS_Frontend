import {
  ArrowCounterClockwise,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { cn } from '@/src/shared/lib/utils'

interface CisClientCardProps {
  initials: string
  fullName: string
  cisId: string
  agency?: string
  position?: string
  employeeId?: string
  confirmClear: boolean
  confirmed: boolean
  onConfirmClient: () => void
  onChangeClient: () => void
}

export function CisClientCard({
  initials,
  fullName,
  cisId,
  agency,
  position,
  employeeId,
  confirmClear,
  confirmed,
  onConfirmClient,
  onChangeClient,
}: CisClientCardProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {fullName || '—'}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {agency ? <span className="min-w-0 truncate">{agency}</span> : null}
          {position ? <span className="min-w-0 truncate">{position}</span> : null}
          {employeeId ? (
            <span className="shrink-0 tabular-nums">ID {employeeId}</span>
          ) : null}
          {!agency && !position && !employeeId ? (
            <span>No agency details on file</span>
          ) : null}
        </p>
      </div>
      <Badge variant="outline" className="tabular-nums">
        CIS {cisId}
      </Badge>
      {confirmed ? (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
        >
          <CheckCircle size={12} weight="bold" />
          Client confirmed
        </Badge>
      ) : (
        <Button type="button" size="sm" onClick={onConfirmClient}>
          Confirm Client
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onChangeClient}
        className={cn(
          'gap-1.5',
          confirmClear && 'text-destructive hover:text-destructive',
        )}
      >
        {confirmClear ? (
          <>
            <WarningCircle size={14} weight="fill" />
            Confirm — clears entered data
          </>
        ) : (
          <>
            <ArrowCounterClockwise size={14} weight="bold" />
            Change client
          </>
        )}
      </Button>
    </div>
  )
}
