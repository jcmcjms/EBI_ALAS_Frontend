import { Receipt } from '@phosphor-icons/react'
import { Label } from '@/src/shared/ui/primitives/label'
import type { UseFormRegister, FieldPath } from 'react-hook-form'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

interface FeeDeviationJustificationProps {
  path: string
  feeJustificationError: string | undefined
  register: UseFormRegister<LoanApplicationFormData>
}

export function FeeDeviationJustification({
  path,
  feeJustificationError,
  register,
}: FeeDeviationJustificationProps) {
  return (
    <div className="rounded-md border border-red-500/30 bg-red-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-red-700">
        <Receipt size={14} weight="fill" />
        <span className="font-medium">
          Fee override detected (Major). Justification required.
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Fee Deviation Justification
          </Label>
          {feeJustificationError && (
            <span className="text-xs font-medium text-destructive">
              {feeJustificationError}
            </span>
          )}
        </div>
        <textarea
          {...register(
            `${path}.feeDeviationJustification` as FieldPath<LoanApplicationFormData>,
          )}
          placeholder="Why does the actual fee differ from the bank's standard rate? (e.g. 'Notary charged ₱750 because the loan documents were 4 pages instead of the usual 2.')"
          rows={3}
          aria-invalid={!!feeJustificationError}
          className={
            'w-full rounded-md border bg-transparent px-3 py-2 text-sm ' +
            'placeholder:text-muted-foreground focus-visible:border-ring ' +
            'focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y ' +
            (feeJustificationError
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50'
              : 'border-input')
          }
        />
      </div>
    </div>
  )
}