import { memo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowArcLeft, FileX, WarningCircle } from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { formatRelativeTime } from '@/src/shared/lib/format'
import { actionRequiredTaskCount } from '../lib/action-required-count'
import type { IncompleteDocsQueueItem, PushBackItem } from '../types'

interface ActionRequiredProps {
  pushBacks: PushBackItem[]
  incompleteDocs: IncompleteDocsQueueItem[]
}

export const ActionRequired = memo(function ActionRequired({
  pushBacks,
  incompleteDocs,
}: ActionRequiredProps) {
  const navigate = useNavigate()
  const totalTasks = actionRequiredTaskCount(pushBacks, incompleteDocs)

  if (totalTasks === 0) return null

  const rows = [
    ...pushBacks.slice(0, 3).map((item) => ({
      key: `pb-${item.lamId}`,
      kind: 'pushback' as const,
      lamId: item.lamId,
      meta: `Returned for correction • ${formatRelativeTime(item.date)}`,
      onReview: () =>
        navigate({
          to: '/loans/revision/$loanId',
          params: { loanId: item.lamId },
        }),
    })),
    ...incompleteDocs.slice(0, 3).map((item) => ({
      key: `doc-${item.lamId}`,
      kind: 'docs' as const,
      lamId: item.lamId,
      meta: `Missing ${item.missingCount} document${item.missingCount === 1 ? '' : 's'} • ${formatRelativeTime(item.waitingSinceUtc)}`,
      onReview: () =>
        navigate({
          to: '/loans/approval/$loanId',
          params: { loanId: item.id },
        }),
    })),
  ].slice(0, 3)

  return (
    <Card className="border-l-4 border-l-destructive shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <WarningCircle
            size={20}
            weight="fill"
            className="text-destructive"
            aria-hidden
          />
          <CardTitle className="text-base font-semibold">
            Action Required
          </CardTitle>
        </div>
        <Badge variant="destructive" className="tabular-nums">
          {totalTasks} {totalTasks === 1 ? 'Task' : 'Tasks'}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  {row.kind === 'pushback' ? (
                    <ArrowArcLeft
                      size={16}
                      weight="bold"
                      className="text-destructive"
                      aria-hidden
                    />
                  ) : (
                    <FileX
                      size={16}
                      weight="bold"
                      className="text-destructive"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.lamId}</p>
                  <p className="text-xs text-muted-foreground">{row.meta}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={row.onReview}>
                Review
              </Button>
            </li>
          ))}
        </ul>
        {totalTasks > 3 && (
          <div className="border-t bg-muted/30 p-3 text-center">
            <Button
              variant="link"
              size="sm"
              onClick={() => navigate({ to: '/loans/monitoring' })}
            >
              View all {totalTasks} tasks
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
