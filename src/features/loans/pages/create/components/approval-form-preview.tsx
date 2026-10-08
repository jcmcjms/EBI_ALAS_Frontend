import { useMemo, useState, type Ref } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import {
  FilePdf,
  Printer,
  CaretLeft,
  CaretRight,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/primitives/button'
import { FormTabStrip } from '@/src/shared/ui/forms/form-tab-strip'
import { cn } from '@/src/shared/lib/utils'
import { SectionCard } from './section-card'
import { getSection } from '@/src/features/loans/constants/sections'
import type {
  ClientFormData,
  LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import { useAuthStore } from '@/src/shared/store/auth-store'
import {
  useSignatureChain,
  withDraftEncoder,
} from '@/src/features/loans/api/signatures'

import { ApprovalFormViewport } from '@/src/features/loans/components/approval-form-sheet'
import { num } from './approval-form-preview-utils'
import { SingleLoanApprovalForm } from './single-loan-approval-form'

export function ApprovalFormPreview({
  onGeneratePdf,
  lamIdByLoanNo,
  ref,
}: {
  onGeneratePdf?: () => void
  lamIdByLoanNo?: Record<string, string>
  ref?: Ref<HTMLDivElement>
}) {
  const { control } = useFormContext<LoanApplicationFormData>()

  const watchedLoans = useWatch({ control, name: 'loans' }) ?? []
  const watchedForm = useWatch({ control }) as LoanApplicationFormData

  const client = watchedForm?.client ?? ({} as ClientFormData)
  const branchType =
    watchedForm?.branchType ?? ({} as LoanApplicationFormData['branchType'])

  const section = getSection('approval-form')

  const { data: chain } = useSignatureChain()
  const user = useAuthStore((s) => s.user)
  const signatureSlots = useMemo(
    () => withDraftEncoder(chain ?? [], user),
    [chain, user],
  )

  const [activeLoanNo, setActiveLoanNo] = useState('')
  const [captureAll, setCaptureAll] = useState(false)
  const [zoom, setZoom] = useState(1)

  const effectiveActiveLoanNo = useMemo(
    () =>
      activeLoanNo && watchedLoans.some((l) => l?.loanNo === activeLoanNo)
        ? activeLoanNo
        : (watchedLoans[0]?.loanNo ?? ''),
    [activeLoanNo, watchedLoans],
  )

  const activeIndex = Math.max(
    0,
    watchedLoans.findIndex((l) => l?.loanNo === effectiveActiveLoanNo),
  )

  const handleGeneratePdf = async () => {
    setCaptureAll(true)
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    )
    try {
      await onGeneratePdf?.()
    } finally {
      setCaptureAll(false)
    }
  }

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      systemSourced
      icon={<FilePdf size={20} weight="bold" className="text-primary" />}
      badge={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
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
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Zoom in"
              onClick={() =>
                setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))
              }
            >
              <MagnifyingGlassPlus size={15} />
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer size={14} weight="bold" /> Print all ({watchedLoans.length}
            )
          </Button>
          {onGeneratePdf && (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={handleGeneratePdf}
            >
              <FilePdf size={14} weight="bold" /> Generate PDF
            </Button>
          )}
        </div>
      }
      contentClassName="p-0"
    >
      {}
      <div
        ref={ref}
        id="approval-form-preview"
        data-print-root
        className="bg-white text-black print:bg-white"
      >
        {}
        {watchedLoans.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            Select loan numbers in Step 1.3 to generate approval forms.
          </div>
        )}

        {}
        {watchedLoans.length > 0 && (
          <>
            {}
            <div className="bg-muted/30 px-3 pt-2">
              <FormTabStrip
                idPrefix="approval"
                ariaLabel="Approval forms"
                activeSurface="sheet"
                items={watchedLoans.map((l) => ({
                  value: l.loanNo ?? '',
                  label: l.productCode ?? '',
                  hint: l.loanNo ? `\u2026${l.loanNo.slice(-4)}` : '\u2026',
                  metric: num(l.parameters?.proposedAmount ?? 0),
                  title: l.loanNo
                    ? `${l.loanNo} \u00B7 ${l.productDescription ?? ''}`
                    : (l.productDescription ?? ''),
                }))}
                value={effectiveActiveLoanNo}
                onValueChange={setActiveLoanNo}
                trailing={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Previous approval form"
                      disabled={activeIndex === 0}
                      onClick={() =>
                        setActiveLoanNo(watchedLoans[activeIndex - 1].loanNo)
                      }
                    >
                      <CaretLeft size={14} weight="bold" />
                    </Button>
                    <span
                      className="min-w-12 text-center text-xs tabular-nums text-muted-foreground"
                      aria-live="polite"
                    >
                      {activeIndex + 1} / {watchedLoans.length}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Next approval form"
                      disabled={activeIndex === watchedLoans.length - 1}
                      onClick={() =>
                        setActiveLoanNo(watchedLoans[activeIndex + 1].loanNo)
                      }
                    >
                      <CaretRight size={14} weight="bold" />
                    </Button>
                  </>
                }
              />
            </div>

            {}
            <ApprovalFormViewport zoom={zoom}>
              <div className="bg-white text-black">
                {watchedLoans.map((loan, index) => {
                  if (!loan.loanNo) return null
                  return (
                    <div
                      key={loan.loanNo}
                      id={`approval-panel-${loan.loanNo}`}
                      role="tabpanel"
                      aria-labelledby={`approval-tab-${loan.loanNo}`}
                      className={cn(
                        'p-5 text-[10px] leading-[1.4]',
                        loan.loanNo !== effectiveActiveLoanNo &&
                          !captureAll &&
                          'hidden print:block',
                        index > 0 && 'print:break-before-page',
                      )}
                    >
                      {index > 0 && (
                        <div className="mb-2 hidden text-center text-[9px] font-bold print:block">
                          — Loan {index + 1} of {watchedLoans.length} —
                        </div>
                      )}
                      <SingleLoanApprovalForm
                        loan={loan}
                        client={client}
                        branchType={branchType}
                        form={watchedForm}
                        index={index}
                        lamIdByLoanNo={lamIdByLoanNo}
                        signatureSlots={signatureSlots}
                      />
                    </div>
                  )
                })}
              </div>
            </ApprovalFormViewport>
          </>
        )}
      </div>
    </SectionCard>
  )
}