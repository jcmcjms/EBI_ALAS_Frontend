import { useFormContext, useWatch } from 'react-hook-form'
import { CalendarBlank } from '@phosphor-icons/react'

import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import { cn } from '@/src/shared/lib/utils'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { toAnnualRatePercent } from '@/src/features/loans/model/loan-approval-utils'

interface LoanParametersFieldsProps {
  fieldPrefix: string
  loanIndex: number
}

export function LoanParametersFields({
  fieldPrefix,
  loanIndex,
}: LoanParametersFieldsProps) {
  const { register } = useFormContext()
  const {
    formState: { errors },
  } = useFormContext<LoanApplicationFormData>()
  const nthpError = errors.loans?.[loanIndex]?.parameters?.nthpDate?.message

  const productPath = `${fieldPrefix}.product` as const
  const proposedAmountPath = `${fieldPrefix}.proposedAmount` as const
  const purposePath = `${fieldPrefix}.purpose` as const
  const termPath = `${fieldPrefix}.term` as const
  const policyTermMonthsPath = `${fieldPrefix}.policyTermMonths` as const
  const interestRatePath = `${fieldPrefix}.interestRate` as const
  const nthpDatePath = `${fieldPrefix}.nthpDate` as const
  const interestRate = useWatch({ name: interestRatePath }) as number | undefined

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Loan Product</Label>
          <Input
            {...register(productPath)}
            placeholder="e.g. Salary Loan, Multi-Purpose Loan"
            readOnly
            className="h-9 bg-muted/50"
          />
        </div>

        <div className="space-y-1.5 md:col-span-3">
          <Label className="text-xs text-muted-foreground">
            Purpose of Loan
          </Label>
          <Input
            {...register(purposePath)}
            placeholder="e.g. Home renovation, tuition fees, debt consolidation"
            readOnly
            className="h-9 bg-muted/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Proposed Amount (₱)
          </Label>
          <Input
            {...register(proposedAmountPath, { valueAsNumber: true })}
            type="number"
            placeholder="0.00"
            min={0}
            readOnly
            className="h-9 font-semibold bg-muted/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarBlank size={12} weight="bold" /> Term (days)
          </Label>
          <Input
            {...register(termPath, { valueAsNumber: true })}
            type="number"
            placeholder="e.g. 720"
            min={1}
            max={2617}
            readOnly
            className="h-9 bg-muted/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarBlank size={12} weight="bold" /> Policy Term (months)
          </Label>
          <Input
            {...register(policyTermMonthsPath, { valueAsNumber: true })}
            type="number"
            placeholder="e.g. 12"
            min={1}
            readOnly
            className="h-9 bg-muted/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Interest Rate (% p.a.)
          </Label>
          <Input
            value={toAnnualRatePercent(interestRate)}
            type="number"
            step="0.1"
            placeholder="1.5"
            min={0}
            max={100}
            readOnly
            className="h-9 bg-muted/50"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">NTHP Date</Label>
          <Input
            {...register(nthpDatePath)}
            type="text"
            placeholder="yyyy-mm-dd"
            readOnly
            aria-invalid={!!nthpError}
            className={cn(
              'h-9 bg-muted/50 tabular-nums',
              nthpError && 'border-destructive focus-visible:ring-destructive',
            )}
          />
          {nthpError ? (
            <p className="text-xs font-medium text-destructive">{nthpError}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
