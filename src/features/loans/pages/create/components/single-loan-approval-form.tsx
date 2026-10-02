import { RichText } from '@/src/shared/ui/rich-text'
import { cn } from '@/src/shared/lib/utils'
import { ApprovalFormSheet } from '@/src/features/loans/components/approval-form-sheet'
import { useCatLoanClass } from '@/src/features/loans/hooks/use-cat-loan-class'
import {
  parseProductCode,
  resolveLoanProductDisplayName,
} from '@/src/features/loans/utils/loan-product-display'
import {
  buildProductLine,
  buildPrintableDeviationEntries,
  computeLoanMetrics,
  isBlankReloan,
  isBlankBuyOut,
  isBlankIncomingLoan,
  printableObligationRows,
  type ProductFeeConfig,
} from '@/src/features/loans/utils/loan-approval-utils'
import { useLoanProduct } from '@/src/features/admin/loan-products/hooks/use-loan-products'
import type {
  ClientFormData,
  LoanApplicationFormData,
  LoanParameters,
  SelectedLoan,
} from '@/src/features/loans/schemas/schema'
import type { SignatureSlotDto } from '@/src/features/loans/api/signatures'

import {
  B,
  dash,
  fullNameOf,
  SignatureBlock,
} from './approval-form-preview-utils'
import { SingleLoanClientInfo } from './single-loan-client-info'
import { SingleLoanComputations } from './single-loan-computations'
import { SingleLoanObligations } from './single-loan-obligations'

interface SingleLoanApprovalFormProps {
  loan: SelectedLoan
  client: ClientFormData
  branchType: LoanApplicationFormData['branchType']
  form: LoanApplicationFormData
  index: number
  lamIdByLoanNo?: Record<string, string>
  signatureSlots?: SignatureSlotDto[]
}

export function SingleLoanApprovalForm({
  loan,
  client,
  branchType,
  form,
  index,
  lamIdByLoanNo,
  signatureSlots,
}: SingleLoanApprovalFormProps) {
  const parameters =
    loan.parameters ??
    ({
      product: '',
      purpose: '',
      proposedAmount: 0,
      term: 0,
      notarialFee: 0,
      docStamps: 0,
      insurance: 0,
    } as LoanParameters)

  const productCode = parseProductCode(parameters.product)

  const preLoanBranchCode =
    loan.branchCode?.trim() || form?.preLoan?.bch?.trim() || ''
  const { data: loanClass } = useCatLoanClass(
    preLoanBranchCode,
    loan.loanNo,
    productCode,
  )

  const { data: loanProduct } = useLoanProduct(productCode)
  const productFees: ProductFeeConfig | undefined = loanProduct
    ? {
        applicationChargeRate: loanProduct.applicationChargeRate,
        notarialFee: loanProduct.notarialFee,
        insuranceFee: loanProduct.insuranceFee,
        chargeAdvanceInterest: loanProduct.chargeAdvanceInterest,
        advanceInterestRate: loanProduct.advanceInterestRate,
      }
    : undefined

  const productDisplay = resolveLoanProductDisplayName(
    parameters.product,
    loanClass?.catLoanClass,
  )

  const outstandingLoans = form?.outstandingLoans ?? []
  const ebiReloans = loan.ebiReloans ?? []
  const buyOuts = loan.buyOuts ?? []
  const incomingLoans = loan.incomingLoans ?? []

  const c = computeLoanMetrics(
    { ...loan, parameters },
    { outstandingLoans, ebiReloans, buyOuts, incomingLoans, client },
    productFees,
  )

  const reloanRows = printableObligationRows(ebiReloans, isBlankReloan)
  const buyOutRows = printableObligationRows(buyOuts, isBlankBuyOut)
  const incomingRows = printableObligationRows(
    incomingLoans,
    isBlankIncomingLoan,
  )

  const productLine = parameters.product
    ? buildProductLine(
        productCode,
        productDisplay,
        c.approvalTermDays,
        parameters.policyTermMonths,
        c.annualRatePercent,
      )
    : '-'

  const deviations = loan.deviations
  const deviationEntries = buildPrintableDeviationEntries(deviations)
  const verification = loan.verification
  const remarksLines = [
    deviations?.remarks,
    deviations?.aoRecommendation,
  ].filter((x): x is string => !!x)
  const otherRemarks = deviations?.otherRemarks

  return (
    <div
      className={cn(
        'p-5',
        index > 0 && 'break-before-page print:break-before-page',
      )}
    >
      <ApprovalFormSheet>
        {index > 0 && (
          <div className="mb-2 text-center text-xs font-bold text-muted-foreground">
            — Loan {index + 1} of {form.loans.length} —
          </div>
        )}

        <h1 className="mb-2 text-sm font-bold underline">LOAN APPROVAL FORM</h1>

        <div className="border-2 border-b-0 border-black print:border-b-2">
          <SingleLoanClientInfo
            client={client}
            branchType={branchType}
            loan={loan}
            productDisplay={productDisplay}
            approvalTermDays={c.approvalTermDays}
            productLine={productLine}
            purpose={parameters.purpose}
            lamIdByLoanNo={lamIdByLoanNo}
          />

          <div className={cn(B, 'text-center font-bold')}>
            LOAN COMPUTATIONS
          </div>

          <SingleLoanComputations
            c={c}
            parameters={parameters}
            loan={loan}
            outstandingLoans={outstandingLoans}
          />

          <SingleLoanObligations
            reloanRows={reloanRows}
            buyOutRows={buyOutRows}
            incomingRows={incomingRows}
            c={c}
          />
        </div>

        <section className="break-before-page">
          <div className="hidden print:mb-3 print:flex print:items-baseline print:justify-between print:border-b-2 print:border-black print:pb-1">
            <span className="text-sm font-bold underline">
              LOAN APPROVAL FORM (Continuation)
            </span>
            <span className="tabular-nums">
              {fullNameOf(client)} · LAM {dash(branchType.lai)} · PN{' '}
              {dash(loan.loanNo)}
            </span>
          </div>

          <div className="border-2 border-t-0 border-black print:border-t-2 break-inside-avoid">
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
                        <div className="pl-4">Remark: {dash(entry.remark)}</div>
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
      </ApprovalFormSheet>
    </div>
  )
}