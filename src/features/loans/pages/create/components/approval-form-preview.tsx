import { forwardRef, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { FilePdf, Printer, CaretLeft, CaretRight } from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/button'
import { FormTabStrip } from '@/src/shared/ui/form-tab-strip'
import { RichText } from '@/src/shared/ui/rich-text'
import { cn } from '@/src/shared/lib/utils'
import { ApprovalFormSheet } from '@/src/features/loans/components/approval-form-sheet'

import { SectionCard } from './section-card'
import { getSection } from '@/src/features/loans/constants/sections'
import type {
  ClientFormData,
  LoanApplicationFormData,
  LoanParameters,
  SelectedLoan,
} from '@/src/features/loans/schemas/schema'
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
import { useAuthStore } from '@/src/features/auth/store/authStore'
import {
  useSignatureChain,
  withDraftEncoder,
  type SignatureSlotDto,
} from '@/src/features/loans/api/signatures'
import { useLoanProduct } from '@/src/features/admin/loan-products/hooks/use-loan-products'

function num(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-'
  return value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function dash(value?: string | null): string {
  return value && value.trim().length > 0 ? value : '-'
}

function isoDate(iso?: string): string {
  return iso ? iso.slice(0, 10) : '-'
}

function fullNameOf(client: Partial<ClientFormData>): string {
  const parts = [client.lastName, client.firstName, client.middleName].filter(
    Boolean,
  )
  if (parts.length === 0) return '-'
  const [last, first, middle] = parts as string[]
  return middle
    ? `${last.toUpperCase()}, ${first.toUpperCase()} ${middle[0].toUpperCase()}.`
    : `${last.toUpperCase()}, ${first.toUpperCase()}`
}

function ageFrom(isoDateStr?: string): string {
  if (!isoDateStr) return '-'
  const birth = new Date(isoDateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return String(age)
}

const BLUE = 'bg-[#d9eaf7]'
const B = 'border border-black'
const DOUBLE_UNDERLINE: React.CSSProperties = {
  borderBottom: '3px double #000',
}
const TOP_LINE: React.CSSProperties = { borderTop: '1px solid #000' }

interface TableCellProps {
  children: React.ReactNode
  className?: string
  colSpan?: number
  rowSpan?: number
  blue?: boolean
}

function L({ children, className, colSpan, rowSpan }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(B, 'px-1.5 py-0.5 font-bold', className)}
    >
      {children}
    </td>
  )
}
function V({ children, blue, className, colSpan, rowSpan }: TableCellProps) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(B, 'px-1.5 py-0.5', blue && BLUE, className)}
    >
      {children}
    </td>
  )
}

function AmtRow({
  label,
  value,
  blue,
  bold,
  underline,
  topLine,
  labelBold,
}: {
  label: React.ReactNode
  value: React.ReactNode
  blue?: boolean
  bold?: boolean
  underline?: boolean
  topLine?: boolean
  labelBold?: boolean
}) {
  return (
    <div className="flex items-end justify-between gap-2 py-[1px]">
      <span className={cn(labelBold && 'font-bold')}>{label}</span>
      <span
        className={cn(
          'min-w-24 text-right tabular-nums',
          bold && 'font-bold',
          blue && `${BLUE} px-1`,
          underline && 'border-b border-black',
        )}
        style={topLine ? TOP_LINE : undefined}
      >
        {value}
      </span>
    </div>
  )
}

function SignatureBlock({ slot }: { slot: SignatureSlotDto }) {
  const name = slot.signedByName?.trim()
  const title = slot.signedByJobTitle?.trim() || slot.jobTitle || '\u2014'
  return (
    <div>
      <div className="font-bold">{slot.action}:</div>
      <div className="mt-8 border-b border-black" />
      <div className="mt-0.5 font-bold">{name ?? '\u00A0'}</div>
      <div>
        {title} <span className="font-bold">({slot.role})</span>
      </div>
      <div className="mt-1">
        Date signed:{' '}
        <span className="tabular-nums">
          {slot.signedAt ? isoDate(slot.signedAt) : '____________'}
        </span>
      </div>
    </div>
  )
}

interface SingleLoanApprovalFormProps {
  loan: SelectedLoan
  client: ClientFormData
  branchType: LoanApplicationFormData['branchType']
  form: LoanApplicationFormData
  index: number

  lamIdByLoanNo?: Record<string, string>

  signatureSlots?: SignatureSlotDto[]
}

function SingleLoanApprovalForm({
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
    {
      outstandingLoans,
      ebiReloans,
      buyOuts,
      incomingLoans,
      client,
    },
    productFees,
  )
  const approvalTermDays = c.approvalTermDays
  const annualRatePercent = c.annualRatePercent
  const monthlyAmortization = c.amortization
  const applicationCharge = c.applicationCharge
  const docStamp = c.docStamp
  const notarialFee = c.notarialFee
  const deductionsSubtotal = c.deductionsSubtotal
  const deductionPct = c.deductionPct
  const grossProceeds = c.grossProceeds
  const netProceedsDs = c.netProceedsDs
  const netProceedsClient = c.netProceedsClient
  const totalExposure = c.totalExposure
  const totalPrincipal = c.totalPrincipal
  const ebiDeductions = c.ebiDeductions
  const ebiOb = c.ebiOb
  const buyOutBalance = c.buyOutBalance
  const nthp = c.nthp
  const netPayAfterDeduction = c.netPayAfterDeduction
  const totalMonthlyIncome = c.totalMonthlyIncome
  const totalDisposableGross = c.totalDisposableGross
  const minimumNthp = c.minimumNthp
  const totalDeductionsFinal = c.totalDeductionsFinal
  const totalDisposableNet = c.totalDisposableNet
  const maximumLoanableAmount = c.maximumLoanableAmount

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
        approvalTermDays,
        parameters.policyTermMonths,
        annualRatePercent,
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
        {}
        {index > 0 && (
          <div className="mb-2 text-center text-xs font-bold text-muted-foreground">
            — Loan {index + 1} of {form.loans.length} —
          </div>
        )}

        <h1 className="mb-2 text-sm font-bold underline">LOAN APPROVAL FORM</h1>

        <div className="border-2 border-b-0 border-black print:border-b-2">
          {}
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td
                  colSpan={8}
                  className={cn(B, `${BLUE} text-center font-bold`)}
                >
                  CLIENT INFORMATION
                </td>
              </tr>
              <tr>
                <td colSpan={4} className={B} />
                <td colSpan={1} className={cn(B, 'px-1.5 py-0.5 font-bold')}>
                  SCHOOL TYPE:
                </td>
                <td colSpan={3} className={cn(B, BLUE)}>
                  {dash(client.agency)}
                </td>
              </tr>
              <tr>
                <L className="w-[16%]">CLIENT NAME :</L>
                <V blue colSpan={3}>
                  {fullNameOf(client)}
                </V>
                <L className="w-[16%]">POSITION/TITLE :</L>
                <V blue colSpan={3}>
                  {dash(client.position)}
                </V>
              </tr>
              <tr>
                <L>ADDRESS:</L>
                <V blue colSpan={3}>
                  {dash(client.address)}
                </V>
                <L>Age:</L>
                <V blue>{ageFrom(client.birthdate)}</V>
                <L>Length of Service:</L>
                <V blue>{dash(client.lengthOfService)}</V>
              </tr>
              <tr>
                <L>Loan Application Type:</L>
                <V blue colSpan={3}>
                  {dash(branchType.creationTypeLabel)}
                </V>
                <L>LAM ID:</L>
                <V blue colSpan={3}>
                  {lamIdByLoanNo?.[loan.loanNo] ?? 'Generated upon submission'}
                </V>
              </tr>
              <tr>
                <L>Region Code :</L>
                <V blue>{dash(client.region)}</V>
                {}
                <V blue colSpan={2} rowSpan={3} className="align-bottom">
                  PN: {loan.loanNo}
                </V>
                <L>Branch Code :</L>
                <V blue colSpan={3}>
                  {dash(branchType.branch)}
                </V>
              </tr>
              <tr>
                <L>Division Code :</L>
                <V blue>{dash(client.divisionCode)}</V>
                <L>Requesting Officer:</L>
                <V blue colSpan={3}>
                  {dash(branchType.requestingOfficer)}
                </V>
              </tr>
              <tr>
                <L>Employee No. :</L>
                <V blue>{dash(client.employeeId)}</V>
                <L>Processing Date :</L>
                <V blue colSpan={3}>
                  {isoDate(new Date().toISOString())}
                </V>
              </tr>
              <tr>
                <L rowSpan={2} className="align-top">
                  Loan Product:
                </L>
                <V rowSpan={2} className="align-top font-bold">
                  {dash(productDisplay)}
                </V>
                <L rowSpan={2} className="align-top">
                  TERM (Days):
                  <br />
                  <span className="font-bold">
                    {approvalTermDays.toLocaleString()}
                  </span>
                </L>
                <V blue colSpan={5}>
                  {productLine}
                </V>
              </tr>
              <tr>
                <L>Loan Purpose:</L>
                <V blue colSpan={4}>
                  {dash(parameters.purpose)}
                </V>
              </tr>
            </tbody>
          </table>

          {}
          <div className={cn(B, 'text-center font-bold')}>
            LOAN COMPUTATIONS
          </div>

          <div className={BAND_MAIN}>
            {}
            <div className={cn(B, 'border-r-0 p-2')}>
              <AmtRow
                label={
                  <span className="font-bold">Maximum Loanable Amount **</span>
                }
                value={num(maximumLoanableAmount)}
                blue
                underline
              />
              <AmtRow
                label={
                  <span className="font-bold">Proposed Loan for Approval</span>
                }
                value={
                  <span className="font-bold">
                    {num(parameters.proposedAmount)}
                  </span>
                }
                blue
              />
              <div className="pt-1 font-bold">Less:</div>
              <div className="pl-3">
                <AmtRow
                  label="Application Charge"
                  value={num(applicationCharge)}
                />
                <AmtRow label="Doc. Stamp" value={num(docStamp)} />
                <AmtRow label="Notarial Fee" value={num(notarialFee)} />
                <AmtRow label="Insurance (MRI)" value="-" />
                <AmtRow label="Advance Interest" value="-" />
              </div>
              <div className="flex items-end justify-between gap-2 py-[1px]">
                <span className="font-bold">Total Deductions</span>
                <span className="tabular-nums">{deductionPct.toFixed(2)}%</span>
                <span className="min-w-24 border-b border-black text-right tabular-nums">
                  {num(deductionsSubtotal)}
                </span>
              </div>
              <AmtRow
                label={<span className="font-bold">GROSS PROCEEDS</span>}
                value={<span className="font-bold">{num(grossProceeds)}</span>}
                blue
                underline
              />
              <div className="h-3" />
              <AmtRow
                label={
                  <span className="font-bold">
                    Less: Total Accounts Balance
                  </span>
                }
                value={num(ebiOb)}
                underline
              />
              <AmtRow
                label={
                  <span className="font-bold">
                    Net Proceeds on DS for CM/MC
                  </span>
                }
                value={num(netProceedsDs)}
                underline
              />
              <div className="h-3" />
              <AmtRow
                label={
                  <span className="font-bold">Less: Total Buy-Out Balance</span>
                }
                value={num(buyOutBalance)}
                underline
              />
              <AmtRow
                label={
                  <span className="font-bold">NET PROCEEDS to Client</span>
                }
                value={
                  <span className="font-bold">{num(netProceedsClient)}</span>
                }
                blue
              />
              <div className="h-3" />
              <AmtRow
                label={<span className="font-bold">Monthly Amortization</span>}
                value={`PHP ${num(monthlyAmortization)}`}
                underline
              />
              <div className="h-3" />
              <AmtRow
                label={
                  <span className="font-bold">NetPay After Deduction</span>
                }
                value={num(netPayAfterDeduction)}
                underline
              />
              <div className="h-3" />
              <div className="flex items-end justify-between gap-2 py-[1px]">
                <span className="font-bold">Net Take Home Pay as of:</span>
                <span className={cn(`${BLUE} px-1 font-bold`)}>
                  {isoDate(parameters.nthpDate || new Date().toISOString())}
                </span>
                <span className="min-w-24 border-b border-black text-right font-bold tabular-nums">
                  {num(nthp)}
                </span>
              </div>
            </div>

            {}
            <div className={cn(B, 'p-2')}>
              <div className="font-bold underline">
                Outstanding Loans (do not include accounts for payoff):
              </div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="[&>th]:border-b [&>th]:border-black [&>th]:px-1 [&>th]:py-0.5 [&>th]:font-bold [&>th]:underline">
                    <th className="text-left">PN</th>
                    <th className="text-right">Balance</th>
                    <th className="text-right">Principal</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingLoans.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-1 py-0.5 text-center">
                        -
                      </td>
                    </tr>
                  )}
                  {outstandingLoans.map((l) => (
                    <tr key={l.pn} className="[&>td]:px-1 [&>td]:py-0.5">
                      <td>{l.pn}</td>
                      <td className="text-right tabular-nums">
                        {num(l.outstandingBalance)}
                      </td>
                      <td className="text-right tabular-nums">
                        {num(l.principalBalance)}
                      </td>
                      <td>{l.status}</td>
                    </tr>
                  ))}
                  <tr className="[&>td]:px-1 [&>td]:py-0.5">
                    <td />
                    <td className="text-right tabular-nums">0.00</td>
                    <td className="text-right tabular-nums">0.00</td>
                    <td />
                  </tr>
                  <tr className="[&>td]:px-1 [&>td]:py-0.5">
                    <td colSpan={2} />
                    <td
                      className="text-right font-bold tabular-nums"
                      style={TOP_LINE}
                    >
                      {num(totalPrincipal)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>

              <div className="pt-2 font-bold">This loan availment:</div>
              <div className="flex justify-between px-1 py-[1px]">
                <span>{loan.loanNo}</span>
                <span className="tabular-nums">
                  {num(parameters.proposedAmount)}
                </span>
                <span className="tabular-nums">
                  {num(parameters.proposedAmount)}
                </span>
              </div>
              <div className="flex justify-end px-1 py-[1px]">
                <span
                  className="min-w-24 text-right tabular-nums"
                  style={TOP_LINE}
                >
                  {num(parameters.proposedAmount)}
                </span>
              </div>
              <div className="flex items-end justify-between px-1 py-[1px]">
                <span className="font-bold">Total Exposure</span>
                <span
                  className={cn(`${BLUE} px-1 font-bold tabular-nums`)}
                  style={DOUBLE_UNDERLINE}
                >
                  {num(totalExposure)}
                </span>
              </div>

              {}
              <div className="mt-3 border border-black">
                <div className="border-b border-black px-1.5 py-0.5 font-bold italic underline">
                  Net Pay After Deduction Plus Other Sources of Income
                </div>
                <div className="p-1.5">
                  <AmtRow
                    label={<i>Net Pay After Deduction</i>}
                    value={num(netPayAfterDeduction)}
                  />
                  <div className="italic">Other Income:</div>
                  <AmtRow
                    label={<span className="pl-3">NONE</span>}
                    value="-"
                  />
                  <AmtRow
                    label={<i>Total Monthly Income</i>}
                    value={num(totalMonthlyIncome)}
                    underline
                  />
                </div>
              </div>
            </div>
          </div>

          {}
          <div className={cn(B, 'border-t-0 p-2 break-inside-avoid')}>
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
                <col className="w-[39%]" />
              </colgroup>
              <tbody>
                {reloanRows.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={4} className="px-1 pt-2 font-bold">
                        Add: EBI Accounts for reloans
                      </td>
                    </tr>
                    {reloanRows.map((r, i) => (
                      <tr
                        key={`reloan-${i}`}
                        className="[&>td]:px-1 [&>td]:py-0.5"
                      >
                        <td>{r.name || r.pn}</td>
                        <td className="text-right tabular-nums">
                          {num(r.existingDeduction)}
                        </td>
                        <td className="text-right tabular-nums">
                          {num(r.outstandingBalance)}
                        </td>
                        <td>{r.pn}</td>
                      </tr>
                    ))}
                    <tr className="[&>td]:px-1 [&>td]:py-0.5">
                      <td className="font-bold">Total Accounts for reloans</td>
                      <td
                        className="text-right font-bold tabular-nums"
                        style={DOUBLE_UNDERLINE}
                      >
                        {num(ebiDeductions)}
                      </td>
                      <td
                        className="text-right font-bold tabular-nums"
                        style={DOUBLE_UNDERLINE}
                      >
                        {num(ebiOb)}
                      </td>
                      <td />
                    </tr>
                  </>
                )}

                {buyOutRows.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={4} className="px-1 pt-2 font-bold">
                        Add: Buy-Out Accounts from other FI's
                      </td>
                    </tr>
                    {buyOutRows.map((b, i) => (
                      <tr
                        key={`buyout-${i}`}
                        className="[&>td]:px-1 [&>td]:py-0.5"
                      >
                        <td>{b.name || b.pn}</td>
                        <td className="text-right tabular-nums">
                          {num(b.amortization)}
                        </td>
                        <td className="text-right tabular-nums">
                          {num(b.outstandingBalance)}
                        </td>
                        <td>{b.pn}</td>
                      </tr>
                    ))}
                    <tr className="[&>td]:px-1 [&>td]:py-0.5">
                      <td className="font-bold">Total Accounts for Buy-out</td>
                      <td
                        className="text-right tabular-nums"
                        style={DOUBLE_UNDERLINE}
                      >
                        -
                      </td>
                      <td
                        className="text-right tabular-nums"
                        style={DOUBLE_UNDERLINE}
                      >
                        -
                      </td>
                      <td />
                    </tr>
                  </>
                )}

                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                  <td className="font-bold">Total Reloan&Buy-out Accounts</td>
                  <td
                    className="text-right font-bold tabular-nums"
                    style={DOUBLE_UNDERLINE}
                  >
                    {num(ebiDeductions)}
                  </td>
                  <td
                    className="text-right font-bold tabular-nums"
                    style={DOUBLE_UNDERLINE}
                  >
                    {num(ebiOb)}
                  </td>
                  <td />
                </tr>
                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                  <td className="font-bold">Total Disposable</td>
                  <td className="border-b border-black text-right font-bold tabular-nums">
                    {num(totalDisposableGross)}
                  </td>
                  <td />
                  <td />
                </tr>
                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                  <td className="font-bold">Less: Minimum NTHP</td>
                  <td className="text-right font-bold tabular-nums">
                    {num(minimumNthp)}
                  </td>
                  <td />
                  <td />
                </tr>

                {incomingRows.length > 0 && (
                  <>
                    <tr className="[&>td]:px-1 [&>td]:pt-2 [&>td]:font-bold">
                      <td colSpan={2}>Incoming/undeducted Loans:</td>
                      <td colSpan={2} className="underline">
                        Remarks on Incoming/Unded Loans
                      </td>
                    </tr>
                    {incomingRows.map((inc, i) => (
                      <tr
                        key={`incoming-${i}`}
                        className="[&>td]:px-1 [&>td]:py-0.5"
                      >
                        <td>{inc.name}</td>
                        <td className="text-right tabular-nums">
                          {num(inc.deductions)}
                        </td>
                        <td colSpan={2}>{inc.remarks}</td>
                      </tr>
                    ))}
                  </>
                )}

                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                  <td className="font-bold">Total Deductions</td>
                  <td className="border-b border-black text-right font-bold tabular-nums">
                    {num(totalDeductionsFinal)}
                  </td>
                  <td />
                  <td />
                </tr>
                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                  <td className="font-bold">Total Disposable</td>
                  <td
                    className="text-right font-bold tabular-nums"
                    style={DOUBLE_UNDERLINE}
                  >
                    {num(totalDisposableNet)}
                  </td>
                  <td />
                  <td />
                </tr>
                <tr className="[&>td]:px-1 [&>td]:py-0.5">
                  <td className="font-bold">Maximum Loanable Amount</td>
                  <td
                    className="text-right font-bold tabular-nums"
                    style={DOUBLE_UNDERLINE}
                  >
                    {maximumLoanableAmount < 0
                      ? `(PhP${num(Math.abs(maximumLoanableAmount))})`
                      : `PhP${num(maximumLoanableAmount)}`}
                  </td>
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
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

const BAND_MAIN = 'grid grid-cols-[58%_42%]'

export const ApprovalFormPreview = forwardRef<
  HTMLDivElement,
  {
    onGeneratePdf?: () => void
    lamIdByLoanNo?: Record<string, string>
  }
>(({ onGeneratePdf, lamIdByLoanNo }, ref) => {
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
                  hint: l.loanNo ? `…${l.loanNo.slice(-4)}` : '…',
                  metric: num(l.parameters?.proposedAmount ?? 0),
                  title: l.loanNo
                    ? `${l.loanNo} · ${l.productDescription ?? ''}`
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
          </>
        )}
      </div>
    </SectionCard>
  )
})

ApprovalFormPreview.displayName = 'ApprovalFormPreview'
