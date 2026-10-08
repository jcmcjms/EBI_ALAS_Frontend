import { z } from 'zod'
import { WarningCircle } from '@phosphor-icons/react'

import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'

export const productFormSchema = z
  .object({
    minAmount: z.coerce
      .number({ message: 'Min amount is required.' })
      .min(0, 'Min amount cannot be negative.'),
    maxAmount: z.coerce
      .number({ message: 'Max amount is required.' })
      .min(0, 'Max amount cannot be negative.'),

    minTermDays: z.coerce
      .number({ message: 'Min term is required.' })
      .int('Min term must be a whole number of days.')
      .min(0, 'Min term cannot be negative.'),
    maxTermDays: z.coerce
      .number({ message: 'Max term is required.' })
      .int('Max term must be a whole number of days.')
      .min(0, 'Max term cannot be negative.')
      .max(
        2617,
        'Max term cannot exceed 2617 days (7 years + 2 months grace period).',
      ),

    notarialFee: z.coerce
      .number({ message: 'Notarial fee is required.' })
      .min(0, 'Notarial fee cannot be negative.'),
    docStampFee: z.coerce
      .number({ message: 'Doc-stamp fee is required.' })
      .min(0, 'Doc-stamp fee cannot be negative.'),
    insuranceFee: z.coerce
      .number({ message: 'Insurance fee is required.' })
      .min(0, 'Insurance fee cannot be negative.'),

    advanceInterestRate: z.coerce
      .number({ message: 'Advance interest rate is required.' })
      .min(0, 'Advance interest rate cannot be negative.')
      .max(
        1,
        'Advance interest rate must be between 0 and 1 (e.g. 0.12 for 12% p.a.).',
      ),
  })
  .refine((v) => v.maxAmount >= v.minAmount, {
    message: 'Max amount must be greater than or equal to min amount.',
    path: ['maxAmount'],
  })
  .refine((v) => v.maxTermDays >= v.minTermDays, {
    message: 'Max term must be greater than or equal to min term.',
    path: ['maxTermDays'],
  })

export type ProductFormValues = z.infer<typeof productFormSchema>

export function emptyValues(): ProductFormValues {
  return {
    minAmount: 0,
    maxAmount: 0,
    minTermDays: 0,
    maxTermDays: 0,
    notarialFee: 0,
    docStampFee: 0,
    insuranceFee: 0,
    advanceInterestRate: 0,
  }
}

export function valuesFromProduct(p: LoanProductResponse): ProductFormValues {
  return {
    minAmount: p.minAmount,
    maxAmount: p.maxAmount,
    minTermDays: p.minTermDays,
    maxTermDays: p.maxTermDays,
    notarialFee: p.notarialFee,
    docStampFee: p.docStampFee,
    insuranceFee: p.insuranceFee,
    advanceInterestRate: p.advanceInterestRate,
  }
}

export function SectionHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="rounded-md border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground/80">
        {value}
      </div>
    </div>
  )
}

export function NumberField({
  id,
  label,
  error,
  hint,
  disabled,
  step,
  ...inputProps
}: {
  id: string
  label: string
  error?: string
  hint?: string
  disabled?: boolean
  step?: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step={step}
        disabled={disabled}
        className="h-9"
        aria-invalid={error ? true : undefined}
        {...inputProps}
      />
      {error ? (
        <p className="flex items-center gap-1 text-[11px] text-destructive">
          <WarningCircle size={11} weight="fill" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}