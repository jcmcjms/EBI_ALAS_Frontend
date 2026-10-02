import { useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { Label } from '@/src/shared/ui/label'
import { Checkbox } from '@/src/shared/ui/checkbox'
import { Badge } from '@/src/shared/ui/badge'
import { Warning, Check } from '@phosphor-icons/react'

import {
  DEVIATION_REASONS,
  type DeviationReason,
} from '@/src/features/loans/schemas/schema'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { SectionCard } from './section-card'
import { PerLoanTabs } from './per-loan-tabs'
import { DeviationSeverityGroup } from './deviation-severity-group'
import { DeviationItem } from './deviation-item'
import { FeeDeviationJustification } from './fee-deviation-justification'
import { DeviationOtherRemarks } from './deviation-other-remarks'
import { getSection } from '@/src/features/loans/constants/sections'
import { useActiveLoan } from '../active-loan-context'
import { useDeviationCatalog } from '@/src/features/admin/users/hooks/use-deviation-catalog'

type DeviationsErrors = {
  otherRemarks?: { message?: string }
  deviationDetails?: { message?: string }
  feeDeviationJustification?: { message?: string }
  deviationJustifications?: Record<string, { message?: string }>
}

const FEE_OVERRIDE_TOLERANCE = 0.01

export function DeviationsSection() {
  const { loans } = useActiveLoan()
  const { formState } = useFormContext<LoanApplicationFormData>()
  const section = getSection('deviations')

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      icon={<Warning size={20} weight="bold" className="text-primary" />}
      badge={
        loans.length > 0 ? (
          <Badge variant="secondary">
            {loans.length} loan{loans.length === 1 ? '' : 's'}
          </Badge>
        ) : undefined
      }
    >
      {loans.length === 0 ? (
        <div className="rounded-none border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Select loan numbers in Step 1.3 to record deviations and remarks.
        </div>
      ) : (
        <PerLoanTabs
          idPrefix="deviations"
          ariaLabel="Deviations per loan"
          mountStrategy="active-only"
          hasError={(i) => Boolean(formState.errors.loans?.[i]?.deviations)}
          renderPanel={(loan, i) => (
            <DeviationsFields loanIndex={i} loanNo={loan.loanNo} />
          )}
        />
      )}
    </SectionCard>
  )
}

function DeviationsFields({
  loanIndex,
  loanNo,
}: {
  loanIndex: number
  loanNo: string
}) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<LoanApplicationFormData>()

  const path = `loans.${loanIndex}.deviations` as const
  const paramsPath = `loans.${loanIndex}.parameters` as const

  const hasDeviations =
    useWatch({ control, name: `${path}.hasDeviations` }) ?? false
  const selected =
    (useWatch({ control, name: `${path}.deviationDetails` }) as
      DeviationReason[] | undefined) ?? []

  const { data: catalog, isLoading: catalogLoading } =
    useDeviationCatalog(hasDeviations)

  const { majorItems, minorItems } = useMemo(() => {
    if (!catalog) return { majorItems: [], minorItems: [] }
    return {
      majorItems: catalog.filter((item) => item.severity === 2),
      minorItems: catalog.filter((item) => item.severity === 1),
    }
  }, [catalog])

  const fallbackReasons = DEVIATION_REASONS

  const notarialFee =
    (useWatch({ control, name: `${paramsPath}.notarialFee` }) as
      number | undefined) ?? 0
  const docStamps =
    (useWatch({ control, name: `${paramsPath}.docStamps` }) as
      number | undefined) ?? 0
  const insurance =
    (useWatch({ control, name: `${paramsPath}.insurance` }) as
      number | undefined) ?? 0
  const snapshot = useWatch({
    control,
    name: `${paramsPath}.standardFeesSnapshot`,
  }) as
    { notarialFee?: number; docStamps?: number; insurance?: number } | undefined

  const hasFeeOverride = useMemo(() => {
    if (!snapshot) return false
    return (
      Math.abs(notarialFee - (snapshot.notarialFee ?? 0)) >
        FEE_OVERRIDE_TOLERANCE ||
      Math.abs(docStamps - (snapshot.docStamps ?? 0)) >
        FEE_OVERRIDE_TOLERANCE ||
      Math.abs(insurance - (snapshot.insurance ?? 0)) > FEE_OVERRIDE_TOLERANCE
    )
  }, [notarialFee, docStamps, insurance, snapshot])

  const devErrors = errors.loans?.[loanIndex]?.deviations as
    DeviationsErrors | undefined
  const otherRemarksError = devErrors?.otherRemarks?.message
  const deviationDetailsError = devErrors?.deviationDetails?.message
  const feeJustificationError = devErrors?.feeDeviationJustification?.message
  const justificationErrorFor = (reason: DeviationReason): string | undefined =>
    devErrors?.deviationJustifications?.[reason]?.message

  const toggleReason = (reason: DeviationReason, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...selected, reason]))
      : selected.filter((r) => r !== reason)
    setValue(`${path}.deviationDetails`, next, { shouldValidate: true })

    if (!checked) {
      setValue(`${path}.deviationJustifications.${reason}`, '', {
        shouldValidate: false,
      })
    }
  }

  const selectedMajorCount = selected.filter((r) =>
    majorItems.some((item) => item.description === r),
  ).length
  const selectedMinorCount = selected.filter((r) =>
    minorItems.some((item) => item.description === r),
  ).length

  const renderItem = (reason: string) => (
    <DeviationItem
      key={reason}
      reason={reason}
      loanNo={loanNo}
      path={path}
      checked={selected.includes(reason as DeviationReason)}
      justificationError={justificationErrorFor(reason as DeviationReason)}
      register={register}
      onToggle={toggleReason}
    />
  )

  return (
    <div className="space-y-5">
      {}
      <div className="flex items-center space-x-3">
        <Checkbox
          id={`hasDeviations-${loanNo}`}
          checked={hasDeviations}
          onCheckedChange={(checked) =>
            setValue(`${path}.hasDeviations`, !!checked, {
              shouldValidate: true,
            })
          }
        />
        <label
          htmlFor={`hasDeviations-${loanNo}`}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          This application has deviations from standard lending policies
        </label>
      </div>

      {hasDeviations && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Warning size={14} weight="fill" />
            <span className="font-medium">
              Select all deviations that apply. Each selected reason requires a
              written justification.
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Deviation Reasons
              </Label>
              {deviationDetailsError && (
                <span className="text-xs text-destructive font-medium">
                  {deviationDetailsError}
                </span>
              )}
            </div>

            {catalogLoading ? (
              <div className="rounded-md border border-input bg-background p-4 text-center text-sm text-muted-foreground">
                Loading deviation catalog...
              </div>
            ) : catalog && catalog.length > 0 ? (
              <div className="space-y-4">
                {}
                {majorItems.length > 0 && (
                  <DeviationSeverityGroup
                    title="Major Deviations"
                    severity="major"
                    items={majorItems}
                    description="Requires COO or higher approval"
                    renderItem={renderItem}
                  />
                )}

                {}
                {minorItems.length > 0 && (
                  <DeviationSeverityGroup
                    title="Minor Deviations"
                    severity="minor"
                    items={minorItems}
                    description="Requires RBG/Product/Credit Head"
                    renderItem={renderItem}
                  />
                )}
              </div>
            ) : (
              <div
                role="group"
                aria-label="Deviation reasons"
                className="space-y-3 rounded-md border border-input bg-background p-4"
              >
                {fallbackReasons.map((reason) => renderItem(reason))}
              </div>
            )}

            {selected.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Check size={12} weight="bold" className="text-primary" />
                <span>
                  {selected.length} deviation
                  {selected.length === 1 ? '' : 's'} selected
                  {selectedMajorCount > 0 && selectedMinorCount > 0 && (
                    <>
                      {' '}
                      ({selectedMajorCount} major, {selectedMinorCount} minor)
                    </>
                  )}
                  {selectedMajorCount > 0 && selectedMinorCount === 0 && (
                    <> (all major)</>
                  )}
                  {selectedMajorCount === 0 && selectedMinorCount > 0 && (
                    <> (all minor)</>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {hasFeeOverride && (
        <FeeDeviationJustification
          path={path}
          feeJustificationError={feeJustificationError}
          register={register}
        />
      )}

      {}
      <DeviationOtherRemarks
        path={path}
        loanIndex={loanIndex}
        control={control}
        otherRemarksError={otherRemarksError}
      />
    </div>
  )
}
