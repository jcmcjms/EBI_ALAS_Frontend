import { FileDashed } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/shared/ui/data-display/popover'
import { countNoun, formatLoanDate } from '@/src/shared/lib/format'

interface DocumentFlagDto {
  flaggedAt: string
  flaggedById: number | string | null
  reason: string | null
  missingCount: number
}

interface DocumentFlagBadgeProps {
  flag: DocumentFlagDto | null

  compact?: boolean
}

export function DocumentFlagBadge({ flag, compact }: DocumentFlagBadgeProps) {
  if (!flag) return null

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex cursor-pointer"
            aria-label={`Flagged ${countNoun(flag.missingCount, 'document')} as missing. See details.`}
          >
            <Badge
              variant="outline"
              className="gap-1 border-warning-border bg-warning-surface text-warning"
            >
              <FileDashed size={compact ? 12 : 14} weight="bold" aria-hidden />
              {compact
                ? flag.missingCount
                : countNoun(flag.missingCount, 'document')}
            </Badge>
          </button>
        }
      />
      <PopoverContent align="start" className="w-80 space-y-2 p-3 text-xs">
        <p className="font-medium">
          {countNoun(flag.missingCount, 'document')} flagged on{' '}
          {formatLoanDate(flag.flaggedAt)}
        </p>
        {flag.reason && <p className="text-muted-foreground">{flag.reason}</p>}
        <p className="text-muted-foreground">
          Review can continue. The flag stays until the flagger, the encoder or
          an admin clears it.
        </p>
      </PopoverContent>
    </Popover>
  )
}
