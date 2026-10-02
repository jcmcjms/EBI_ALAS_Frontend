import { forwardRef, memo } from 'react'
import { RichText } from '@/src/shared/ui/rich-text'
import { cn } from '@/src/shared/lib/utils'
import {
  parseProductCode,
  resolveLoanProductDisplayName,
} from '@/src/features/loans/utils/loan-product-display'
import {
  computeLoanMetrics,
  buildProductLine,
  buildPrintableDeviationEntries,
  isBlankReloan,
  isBlankBuyOut,
  isBlankIncomingLoan,
  printableObligationRows,
  type ProductFeeConfig,
} from '@/src/features/loans/utils/loan-approval-utils'
import { ApprovalFormSheet } from '@/src/features/loans/components/approval-form-sheet'
import { useLoanProduct } from '@/src/features/admin/loan-products/hooks/use-loan-products'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import type { SignatureSlotDto } from '@/src/features/loans/api/signatures'
import type {
  LoanDeviationDto,
  DocumentRemarkDto,
} from '@/src/features/loans/api/loan-review'

import {
  B,
  dash,
  fullNameOf,
  SignatureBlock,
  type ApprovalFormActionEntry,
} from './approval-form-document-utils'

export type { ApprovalFormActionEntry } from './approval-form-document-utils'
import { ClientInfoTable } from './client-info-table'
import { LoanComputationsPanel } from './loan-computations-panel'
import { ObligationsSummaryTable } from './obligations-summary-table'
import { AuditTrailSection } from './audit-trail-section'

interface ApprovalFormDocumentProps {
  data: LoanApplicationFormData
  loanIndex?: number
  catLoanClass?: string | null
  signatureSlots?: SignatureSlotDto[]
  actions?: ApprovalFormActionEntry[]
  deviations?: LoanDeviationDto[]
  documentRemarks?: DocumentRemarkDto[]
}

const ApprovalFormDocumentBase = forwardRef<
  HTMLDivElement,
  ApprovalFormDocumentProps
>(
  (
    {
      data,
      loanIndex = 0,
      catLoanClass,
      signatureSlots,
      actions,
      deviations: deviationThreads,
      documentRemarks,
    },
    ref,
  ) => {
    const client = data?.client ?? ({} as LoanApplicationFormData['client'])
    const branchType =
      data?.branchType ?? ({} as LoanApplicationFormData['branchType'])

    const primaryLoan = data?.loans?.[loanIndex]
    const params = primaryLoan?.parameters
    const verification = primaryLoan?.verification
    const deviations = primaryLoan?.deviations
    const deviationEntries = buildPrintableDeviationEntries(deviations)
    const outstandingLoans = data?.outstandingLoans ?? []
    const ebiReloans = primaryLoan?.ebiReloans ?? []
    const buyOuts = primaryLoan?.buyOuts ?? []
    const incomingLoans = primaryLoan?.incomingLoans ?? []

    const reloanRows = printableObligationRows(ebiReloans, isBlankReloan)
    const buyOutRows = printableObligationRows(buyOuts, isBlankBuyOut)
    const incomingRows = printableObligationRows(
      incomingLoans,
      isBlankIncomingLoan,
    )

    const productCodeForLookup = params?.product
      ? parseProductCode(params.product)
      : null
    const { data: loanProduct } = useLoanProduct(productCodeForLookup)
    const productFees: ProductFeeConfig | undefined = loanProduct
      ? {
          applicationChargeRate: loanProduct.applicationChargeRate,
          notarialFee: loanProduct.notarialFee,
          insuranceFee: loanProduct.insuranceFee,
          chargeAdvanceInterest: loanProduct.chargeAdvanceInterest,
          advanceInterestRate: loanProduct.advanceInterestRate,
        }
      : undefined

    if (!primaryLoan || !params) {
      return (
        <div
          ref={ref}
          id="approval-form-document"
          data-print-root
          className="bg-white p-5 text-black print:bg-white"
        >
          <ApprovalFormSheet>
            <h1 className="mb-2 text-sm font-bold underline">
              LOAN APPROVAL FORM
            </h1>
            <p className="text-sm">
              Select a loan in Step 1.3 to render its approval form.
            </p>
          </ApprovalFormSheet>
        </div>
      )
    }

    const c = computeLoanMetrics(
      primaryLoan,
      {
        outstandingLoans,
        ebiReloans,
        buyOuts,
        incomingLoans,
        client,
      },
      productFees,
    )

    const productCode = parseProductCode(params.product)
    const productDisplay = resolveLoanProductDisplayName(
      params.product,
      catLoanClass,
    )

    const approvalTermDays = c.approvalTermDays
    const annualRatePercent = c.annualRatePercent

    const productLine = params.product
      ? buildProductLine(
          productCode,
          productDisplay,
          approvalTermDays,
          params.policyTermMonths,
          annualRatePercent,
        )
      : '-'

    const remarksLines = [
      deviations?.remarks,
      deviations?.aoRecommendation,
    ].filter((x): x is string => !!x)
    const otherRemarks = deviations?.otherRemarks

    return (
      <div
        ref={ref}
        id="approval-form-document"
        data-print-root
        className="bg-white p-5 text-black print:bg-white"
      >
        <ApprovalFormSheet>
          <h1 className="mb-2 text-sm font-bold underline">
            LOAN APPROVAL FORM
          </h1>

          <div className="border-2 border-b-0 border-black print:border-b-2">
            <ClientInfoTable
              client={client}
              branchType={branchType}
              primaryLoan={primaryLoan}
              data={data}
              params={params}
              productDisplay={productDisplay}
              approvalTermDays={approvalTermDays}
              productLine={productLine}
            />

            <div className={cn(B, 'text-center font-bold')}>
              LOAN COMPUTATIONS
            </div>

            <LoanComputationsPanel
              c={c}
              params={params}
              primaryLoan={primaryLoan}
              outstandingLoans={outstandingLoans}
            />

            <ObligationsSummaryTable
              reloanRows={reloanRows}
              buyOutRows={buyOutRows}
              incomingRows={incomingRows}
              c={c}
            />
          </div>

          <section className="break-before-page">
            <div className="hidden print:mb-3 print:flex print:items-baseline print:justify-between print:border-b-2 print:border-black print:pb-1">
              <span className="text-sm font-bold underline">
                LOAN APPROVAL FORM
              </span>
              <span className="tabular-nums">
                {fullNameOf(client)} · LAM {dash(branchType.lai)} · PN{' '}
                {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}
              </span>
            </div>

            <div className="border-2 border-t-0 border-black print:border-t-2">
              <div className="grid grid-cols-2">
                <div className={cn(B, 'min-h-40 border-r-0 p-1.5')}>
                  <div className="font-bold">Deviations:</div>
                  {deviationEntries.length > 0 ? (
                    <ol className="mt-1 space-y-1 list-none">
                      {deviationEntries.map((entry, i) => (
                        <li key={`${entry.reason}-${i}`}>
                          <div>
                            {i + 1}) {entry.reason}
                          </div>
                          <div className="pl-4">
                            Remark: {dash(entry.remark)}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1">-</p>
                  )}
                </div>
                <div className={cn(B, 'min-h-40 p-1.5')}>
                  <div className="font-bold">Verifications Conducted:</div>
                  <RichText value={verification?.findings} className="mt-1" />
                  <div className="mt-4 font-bold">Other Remarks</div>
                  <div className="mt-1">REMARKS:</div>
                  <ol className="space-y-0.5">
                    {remarksLines.length === 0 && !otherRemarks && <li>-</li>}
                    {remarksLines.map((line, i) => (
                      <li key={i}>
                        {i + 1}) {line}
                      </li>
                    ))}
                  </ol>
                  {otherRemarks ? (
                    <RichText value={otherRemarks} className="mt-1" />
                  ) : null}
                </div>
              </div>

              {signatureSlots && signatureSlots.length > 0 && (
                <div className="border-t-2 border-black p-3 break-inside-avoid">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    {signatureSlots.map((slot) => (
                      <SignatureBlock key={slot.role} slot={slot} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <AuditTrailSection
            actions={actions}
            deviationThreads={deviationThreads}
            documentRemarks={documentRemarks}
            client={client}
            branchType={branchType}
            primaryLoan={primaryLoan}
            data={data}
          />
        </ApprovalFormSheet>
      </div>
    )
  },
)
ApprovalFormDocumentBase.displayName = 'ApprovalFormDocument'

export const ApprovalFormDocument = memo(ApprovalFormDocumentBase)