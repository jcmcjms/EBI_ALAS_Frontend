import {
  ArrowCounterClockwise,
  ListChecks,
} from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import { AttachmentsPanel } from './components/attachments-panel'

interface DocumentsTabContentProps {
  loanId: number
  frozen: boolean
  canWriteRemarks: boolean
  canPushBack: boolean
  pushBackPending: boolean
  onPushBack: (codes: string[], text: string) => void
  recheckPending: boolean
  onRecheck: () => void
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
}: DocumentsTabContentProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks
              size={18}
              weight="bold"
              className="text-primary"
            />
            Document Requirements
          </CardTitle>
          <CardDescription className="pt-1 text-xs">
            Checklist of required documents. Missing documents do
            not block review — a reviewer may flag the file or
            proceed to approval.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onRecheck}
          disabled={recheckPending}
          title="Re-verify document completeness"
        >
          <ArrowCounterClockwise size={14} weight="bold" />
          Re-check documents
        </Button>
      </CardHeader>
      <CardContent className="pt-4">
        <AttachmentsPanel
          loanId={loanId}
          frozen={frozen}
          canRemark={canWriteRemarks}
          canPushBack={canPushBack}
          pushBackPending={pushBackPending}
          onPushBack={onPushBack}
        />
      </CardContent>
    </Card>
  )
}