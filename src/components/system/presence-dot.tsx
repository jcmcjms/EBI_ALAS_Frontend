import { cn } from '@/src/shared/lib/utils'
import { useUserPresence } from '@/src/shared/lib/signalr/use-presence'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/src/shared/ui/tooltip'

export function PresenceDot({
  userId,
  className,
}: {
  userId?: number | null
  className?: string
}) {
  const p = useUserPresence(userId)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={p ? 'Online' : 'Offline'}
          className={cn('relative inline-flex size-2', className)}
        >
          {p && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
          )}
          <span
            className={cn(
              'relative inline-flex size-2 rounded-full',
              p ? 'bg-emerald-500' : 'bg-muted-foreground/40',
            )}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {p
          ? `Online${p.connections > 1 ? ` \u2014 ${p.connections} sessions` : ''}`
          : 'Offline'}
      </TooltipContent>
    </Tooltip>
  )
}
