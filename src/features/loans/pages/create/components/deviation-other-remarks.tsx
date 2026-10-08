import { Controller, type Control, type FieldPath } from 'react-hook-form'
import { Label } from '@/src/shared/ui/primitives/label'
import { RichTextEditor } from '@/src/shared/ui/data-display/rich-text-editor'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

interface DeviationOtherRemarksProps {
  path: string
  loanIndex: number
  control: Control<LoanApplicationFormData>
  otherRemarksError: string | undefined
}

export function DeviationOtherRemarks({
  path,
  loanIndex,
  control,
  otherRemarksError,
}: DeviationOtherRemarksProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Other Remarks</Label>
        {otherRemarksError && (
          <span className="text-xs text-destructive font-medium">
            {otherRemarksError}
          </span>
        )}
      </div>
      <Controller
        control={control}
        name={`${path}.otherRemarks` as FieldPath<LoanApplicationFormData>}
        render={({ field }) => (
          <RichTextEditor
            value={field.value as string}
            onChange={field.onChange}
            onBlur={field.onBlur}
            invalid={!!otherRemarksError}
            ariaLabel={`Other remarks for loan ${loanIndex + 1}`}
            placeholder="Any other notes or special instructions for this application..."
          />
        )}
      />
    </div>
  )
}