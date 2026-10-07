import { format } from 'date-fns'
import {
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  UserCircle,
} from '@phosphor-icons/react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/src/shared/ui/accordion'
import { Button } from '@/src/shared/ui/button'
import { RichText } from '@/src/shared/ui/rich-text'
import type { RevisionRequest } from '../types/revision-request'
import type { SectionId } from '@/src/features/loans/constants/sections'

interface RevisionFeedbackBannerProps {
  requests: RevisionRequest[]
  onNavigateToSection?: (sectionId: SectionId) => void
}

export function RevisionFeedbackBanner({
  requests,
  onNavigateToSection,
}: RevisionFeedbackBannerProps) {
  const active = requests.find((r) => !r.isResolved) ?? requests[0]
  if (!active) return null

  const feedbackSections = active.sections.filter(
    (s) => s.comments.trim().length > 0,
  )

  return (
    <section
      aria-label="Revision feedback"
      className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 px-4 py-3 dark:border-amber-500/20">
        <ArrowCounterClockwise
          size={18}
          weight="bold"
          className="shrink-0 text-amber-600 dark:text-amber-400"
        />
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Revision Requested
        </h2>
        {active.isResolved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle size={10} weight="fill" /> Resolved
          </span>
        ) : (
          <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:bg-amber-400/20 dark:text-amber-300">
            Pending
          </span>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-1.5 text-xs text-amber-800/90 dark:text-amber-200/70">
          <UserCircle size={14} />
          {active.requestedByName} ({active.requestedByRole}) &bull;{' '}
          {format(new Date(active.requestedAt), 'MMM d, yyyy h:mm a')}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="text-xs text-amber-950 dark:text-amber-100">
          <RichText value={active.overallComments} emptyFallback={null} />
        </div>

        {feedbackSections.length > 0 && (
          <Accordion
            multiple
            defaultValue={[feedbackSections[0].sectionId]}
            className="rounded-md border border-amber-200 bg-background/60 px-3 dark:border-amber-500/20"
          >
            {feedbackSections.map((s) => (
              <AccordionItem key={s.sectionId} value={s.sectionId}>
                <AccordionTrigger className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  {s.sectionLabel}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    <div className="border-l-2 border-amber-300 pl-2 text-amber-950 dark:border-amber-500/40 dark:text-amber-100">
                      <RichText value={s.comments} emptyFallback={null} />
                    </div>
                    {onNavigateToSection && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 border-amber-300 bg-amber-50 text-xs text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
                        onClick={() => onNavigateToSection(s.sectionId as SectionId)}
                      >
                        <ArrowRight size={12} weight="bold" />
                        Go to {s.sectionLabel}
                      </Button>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  )
}
