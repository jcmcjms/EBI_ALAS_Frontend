import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/src/shared/ui/navigation/sheet'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { ApplicationTimeline } from '@/src/features/loans/components/application-timeline'
import { DocumentFlagBadge } from '@/src/features/loans/components/document-flag-badge'
import { queueDeskSentence } from '@/src/features/loans/model/loan-timeline'
import { cn } from '@/src/shared/lib/utils'
import { getLoanById } from '@/src/features/loans/api/loans'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'
import type { LoanMonitoringRecord } from '@/src/features/loans/types/monitoring'
import { useEntityViewers } from '@/src/shared/lib/signalr/use-presence'
import { useAuthStore } from '@/src/shared/store/auth-store'

interface LoanDetailsDrawerProps {
  applicationId: string | null
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
  const userRole = useAuthStore((s) => s.user?.role ?? '')
  useEntityViewers('LoanApplication', applicationId)

  const detail = useQuery({
    queryKey: ['loan-detail', applicationId],
    queryFn: () => getLoanById(applicationId!),
    enabled: applicationId !== null,
    staleTime: 30_000,
  })

  const loanStatus = detail.data?.status ?? record?.status ?? ''
  const isEncoderRevision =
    userRole === 'Encoder' && loanStatus === 'ForRevision'

  const reviewPath = isEncoderRevision
    ? `/loans/revision/${applicationId}`
    : `/loans/approval/${applicationId}`

  const reviewLabel = isEncoderRevision ? 'Edit application' : 'Review application'

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
                  {detail.data.clientName}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[11px] font-normal',
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
            {record?.documentFlag && (
              <DocumentFlagBadge flag={record.documentFlag} />
            )}
          </SheetDescription>
        </SheetHeader>

        {}
        {deskSentence && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground mx-6 mt-3">
            <p>{deskSentence}</p>
            {record?.queuePosition != null && (
              <p className="mt-1 tabular-nums">
                Queue position {record.queuePosition} of {record.queueLength}.
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {applicationId !== null ? (
            <>
              <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
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
              className="w-full"
              onClick={() => navigate({ href: reviewPath })}
            >
              {reviewLabel}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
