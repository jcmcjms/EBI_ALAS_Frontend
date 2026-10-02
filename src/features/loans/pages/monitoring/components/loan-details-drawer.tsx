import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from '@phosphor-icons/react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/src/components/ui/sheet'
import { Badge } from '@/src/components/ui/badge'
import { Button } from '@/src/components/ui/button'
import { ApplicationTimeline } from '@/src/features/loans/components/application-timeline'
import { DocumentFlagBadge } from '@/src/features/loans/components/document-flag-badge'
import { queueDeskSentence } from '@/src/features/loans/utils/loan-timeline'
import { cn } from '@/src/shared/lib/utils'
import { getLoanById } from '@/src/features/loans/api/loans'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/utils/loan-status'
import type { LoanMonitoringRecord } from '@/src/features/loans/types/monitoring'
import { useEntityViewers } from '@/src/shared/lib/signalr/use-presence'

interface LoanDetailsDrawerProps {
  applicationId: number | null
  onClose: () => void

  record?: LoanMonitoringRecord | null
}

export function LoanDetailsDrawer({
  applicationId,
  onClose,
  record,
}: LoanDetailsDrawerProps) {
  const isOpen = applicationId !== null
  const navigate = useNavigate()
  useEntityViewers('LoanApplication', applicationId)

  const detail = useQuery({
    queryKey: ['loan-detail', applicationId],
    queryFn: () => getLoanById(applicationId!),
    enabled: applicationId !== null && applicationId > 0,
    staleTime: 30_000,
  })

  const deskSentence = queueDeskSentence(
    record?.queueStage,
    record?.queueOwnerName,
  )

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[420px] p-0 flex flex-col overflow-hidden">
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <SheetTitle className="text-base font-semibold tracking-tight">
            {detail.data?.lamId ?? `Loan #${applicationId ?? '\u2014'}`}
          </SheetTitle>
          <SheetDescription className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {detail.data ? (
              <>
                <span className="truncate font-medium text-foreground">
                  {detail.data.firstName}{' '}
                  {detail.data.middleName
                    ? `${detail.data.middleName[0]}. `
                    : ''}
                  {detail.data.lastName}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-normal',
                    LOAN_STATUS_META[detail.data.status as LoanStatus]
                      ?.className,
                  )}
                >
                  {LOAN_STATUS_META[detail.data.status as LoanStatus]?.label ??
                    detail.data.status}
                </Badge>
              </>
            ) : (
              'Select an application to view its details.'
            )}
            {}
            {(detail.data?.documentFlag ?? record?.documentFlag) && (
              <DocumentFlagBadge
                flag={detail.data?.documentFlag ?? record?.documentFlag ?? null}
              />
            )}
          </SheetDescription>
        </SheetHeader>

        {}
        {deskSentence && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground mx-6 mt-3">
            <p className="flex items-center gap-2">
              <span
                className="size-2 rounded-full bg-emerald-500"
                aria-hidden
              />
              {deskSentence}
            </p>
            {record?.queuePosition != null && (
              <p className="mt-1 pl-4 tabular-nums">
                Queue position {record.queuePosition} of {record.queueLength}.
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {applicationId !== null ? (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Application history
              </h3>
              <ApplicationTimeline loanId={applicationId} variant="inline" />
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              Select an application to view its history.
            </div>
          )}
        </div>

        {applicationId && (
          <div className="border-t bg-background p-4">
            <Button
              className="w-full gap-2"
              onClick={() => navigate(`/loans/approval/${applicationId}`)}
            >
              <ArrowRight size={16} weight="bold" />
              Review application
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
