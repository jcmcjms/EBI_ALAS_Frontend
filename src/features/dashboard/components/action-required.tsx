import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { formatRelativeTime } from '@/src/shared/lib/format'
import type { ActionRequiredItem, ActionRequiredKind } from '../types'
import { CompactEmpty } from './compact-empty'

const KIND_LABEL: Record<ActionRequiredKind, string> = {
  Returned: 'Returned',
  FlaggedDocuments: 'Missing documents',
  AwaitingMyAction: 'Awaiting your action',
}

interface ActionRequiredProps {
  items: ActionRequiredItem[]
  onReview: (lamId: string, kind: ActionRequiredKind) => void
}

export function ActionRequired({ items, onReview }: ActionRequiredProps) {
  return (
    <Card id="action-required" className="scroll-mt-24">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Action Required</CardTitle>
        {items.length > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {items.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <CompactEmpty message="Nothing needs attention" />
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={`${item.kind}-${item.lamId}`}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.lamId}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {KIND_LABEL[item.kind]} · {item.reason}
                  </p>
                </div>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={item.occurredAt}
                  title={new Date(item.occurredAt).toLocaleString('en-PH')}
                >
                  {formatRelativeTime(item.occurredAt)}
                </time>
                {item.canAct && (
                  <Button
                    size="sm"
                    onClick={() => onReview(item.lamId, item.kind)}
                  >
                    Review
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
