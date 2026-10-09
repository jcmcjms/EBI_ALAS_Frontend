import { useNavigate } from '@tanstack/react-router'
import { format } from 'date-fns'
import { ClipboardText, ArrowRight } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/data-display/table'
import { useAccountLoans } from '../hooks/use-account'
import { EmptyState, ErrorState, LoadingState } from './account-states'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { LOAN_STATUS_META, type LoanStatus } from '@/src/shared/lib/api/types'
import { cn } from '@/src/shared/lib/utils'

export function MyApplicationsTab() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAccountLoans(200)
  const user = useAuthStore((s) => s.user)
  const canCreate = user?.role === 'Encoder' || user?.role === 'Admin'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-3">
        <CardTitle className="text-sm">My Loan Applications</CardTitle>
        {canCreate && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={() => navigate({ to: '/loans/create' })}
          >
            New Application
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingState label="Loading applications…" />
        ) : isError ? (
          <ErrorState
            message="Failed to load your loan applications."
            onRetry={() => refetch()}
          />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={ClipboardText}
            title="No loan applications found"
            hint="Applications you create will appear here along with their latest approval status."
            action={
              canCreate ? (
                <Button
                  size="sm"
                  onClick={() => navigate({ to: '/loans/create' })}
                  className="gap-2"
                >
                  Create Application
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate({ to: '/loans/monitoring' })}
                >
                  View Loan Monitoring
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>LAM ID</TableHead>
                <TableHead>Borrower</TableHead>
                <TableHead>Proposed Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((app) => {
                const meta = LOAN_STATUS_META[app.status as LoanStatus]
                const amountFormatted =
                  typeof app.proposedAmount === 'number'
                    ? new Intl.NumberFormat('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                        maximumFractionDigits: 0,
                      }).format(app.proposedAmount)
                    : '—'

                return (
                  <TableRow
                    key={app.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs font-semibold">
                      {app.lamId || `#${app.id}`}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {app.clientName}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">
                      {amountFormatted}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs font-normal',
                          meta?.className ?? 'bg-muted text-muted-foreground',
                        )}
                      >
                        {meta?.label ?? app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {app.applicationDate
                        ? format(new Date(app.applicationDate), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs hover:text-primary"
                        onClick={() => navigate({ to: '/loans/monitoring', search: { id: String(app.id) } })}
                      >
                        Details
                        <ArrowRight size={13} weight="bold" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

