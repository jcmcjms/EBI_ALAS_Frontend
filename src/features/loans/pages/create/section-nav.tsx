import { Badge } from '@/src/shared/ui/badge'
import { cn } from '@/src/shared/lib/utils'

import type { SectionId, SectionDef } from '@/src/features/loans/constants/sections'
import { StatusIcon, useSectionProgress } from './section-stepper-utils'

export interface StepperProps {
  activeSection: SectionId
  isClientLoaded: boolean
  preLoanSelected: boolean
  submitAttempted: boolean
  onNavigate: (id: SectionId) => void
  visibleSections: readonly SectionDef[]
}

export function DesktopStepper({
  activeSection,
  isClientLoaded,
  preLoanSelected,
  submitAttempted,
  onNavigate,
  visibleSections,
}: StepperProps) {
  const { getStatus, errorCount, isComplete } = useSectionProgress(
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    activeSection,
  )

  const readyCount = visibleSections.filter(
    (s) => isComplete(s.id) || (s.systemSourced && isClientLoaded),
  ).length

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-[calc(var(--header-height)+1rem)] space-y-6">
        <div className="space-y-2 px-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground">
              Application progress
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {readyCount} of {visibleSections.length} ready
            </span>
          </div>
          <div
            className="h-1 rounded-full bg-muted"
            role="progressbar"
            aria-label="Sections ready"
            aria-valuemin={0}
            aria-valuemax={visibleSections.length}
            aria-valuenow={readyCount}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${(readyCount / visibleSections.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <nav aria-label="Application sections" className="space-y-1">
          {visibleSections.map((section, index) => {
            const status = getStatus(section, index)
            const errors = errorCount(section.id)
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                disabled={status === 'locked'}
                aria-current={status === 'active' ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all',
                  status === 'active'
                    ? 'border-l-4 border-primary bg-primary/5 pl-2 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  status === 'locked' &&
                    'cursor-not-allowed opacity-50 hover:bg-transparent',
                )}
              >
                <div className="flex w-6 shrink-0 items-center justify-center">
                  <StatusIcon status={status} />
                </div>
                <span className="min-w-0 flex-1 truncate">
                  {section.step}. {section.label}
                </span>
                {errors > 0 ? (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1 tabular-nums text-[10px]"
                  >
                    {errors}
                  </Badge>
                ) : status === 'auto' ? (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Auto
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

export function MobileSectionNav({
  activeSection,
  isClientLoaded,
  preLoanSelected,
  submitAttempted,
  onNavigate,
  visibleSections,
}: StepperProps) {
  const { getStatus, errorCount } = useSectionProgress(
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    activeSection,
  )

  return (
    <div className="sticky top-[var(--header-height)] z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <nav aria-label="Application sections">
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {visibleSections.map((section, index) => {
            const status = getStatus(section, index)
            const errors = errorCount(section.id)
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                disabled={status === 'locked'}
                aria-current={status === 'active' ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  status === 'active'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : status === 'error'
                      ? 'border-destructive/40 bg-destructive/5 text-destructive'
                      : status === 'complete' || status === 'auto'
                        ? 'border-primary/30 bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground',
                  status === 'locked' && 'opacity-50',
                )}
              >
                {section.step}. {section.label}
                {errors > 0 && (
                  <span className="tabular-nums font-bold">({errors})</span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}