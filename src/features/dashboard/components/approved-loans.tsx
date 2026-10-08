import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Avatar, AvatarFallback } from '@/src/shared/ui/data-display/avatar'
import {
  formatRelativeTime,
  initialsOf,
} from '@/src/shared/lib/format'
import type { ApprovedLoanItem } from '../types'

interface ApprovedLoansProps {
  data: ApprovedLoanItem[]
}

export function ApprovedLoans({ data }: ApprovedLoansProps) {
  const navigate = useNavigate()
  const displayData = useMemo(() => data.slice(0, 5), [data])

  return (
    <Card id="approved-loans" className="scroll-mt-24 flex flex-col">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-xl">
          Approved Loans
          {data.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {data.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        {data.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No approvals yet today.
          </p>
        ) : (
          <ul className="divide-y">
            {displayData.map((item) => (
              <li
                key={item.lamId}
                onClick={() => navigate({ to: '/loans/monitoring' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate({ to: '/loans/monitoring' })
                  }
                }}
                tabIndex={0}
                role="link"
                className="flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <Avatar size="sm" className="border">
                  <AvatarFallback>{initialsOf(item.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.lamId}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {item.branch}
                  </span>
                  <p
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
                    title={new Date(item.date).toLocaleString('en-PH')}
                  >
                    {formatRelativeTime(item.date)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {data.length > 5 && (
        <CardFooter className="border-t p-3 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: '/loans/monitoring' })}
            className="w-full text-sm"
          >
            View all approved loans
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
