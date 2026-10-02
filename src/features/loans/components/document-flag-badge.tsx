import { FileDashed, Hourglass } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/src/shared/ui/popover'

interface DocumentFlagDto {
  flaggedAt: string
  flaggedById: number | null
  reason: string | null
  missingCount: number
}

interface DocumentFlagBadgeProps {
  flag: DocumentFlagDto | null

  compact?: boolean
}

export function DocumentFlagBadge({ flag, compact }: DocumentFlagBadgeProps) {
  if (!flag) return null

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger
          render={
            <button type="button" className="inline-flex">
              <Badge
                variant="outline"
                className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 cursor-pointer"
              >
                <FileDashed size={12} weight="bold" />
                {flag.missingCount > 0 ? (
                  flag.missingCount
                ) : (
                  <Hourglass size={12} weight="bold" />
                )}
              </Badge>
            </button>
          }
        />
        <PopoverContent align="start" className="w-80 space-y-2 p-3 text-xs">
          <p className="font-medium">
            {flag.missingCount > 0
              ? `${flag.missingCount} document(s) flagged on ${new Date(flag.flaggedAt).toLocaleDateString()}`
              : `Flagged on ${new Date(flag.flaggedAt).toLocaleDateString()} — uploads verifying`}
          </p>
          {flag.reason && (
            <p className="text-muted-foreground">{flag.reason}</p>
          )}
          <p className="text-muted-foreground">
            This does not block the workflow. The flag clears when all documents
            are uploaded.
          </p>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button type="button" className="inline-flex">
            <Badge
              variant="outline"
              className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 cursor-pointer"
            >
              <FileDashed size={14} weight="bold" />
              {flag.missingCount > 0
                ? `${flag.missingCount} doc(s) flagged`
                : 'flagged — verifying'}
            </Badge>
          </button>
        }
      />
      <PopoverContent align="start" className="w-80 space-y-2 p-3 text-xs">
        <p className="font-medium">
          {flag.missingCount > 0
            ? `${flag.missingCount} document(s) flagged on ${new Date(flag.flaggedAt).toLocaleDateString()}`
            : `Flagged on ${new Date(flag.flaggedAt).toLocaleDateString()} — uploads verifying`}
        </p>
        {flag.reason && <p className="text-muted-foreground">{flag.reason}</p>}
        <p className="text-muted-foreground">
          This does not block the workflow. The flag clears automatically once
          all documents are uploaded.
        </p>
      </PopoverContent>
    </Popover>
  )
}
