import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  CheckCircle,
  Database,
  PencilSimple,
  WarningCircle,
} from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/card'
import { Separator } from '@/src/shared/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/src/shared/ui/sheet'
import { Spinner } from '@/src/shared/ui/spinner'
import type { LoanProductResponse } from '@/src/shared/lib/api/types'
import {
  productFormSchema,
  type ProductFormValues,
  emptyValues,
  valuesFromProduct,
  SectionHeading,
  ReadOnlyField,
  NumberField,
} from './product-form-fields'

interface ProductEditSheetProps {
  product: LoanProductResponse | null
  canEdit: boolean
  onClose: () => void
  onSave: (productCode: string, values: ProductFormValues) => Promise<boolean>
  isSaving?: boolean
}

export function ProductEditSheet({
  product,
  canEdit,
  onClose,
  onSave,
  isSaving = false,
}: ProductEditSheetProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    mode: 'onBlur',
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (product) {
      reset(valuesFromProduct(product), { keepDirty: false })
    }
  }, [product, reset])

  const watchedRate = useWatch({ control, name: 'advanceInterestRate' })

  const submit = handleSubmit(async (values) => {
    if (!product) return
    const ok = await onSave(product.code, values)
    if (ok) onClose()
  })

  const lastSyncedDisplay = useMemo(() => {
    if (!product) return '—'
    const d = new Date(product.lastSyncedAt)
    if (Number.isNaN(d.getTime())) return product.lastSyncedAt
    return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [product])

  return (
    <Sheet open={!!product} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col p-0 sm:max-w-[640px]"
      >
        <SheetHeader className="border-b bg-muted/30 p-6 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2">
                <PencilSimple size={16} weight="bold" />
                Edit Loan Product
              </SheetTitle>
              <SheetDescription className="mt-1">
                Update policy fields for{' '}
                <span className="font-semibold text-foreground">
                  {product?.code}
                </span>{' '}
                — {product?.description}. Changes apply to new loan applications
                immediately.
              </SheetDescription>
            </div>
            {product && (
              <Badge
                variant="outline"
                className={
                  product.isRetired
                    ? 'border-red-600/25 bg-red-500/10 text-red-700 font-normal text-[10px] dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400'
                    : 'border-emerald-600/25 bg-emerald-500/10 text-emerald-700 font-normal text-[10px] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400'
                }
              >
                {product.isRetired ? 'Retired' : 'Active'}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <form
          onSubmit={submit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <Card className="border bg-muted/10">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Database
                    size={14}
                    weight="bold"
                    className="text-muted-foreground"
                  />
                  Synced from webloan (read-only)
                </CardTitle>
                <CardDescription>
                  Code, description, and retirement status are mirrored from the
                  webloan catalog by the background sync. Run a manual sync to
                  refresh.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 pt-0">
                <ReadOnlyField
                  label="Product Code"
                  value={product?.code ?? '—'}
                />
                <ReadOnlyField
                  label="Description"
                  value={product?.description ?? '—'}
                />
                <ReadOnlyField label="Last Synced" value={lastSyncedDisplay} />
                <ReadOnlyField
                  label="Retirement"
                  value={
                    product
                      ? product.isRetired
                        ? 'Retired (webloan marked this product expired)'
                        : 'Active'
                      : '—'
                  }
                />
              </CardContent>
            </Card>

            <section className="space-y-4">
              <SectionHeading
                title="Eligibility Bounds"
                description="Min and max principal (₱) and term (days) an AO can request for this product."
              />
              <div className="grid grid-cols-2 gap-4">
                <NumberField
                  id="minAmount"
                  label="Min Principal (₱)"
                  error={errors.minAmount?.message}
                  disabled={!canEdit}
                  step="0.01"
                  {...register('minAmount')}
                />
                <NumberField
                  id="maxAmount"
                  label="Max Principal (₱)"
                  error={errors.maxAmount?.message}
                  disabled={!canEdit}
                  step="0.01"
                  {...register('maxAmount')}
                />
                <NumberField
                  id="minTermDays"
                  label="Min Term (days)"
                  error={errors.minTermDays?.message}
                  disabled={!canEdit}
                  step="1"
                  {...register('minTermDays')}
                />
                <NumberField
                  id="maxTermDays"
                  label="Max Term (days)"
                  error={errors.maxTermDays?.message}
                  hint="Hard ceiling: 2617 days (7 years + 2 months grace period)."
                  disabled={!canEdit}
                  step="1"
                  {...register('maxTermDays')}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <SectionHeading
                title="Bank Fees (Flat, PHP)"
                description="Standard flat fees deducted at disbursement, alongside advance interest."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <NumberField
                  id="notarialFee"
                  label="Notarial Fee (₱)"
                  error={errors.notarialFee?.message}
                  disabled={!canEdit}
                  step="0.01"
                  {...register('notarialFee')}
                />
                <NumberField
                  id="docStampFee"
                  label="Doc-Stamps Fee (₱)"
                  error={errors.docStampFee?.message}
                  disabled={!canEdit}
                  step="0.01"
                  {...register('docStampFee')}
                />
                <NumberField
                  id="insuranceFee"
                  label="Insurance Fee (₱)"
                  error={errors.insuranceFee?.message}
                  disabled={!canEdit}
                  step="0.01"
                  {...register('insuranceFee')}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <SectionHeading
                title="Advance Interest Rate"
                description="Annual rate, stored as a decimal fraction. The disbursement service multiplies this by principal and (termDays / 365) to compute the advance-interest deduction."
              />
              <div className="max-w-xs">
                <NumberField
                  id="advanceInterestRate"
                  label="Rate (decimal fraction)"
                  error={errors.advanceInterestRate?.message}
                  hint={
                    Number.isFinite(watchedRate)
                      ? `${(Number(watchedRate) * 100).toFixed(2)}% p.a.`
                      : '0 = 0% p.a. • 0.12 = 12% p.a. • 1 = 100% p.a.'
                  }
                  disabled={!canEdit}
                  step="0.0001"
                  {...register('advanceInterestRate')}
                />
              </div>
            </section>

            {!canEdit && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <WarningCircle
                  size={14}
                  weight="fill"
                  className="mt-0.5 shrink-0"
                />
                <span>
                  You can view this product but the policy fields are read-only
                  — changes require the <code>loan_product.manage</code>{' '}
                  permission.
                </span>
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={onClose}
              disabled={isSubmitting || isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9"
              disabled={!canEdit || !isDirty || isSubmitting || isSaving}
            >
              {isSubmitting || isSaving ? (
                <>
                  <Spinner className="size-3" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle size={14} weight="bold" /> Save Changes
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}