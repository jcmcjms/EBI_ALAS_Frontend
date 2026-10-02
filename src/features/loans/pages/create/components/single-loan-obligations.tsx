import { cn } from '@/src/shared/lib/utils'
import { computeLoanMetrics } from '@/src/features/loans/utils/loan-approval-utils'
import {
  DOUBLE_UNDERLINE,
  num,
} from './approval-form-preview-utils'

type LoanMetrics = ReturnType<typeof computeLoanMetrics>

interface ObligationRow {
  name?: string
  pn?: string
  existingDeduction?: number
  amortization?: number
  outstandingBalance?: number
  deductions?: number
  remarks?: string
}

interface SingleLoanObligationsProps {
  reloanRows: ObligationRow[]
  buyOutRows: ObligationRow[]
  incomingRows: ObligationRow[]
  c: LoanMetrics
}

export function SingleLoanObligations({
  reloanRows,
  buyOutRows,
  incomingRows,
  c,
}: SingleLoanObligationsProps) {
  const ebiDeductions = c.ebiDeductions
  const ebiOb = c.ebiOb
  const totalDisposableGross = c.totalDisposableGross
  const minimumNthp = c.minimumNthp
  const totalDeductionsFinal = c.totalDeductionsFinal
  const totalDisposableNet = c.totalDisposableNet
  const maximumLoanableAmount = c.maximumLoanableAmount

  return (
    <div className={cn('border border-black border-t-0 p-2 break-inside-avoid')}>
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
  )
}