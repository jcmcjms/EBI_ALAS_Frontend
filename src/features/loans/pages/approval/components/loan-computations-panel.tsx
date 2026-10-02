import { cn } from '@/src/shared/lib/utils'
import type {
  LoanApplicationFormData,
  SelectedLoan,
} from '@/src/features/loans/schemas/schema'
import { computeLoanMetrics } from '@/src/features/loans/utils/loan-approval-utils'

type LoanMetrics = ReturnType<typeof computeLoanMetrics>
import {
  BLUE,
  B,
  DOUBLE_UNDERLINE,
  AmtRow,
  num,
  dash,
  isoDate,
} from './approval-form-document-utils'

interface LoanComputationsPanelProps {
  c: LoanMetrics
  params: NonNullable<SelectedLoan['parameters']>
  primaryLoan: SelectedLoan
  outstandingLoans: LoanApplicationFormData['outstandingLoans']
}

export function LoanComputationsPanel({
  c,
  params,
  primaryLoan,
  outstandingLoans,
}: LoanComputationsPanelProps) {
  return (
    <div className="grid grid-cols-2">
      {}
      <div className={cn(B, 'border-r-0 p-2')}>
        <AmtRow
          label={
            <span className="font-bold">Maximum Loanable Amount **</span>
          }
          value={num(c.maximumLoanableAmount)}
          blue
          underline
        />
        <AmtRow
          label={
            <span className="font-bold">Proposed Loan for Approval</span>
          }
          value={
            <span className="font-bold">{num(params.proposedAmount)}</span>
          }
          blue
        />
        <div className="pt-1 font-bold" style={DOUBLE_UNDERLINE}>
          Less:
        </div>
        <div className="pl-3">
          <AmtRow
            label="Application Charge"
            value={num(c.applicationCharge)}
          />
          <AmtRow label="Doc. Stamp" value={num(c.docStamp)} />
          <AmtRow label="Notarial Fee" value={num(c.notarialFee)} />
          <AmtRow label="Insurance (MRI)" value="-" />
          <AmtRow label="Advance Interest" value="-" />
        </div>
        <div className="flex items-end justify-between gap-2 py-[1px]">
          <span className="font-bold">Total Deductions</span>
          <span className="tabular-nums">{c.deductionPct.toFixed(2)}%</span>
          <span className="min-w-24 border-b border-black text-right tabular-nums">
            {num(c.deductionsSubtotal)}
          </span>
        </div>
        <AmtRow
          label={<span className="font-bold">GROSS PROCEEDS</span>}
          value={<span className="font-bold">{num(c.grossProceeds)}</span>}
          blue
          underline
        />
        <div className="h-3" />
        <AmtRow
          label={
            <span className="font-bold">Less: Total Accounts Balance</span>
          }
          value={num(c.ebiOb)}
          underline
        />
        <AmtRow
          label={
            <span className="font-bold">
              Net Proceeds on DS for CM/MC
            </span>
          }
          value={num(c.netProceedsDs)}
          underline
        />
        <div className="h-3" />
        <AmtRow
          label={
            <span className="font-bold">Less: Total Buy-Out Balance</span>
          }
          value={num(c.buyOutBalance)}
          underline
        />
        <AmtRow
          label={<span className="font-bold">NET PROCEEDS to Client</span>}
          value={
            <span className="font-bold">{num(c.netProceedsClient)}</span>
          }
          blue
        />
        <div className="h-3" />
        <AmtRow
          label={<span className="font-bold">Monthly Amortization</span>}
          value={`PHP ${num(c.amortization)}`}
          underline
        />
        <div className="h-3" />
        <AmtRow
          label={<span className="font-bold">NetPay After Deduction</span>}
          value={num(c.netPayAfterDeduction)}
          underline
        />
        <div className="h-3" />
        <div className="flex items-end justify-between gap-2 py-[1px]">
          <span className="font-bold">Net Take Home Pay as of:</span>
          <span className={cn(`${BLUE} px-1 font-bold`)}>
            {isoDate(params.nthpDate || new Date().toISOString())}
          </span>
          <span className="min-w-24 border-b border-black text-right font-bold tabular-nums">
            {num(c.nthp)}
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
              <td className="border-b border-black text-right font-bold tabular-nums">
                {num(c.totalPrincipal)}
              </td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="pt-2 font-bold">This loan availment:</div>
        <div className="flex justify-between px-1 py-[1px]">
          <span>{dash(primaryLoan.loanNo)}</span>
          <span className="tabular-nums">{num(params.proposedAmount)}</span>
          <span className="tabular-nums">{num(params.proposedAmount)}</span>
        </div>
        <div className="flex justify-end px-1 py-[1px]">
          <span className="min-w-24 border-b border-black text-right tabular-nums">
            {num(params.proposedAmount)}
          </span>
        </div>
        <div className="flex items-end justify-between px-1 py-[1px]">
          <span className="font-bold">Total Exposure</span>
          <span
            className={`${BLUE} px-1 font-bold tabular-nums`}
            style={DOUBLE_UNDERLINE}
          >
            {num(c.totalExposure)}
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
              value={num(c.netPayAfterDeduction)}
            />
            <div className="italic">Other Income:</div>
            <AmtRow
              label={<span className="pl-3">NONE</span>}
              value="-"
            />
            <AmtRow
              label={<i>Total Monthly Income</i>}
              value={num(c.totalMonthlyIncome)}
              underline
            />
          </div>
        </div>
      </div>
    </div>
  )
}