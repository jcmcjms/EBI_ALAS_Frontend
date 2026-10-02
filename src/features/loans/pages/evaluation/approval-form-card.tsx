import { useState } from 'react'
import { FilePdf, Printer, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/shared/ui/card'
import { Button } from '@/src/shared/ui/button'
import { ApprovalFormDocument } from '../approval/components/approval-form-document'
import { ApprovalFormViewport } from '@/src/features/loans/components/approval-form-sheet'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import type { SignatureSlotDto } from '@/src/features/loans/api/signatures'

interface ApprovalFormCardProps {
  formData: LoanApplicationFormData
  catLoanClass: string | null
  signatureSlots?: SignatureSlotDto[]
}

export function ApprovalFormCard({
  formData,
  catLoanClass,
  signatureSlots,
}: ApprovalFormCardProps) {
  const [zoom, setZoom] = useState(1)

  return (
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
              setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2)))
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
              setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))
            }
          >
            <MagnifyingGlassPlus size={15} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-2 gap-1.5"
            onClick={() => window.print()}
          >
            <Printer size={14} weight="bold" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ApprovalFormViewport zoom={zoom}>
          <ApprovalFormDocument
            data={formData}
            catLoanClass={catLoanClass}
            signatureSlots={signatureSlots}
          />
        </ApprovalFormViewport>
      </CardContent>
    </Card>
  )
}