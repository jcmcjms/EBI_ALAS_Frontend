import { RichText } from '@/src/shared/ui/rich-text'
import { cn } from '@/src/shared/lib/utils'
import type {
  ClientFormData,
  LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import type { SelectedLoan } from '@/src/features/loans/schemas/schema'
import type { SignatureSlotDto } from '@/src/features/loans/api/signatures'
import type {
  LoanDeviationDto,
  DocumentRemarkDto,
} from '@/src/features/loans/api/loan-review'
import {
  B,
  BLUE,
  buildUnifiedAuditTrail,
  dash,
  formatActionTime,
  fullNameOf,
  isoDate,
  type ApprovalFormActionEntry,
} from './approval-form-document-utils'

interface AuditTrailSectionProps {
  actions: ApprovalFormActionEntry[] | undefined
  deviationThreads: LoanDeviationDto[] | undefined
  documentRemarks: DocumentRemarkDto[] | undefined
  client: ClientFormData
  branchType: LoanApplicationFormData['branchType']
  primaryLoan: SelectedLoan
  data: LoanApplicationFormData
}

export function AuditTrailSection({
  actions,
  deviationThreads,
  documentRemarks,
  client,
  branchType,
  primaryLoan,
  data,
}: AuditTrailSectionProps) {
  const unifiedTrail = buildUnifiedAuditTrail(
    actions,
    deviationThreads,
    documentRemarks,
  )
  if (unifiedTrail.length === 0) return null

  return (
    <section className="hidden break-before-page print:block">
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
        <div className={cn(B, 'text-center font-bold')}>
          APPLICATION HISTORY &amp; REMARKS
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                colSpan={5}
                className="border border-black bg-[#d9eaf7] px-1.5 py-1 text-left text-xs font-bold uppercase tracking-wider"
              >
                History recorded by the system
              </th>
            </tr>
            <tr className="[&>th]:border-b [&>th]:border-black [&>th]:px-1.5 [&>th]:py-1 [&>th]:text-left [&>th]:text-xs [&>th]:font-bold">
              <th className="w-[12%]">Date / Time</th>
              <th className="w-[12%]">Type</th>
              <th className="w-[15%]">Actor</th>
              <th className="w-[20%]">Context</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            {unifiedTrail.map((entry) => {
              const typeColor =
                entry.type === 'action'
                  ? 'bg-blue-100 text-blue-800'
                  : entry.type === 'deviation-remark'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'

              return (
                <tr
                  key={entry.id}
                  className="break-inside-avoid [&>td]:border [&>td]:border-black [&>td]:px-1.5 [&>td]:py-1 [&>td]:align-top"
                >
                  <td className="whitespace-nowrap tabular-nums">
                    <div className="text-[10px]">
                      {isoDate(entry.timestamp)}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {formatActionTime(entry.timestamp)}
                    </div>
                  </td>
                  <td className="text-[10px]">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 font-medium ${typeColor}`}
                    >
                      {entry.type === 'action'
                        ? 'Action'
                        : entry.type === 'deviation-remark'
                          ? 'Deviation'
                          : 'Document'}
                    </span>
                  </td>
                  <td className="text-xs">{dash(entry.actor)}</td>
                  <td className="text-[10px] text-slate-700">
                    {entry.type === 'action' ? (
                      <>
                        <div className="font-medium">
                          {dash(entry.label)}
                        </div>
                        <div className="text-slate-500">
                          {entry.context}
                        </div>
                      </>
                    ) : (
                      <div
                        className="truncate"
                        title={entry.context ?? ''}
                      >
                        {entry.context}
                      </div>
                    )}
                  </td>
                  <td className="text-xs">
                    {entry.content ? (
                      <RichText
                        value={entry.content}
                        emptyFallback={
                          <span className="text-slate-400">—</span>
                        }
                      />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="mt-4 px-2 pb-3 text-[10px] italic text-slate-600">
          End of application history for LAM {dash(branchType.lai)} · PN{' '}
          {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}.
          Generated{' '}
          {new Date().toLocaleString('en-PH', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          .
        </div>
      </div>
    </section>
  )
}