import { useState } from 'react'
import {
  ArrowsOut,
  FilePdf,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Printer,
  X,
} from '@phosphor-icons/react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Button } from '@/src/shared/ui/primitives/button'
import { ApprovalFormDocument } from './components/approval-form-document'
import { ApprovalFormViewport } from '@/src/features/loans/components/approval-form-sheet'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import type { SignatureDisplaySlot } from '@/src/features/loans/api/signatures'
import type { LoanDeviationDto, DocumentRemarkDto } from '@/src/features/loans/api/loan-review'
import type { ApprovalFormActionEntry } from './components/approval-form-document'

interface ApprovalFormCardProps {
  formData: LoanApplicationFormData
  loanId?: number | string
  
  lamId?: string
  signatureSlots?: SignatureDisplaySlot[]
  actions?: ApprovalFormActionEntry[]
  deviationsData?: LoanDeviationDto[]
  documentRemarksData?: DocumentRemarkDto[]
  zoom: number
  onZoomChange: (zoom: number) => void
}

export function ApprovalFormCard({
  formData,
  loanId,
  lamId,
  signatureSlots,
  actions,
  deviationsData,
  documentRemarksData,
  zoom,
  onZoomChange,
}: ApprovalFormCardProps) {
  const [isFullScreen, setIsFullScreen] = useState(false)

  const previewContent = (
    <ApprovalFormViewport zoom={zoom}>
      <ApprovalFormDocument
        data={formData}
        loanId={loanId}
        lamId={lamId}
        catLoanClass={null}
        signatureSlots={signatureSlots ?? undefined}
        actions={actions}
        deviations={deviationsData}
        documentRemarks={documentRemarksData}
        lamIdByLoanNo={
          formData.loans?.[0]?.loanNo && lamId
            ? { [formData.loans[0].loanNo]: lamId }
            : undefined
        }
      />
    </ApprovalFormViewport>
  )

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <header className="flex items-center justify-between border-b bg-muted/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <FilePdf size={20} weight="bold" className="text-primary" />
            <h2 className="text-lg font-semibold">Approval Form Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer size={14} weight="bold" /> Print
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullScreen(false)}
              aria-label="Close full screen"
            >
              <X size={20} weight="bold" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/40 p-6">{previewContent}</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between border-b bg-muted/30 p-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FilePdf size={20} weight="bold" className="text-primary" />
            Approval Form Document
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Zoom out"
              onClick={() =>
                onZoomChange(Math.max(0.6, +(zoom - 0.1).toFixed(2)))
              }
            >
              <MagnifyingGlassMinus size={15} />
            </Button>
            <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Zoom in"
              onClick={() =>
                onZoomChange(Math.min(1.5, +(zoom + 0.1).toFixed(2)))
              }
            >
              <MagnifyingGlassPlus size={15} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-2 gap-1.5"
              onClick={() => setIsFullScreen(true)}
            >
              <ArrowsOut size={14} weight="bold" /> Full Screen
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer size={14} weight="bold" /> Print
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">{previewContent}</CardContent>
      </Card>
    </div>
  )
}