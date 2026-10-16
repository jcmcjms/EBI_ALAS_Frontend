import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { RichText } from '@/src/shared/ui/data-display/rich-text'
import { cn } from '@/src/shared/lib/utils'
import type {
  ClientFormData,
  LoanApplicationFormData,
  SelectedLoan,
} from '@/src/features/loans/schemas/schema'
import type { TimelineEvent } from '@/src/features/loans/api/loan-review'
import { getLoanTimeline } from '@/src/features/loans/api/loan-review-documents'
import {
  describeEvent,
  relativeTime,
} from '@/src/features/loans/model/loan-timeline'
import { B, dash, fullNameOf, isoDate } from './approval-form-document-utils'

const PAGE_SIZE = 50
const MAX_PAGES = 10

async function loadTimelineHistory(
  loanId: number | string,
): Promise<TimelineEvent[]> {
  const first = await getLoanTimeline(loanId, 1, PAGE_SIZE)
  const items = [...first.items]
  let page = 2
  while (
    (page - 1) * PAGE_SIZE < first.totalCount &&
    page <= MAX_PAGES
  ) {
    const next = await getLoanTimeline(loanId, page, PAGE_SIZE)
    items.push(...next.items)
    page += 1
  }
  return items
}

interface AuditTrailSectionProps {
  loanId: number | string
  
  lamId?: string
  client: ClientFormData
  primaryLoan: SelectedLoan
  data: LoanApplicationFormData
}

export function AuditTrailSection({
  loanId,
  lamId,
  client,
  primaryLoan,
  data,
}: AuditTrailSectionProps) {
  const enabled =
    loanId != null &&
    loanId !== '' &&
    loanId !== 'NaN' &&
    loanId !== 'undefined'

  const history = useQuery({
    queryKey: ['loans', 'review', loanId, 'print-history'],
    queryFn: () => loadTimelineHistory(loanId),
    enabled,
  })

  const events = history.data ?? []
  if (!enabled || events.length === 0) return null

  return (
    <section className="hidden break-before-page print:block">
      <div className="hidden print:mb-3 print:flex print:items-baseline print:justify-between print:border-b-2 print:border-black print:pb-1">
        <span className="text-sm font-bold underline">LOAN APPROVAL FORM</span>
        <span className="tabular-nums">
          {fullNameOf(client)} · LAM {dash(lamId)} · PN{' '}
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
                colSpan={4}
                className="border border-black bg-[#d9eaf7] px-1.5 py-1 text-left text-xs font-bold uppercase tracking-wider"
              >
                History Remarks
              </th>
            </tr>
            <tr className="[&>th]:border-b [&>th]:border-black [&>th]:px-1.5 [&>th]:py-1 [&>th]:text-left [&>th]:text-xs [&>th]:font-bold">
              <th className="w-[16%]">Date / Time</th>
              <th className="w-[18%]">Actor</th>
              <th className="w-[28%]">Event</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const sentence = describeEvent(event)
              const dayKey = format(
                new Date(event.occurredAtUtc),
                'yyyy-MM-dd',
              )
              return (
                <tr
                  key={event.id}
                  data-day={dayKey}
                  className="break-inside-avoid [&>td]:border [&>td]:border-black [&>td]:px-1.5 [&>td]:py-1 [&>td]:align-top"
                >
                  <td className="whitespace-nowrap tabular-nums">
                    <div className="text-[10px]">
                      {isoDate(event.occurredAtUtc)}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {relativeTime(event.occurredAtUtc)}
                    </div>
                  </td>
                  <td className="text-xs">
                    <div className="font-medium">
                      {event.actorName ?? 'System'}
                    </div>
                    {event.actorRole ? (
                      <div className="text-[10px] text-slate-600">
                        {event.actorRole}
                      </div>
                    ) : null}
                  </td>
                  <td className="text-xs">
                    <div>
                      {sentence.headline}
                      {sentence.subject ? (
                        <span className="font-medium">
                          : {sentence.subject}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="text-xs">
                    {event.comment ? (
                      <RichText
                        value={event.comment}
                        emptyFallback={<span className="text-slate-400">—</span>}
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
          End of application history for LAM {dash(lamId)} · PN{' '}
          {dash(primaryLoan.loanNo || data?.outstandingLoans[0]?.pn)}. Generated{' '}
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
