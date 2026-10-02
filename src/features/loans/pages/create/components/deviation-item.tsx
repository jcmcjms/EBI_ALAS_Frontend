import { Checkbox } from '@/src/shared/ui/checkbox'
import { Label } from '@/src/shared/ui/label'
import type { DeviationReason } from '@/src/features/loans/schemas/schema'
import type { UseFormRegister, FieldPath } from 'react-hook-form'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

interface DeviationItemProps {
  reason: string
  loanNo: string
  path: string
  checked: boolean
  justificationError: string | undefined
  register: UseFormRegister<LoanApplicationFormData>
  onToggle: (reason: DeviationReason, checked: boolean) => void
}

export function DeviationItem({
  reason,
  loanNo,
  path,
  checked,
  justificationError,
  register,
  onToggle,
}: DeviationItemProps) {
  const id = `deviation-${loanNo}-${reason}`

  return (
    <div key={reason} className="space-y-2">
      <div className="flex items-start gap-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(c) =>
            onToggle(reason as DeviationReason, !!c)
          }
          className="mt-0.5"
        />
        <label
          htmlFor={id}
          className="text-sm leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          {reason}
        </label>
      </div>

      {checked && (
        <div
          key={`${reason}-justification`}
          className="ml-6 mt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <Label
            htmlFor={`${id}-justification`}
            className="text-xs text-muted-foreground"
          >
            Justification for &quot;{reason}&quot;
          </Label>
          <textarea
            id={`${id}-justification`}
            {...register(
              `${path}.deviationJustifications.${reason}` as FieldPath<LoanApplicationFormData>,
            )}
            placeholder='Explain why this deviation is allowed (e.g., "Borrower is 66 but has strong co-maker and collateral.").'
            rows={2}
            aria-invalid={!!justificationError}
            className={
              'w-full rounded-md border bg-transparent px-3 py-2 text-sm ' +
              'placeholder:text-muted-foreground focus-visible:border-ring ' +
              'focus-visible:ring-1 focus-visible:ring-ring/50 outline-none resize-y ' +
              (justificationError
                ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50'
                : 'border-input')
            }
          />
          {justificationError && (
            <p role="alert" className="text-xs text-destructive font-medium">
              {justificationError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}