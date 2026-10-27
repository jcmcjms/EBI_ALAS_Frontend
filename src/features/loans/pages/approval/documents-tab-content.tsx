import { ArrowClockwise, ListChecks } from '@phosphor-icons/react'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { AttachmentsPanel } from './components/attachments-panel'

interface DocumentsTabContentProps {
  loanId: number | string
  frozen: boolean
  canWriteRemarks: boolean
  canPushBack: boolean
  pushBackPending: boolean
  onPushBack: (codes: string[], text: string) => void
  recheckPending: boolean
  onRecheck: () => void
  focusDocCode?: string | null
}

export function DocumentsTabContent({
  loanId,
  frozen,
  canWriteRemarks,
  canPushBack,
  pushBackPending,
  onPushBack,
  recheckPending,
  onRecheck,
  focusDocCode,
}: DocumentsTabContentProps) {
  return (
    <Card id="document-requirements">
      <CardHeader className="border-b pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks
            size={18}
            weight="bold"
            className="text-muted-foreground"
            aria-hidden
          />
          Files
        </CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onRecheck}
            disabled={recheckPending}
          >
            {recheckPending ? (
              <Spinner className="size-3.5" aria-hidden />
            ) : (
              <ArrowClockwise size={14} weight="bold" aria-hidden />
            )}
            Refresh
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <AttachmentsPanel
          loanId={loanId}
          frozen={frozen}
          canRemark={canWriteRemarks}
          canPushBack={canPushBack}
          pushBackPending={pushBackPending}
          onPushBack={onPushBack}
          focusDocCode={focusDocCode}
        />
      </CardContent>
    </Card>
  )
}
