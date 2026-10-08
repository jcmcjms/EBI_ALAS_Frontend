import { cn } from '@/src/shared/lib/utils'
import { computeLoanMetrics } from '@/src/features/loans/model/loan-approval-utils'

type LoanMetrics = ReturnType<typeof computeLoanMetrics>
import {
  DOUBLE_UNDERLINE,
  TOP_DOUBLE,
  RailCell,
  num,
} from './approval-form-document-utils'

interface ObligationRow {
  name?: string
  pn?: string
  existingDeduction?: number
  amortization?: number
  outstandingBalance?: number
  deductions?: number
  remarks?: string
}

interface ObligationsSummaryTableProps {
  reloanRows: ObligationRow[]
  buyOutRows: ObligationRow[]
  incomingRows: ObligationRow[]
  c: LoanMetrics
}

export function ObligationsSummaryTable({
  reloanRows,
  buyOutRows,
  incomingRows,
  c,
}: ObligationsSummaryTableProps) {
  return (
    <table
      className={cn(
        'border border-black w-full table-fixed border-collapse border-t-0 break-inside-avoid',
      )}
    >
      <colgroup>
        <col className="w-[22%]" />
        <col className="w-[13%]" />
        <col className="w-[19%]" />
        <col className="w-[17%]" />
        <col className="w-[29%]" />
      </colgroup>
      <tbody>
        {reloanRows.length > 0 && (
          <>
            <tr>
              <td colSpan={4} className="px-1.5 py-0.5 font-bold">
                Add: EBI Accounts for reloans
              </td>
              <RailCell />
            </tr>
            <tr>
              <td className="px-1.5 py-0.5 font-bold underline">
                Name of Financial Institution
              </td>
              <td className="px-1.5 py-0.5 text-right font-bold underline">
                Deductions
              </td>
              <td className="px-1.5 py-0.5 text-right font-bold underline">
                OB to be paid/closed
              </td>
              <td className="px-1.5 py-0.5 font-bold underline">
                PN Number
              </td>
              <RailCell />
            </tr>
            {reloanRows.map((r, i) => (
              <tr key={`reloan-${i}`}>
                <td className="px-1.5 py-0.5">{r.name || r.pn}</td>
                <td className="px-1.5 py-0.5 text-center tabular-nums">
                  {num(r.existingDeduction)}
                </td>
                <td className="px-1.5 py-0.5 text-center tabular-nums">
                  {num(r.outstandingBalance)}
                </td>
                <td className="px-1.5 py-0.5">{r.pn}</td>
                <RailCell />
              </tr>
            ))}
            <tr>
              <td className="px-1.5 py-0.5 font-bold">
                Total Accounts for reloans
              </td>
              <td
                className="px-1.5 py-0.5 text-right font-bold tabular-nums"
                style={TOP_DOUBLE}
              >
                {num(c.ebiDeductions)}
              </td>
              <td
                className="px-1.5 py-0.5 text-right font-bold tabular-nums"
                style={TOP_DOUBLE}
              >
                {num(c.ebiOb)}
              </td>
              <td />
              <RailCell />
            </tr>
          </>
        )}

        {buyOutRows.length > 0 && (
          <>
            <tr>
              <td colSpan={4} className="px-1.5 py-0.5 font-bold">
                Add: Buy-Out Accounts from other FI's
              </td>
              <RailCell />
            </tr>
            {buyOutRows.map((b, i) => (
              <tr key={`buyout-${i}`}>
                <td className="px-1.5 py-0.5">{b.name || b.pn}</td>
                <td className="px-1.5 py-0.5 text-center tabular-nums">
                  {num(b.amortization)}
                </td>
                <td className="px-1.5 py-0.5 text-center tabular-nums">
                  {num(b.outstandingBalance)}
                </td>
                <td className="px-1.5 py-0.5">{b.pn}</td>
                <RailCell />
              </tr>
            ))}
            <tr>
              <td className="px-1.5 py-0.5 font-bold">
                Total Accounts for Buy-out
              </td>
              <td
                className="px-1.5 py-0.5 text-center tabular-nums"
                style={TOP_DOUBLE}
              >
                -
              </td>
              <td
                className="px-1.5 py-0.5 text-center tabular-nums"
                style={TOP_DOUBLE}
              >
                -
              </td>
              <td />
              <RailCell />
            </tr>
          </>
        )}

        {}
        <tr>
          <td className="px-1.5 py-0.5 font-bold">
            Total Reloan&Buy-out Accounts
          </td>
          <td
            className="px-1.5 py-0.5 text-right font-bold tabular-nums"
            style={TOP_DOUBLE}
          >
            {num(c.ebiDeductions)}
          </td>
          <td
            className="px-1.5 py-0.5 text-right font-bold tabular-nums"
            style={TOP_DOUBLE}
          >
            {num(c.ebiOb)}
          </td>
          <td />
          <RailCell />
        </tr>
        <tr>
          <td className="px-1.5 py-0.5 font-bold">Total Disposable</td>
          <td
            className="px-1.5 py-0.5 text-right tabular-nums"
            style={DOUBLE_UNDERLINE}
          >
            {num(c.totalDisposableGross)}
          </td>
          <td />
          <td />
          <RailCell />
        </tr>
        <tr>
          <td className="px-1.5 py-0.5 font-bold">Less: Minimum NTHP</td>
          <td className="px-1.5 py-0.5 text-right tabular-nums">
            {num(c.minimumNthp)}
          </td>
          <td />
          <td />
          <RailCell />
        </tr>

        {incomingRows.length > 0 && (
          <>
            <tr>
              <td className="px-1.5 py-0.5 font-bold">
                Incoming/undeducted Loans:
              </td>
              <td />
              <td
                colSpan={2}
                className="px-1.5 py-0.5 font-bold underline"
              >
                Remarks on Incoming/Unded Loans
              </td>
              <RailCell />
            </tr>
            {incomingRows.map((inc, i) => (
              <tr key={`incoming-${i}`}>
                <td className="px-1.5 py-0.5">{inc.name}</td>
                <td className="px-1.5 py-0.5 text-center tabular-nums">
                  {num(inc.deductions)}
                </td>
                <td colSpan={2} className="px-1.5 py-0.5">
                  {inc.remarks}
                </td>
                <RailCell />
              </tr>
            ))}
          </>
        )}

        <tr>
          <td className="px-1.5 py-0.5 font-bold">Total Deductions</td>
          <td
            className="px-1.5 py-0.5 text-right tabular-nums"
            style={TOP_DOUBLE}
          >
            {num(c.totalDeductionsFinal)}
          </td>
          <td />
          <td />
          <RailCell />
        </tr>
        <tr>
          <td className="px-1.5 py-0.5 font-bold">Total Disposable</td>
          <td
            className="px-1.5 py-0.5 text-right font-bold tabular-nums"
            style={DOUBLE_UNDERLINE}
          >
            {num(c.totalDisposableNet)}
          </td>
          <td />
          <td />
          <RailCell />
        </tr>
        <tr>
          <td className="px-1.5 py-0.5 font-bold">
            Maximum Loanable Amount
          </td>
          <td
            className="px-1.5 py-0.5 text-right font-bold tabular-nums"
            style={DOUBLE_UNDERLINE}
          >
            {c.maximumLoanableAmount < 0
              ? `(PhP${num(Math.abs(c.maximumLoanableAmount))})`
              : `PhP${num(c.maximumLoanableAmount)}`}
          </td>
          <td />
          <td />
          <RailCell />
        </tr>
      </tbody>
    </table>
  )
}