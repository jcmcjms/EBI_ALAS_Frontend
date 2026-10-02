import {
  ArrowCounterClockwise,
  WarningCircle,
} from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import { cn } from '@/src/shared/lib/utils'

interface CisClientCardProps {
  initials: string
  fullName: string
  cisId: string
  agency?: string
  position?: string
  employeeId?: string
  confirmClear: boolean
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
  onChangeClient,
}: CisClientCardProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {fullName || '—'}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {[
            agency,
            position,
            employeeId && `ID ${employeeId}`,
          ]
            .filter(Boolean)
            .join(' • ') || 'No agency details on file'}
        </p>
      </div>
      <Badge variant="outline" className="tabular-nums">
        CIS {cisId}
      </Badge>
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