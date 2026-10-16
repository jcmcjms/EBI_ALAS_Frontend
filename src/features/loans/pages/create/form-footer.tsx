import {
  ArrowLeft,
  ArrowRight,
  PaperPlaneTilt,
  WarningCircle,
} from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import type { SectionId } from '@/src/features/loans/constants/sections'
import { formFooterMode } from './form-footer-utils'

interface FormFooterProps {
  totalErrors: number
  activeSection: SectionId
  visibleSectionIds: SectionId[]
  canSubmit: boolean
  isSubmitting: boolean
  firstErrorSection?: SectionId
  onNavigateToError: (id: SectionId) => void
  maxLoanableBlock?: { loanLabel: string } | null
  onNext: () => void
  onBack: () => void
}

export function FormFooter({
  totalErrors,
  activeSection,
  visibleSectionIds,
  canSubmit,
  isSubmitting,
  firstErrorSection,
  onNavigateToError,
  maxLoanableBlock,
  onNext,
  onBack,
}: FormFooterProps) {
  const { isFirst, isLast, primary } = formFooterMode(
    activeSection,
    visibleSectionIds,
  )

  return (
    <footer className="sticky bottom-0 z-20 border-t bg-background/95 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6">
        <div className="min-w-0 flex-1">
          {maxLoanableBlock ? (
            <div
              className="flex items-center gap-1.5 text-sm text-destructive"
              role="alert"
            >
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <p>
                {maxLoanableBlock.loanLabel}: Maximum Loanable Amount does not
                cover the proposed loan.
              </p>
            </div>
          ) : totalErrors > 0 ? (
            <div
              className="flex items-center gap-1.5 text-sm text-destructive"
              role="alert"
            >
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <button
                type="button"
                onClick={() =>
                  firstErrorSection && onNavigateToError(firstErrorSection)
                }
                className="underline-offset-4 hover:underline"
              >
                {totalErrors} field{totalErrors === 1 ? '' : 's'} need
                {totalErrors === 1 ? 's' : ''} attention — jump to first
              </button>
            </div>
          ) : (
            <p className="hidden text-sm text-muted-foreground md:block">
              {isLast
                ? 'Review your application details before submitting.'
                : 'All changes stay in this session as you work.'}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {!isFirst && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={onBack}
            >
              <ArrowLeft size={16} weight="bold" /> Back
            </Button>
          )}
          {primary === 'submit' ? (
            <Button
              type="submit"
              size="lg"
              className="gap-2 px-6"
              disabled={!canSubmit || isSubmitting}
            >
              <PaperPlaneTilt size={16} weight="bold" />
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              className="gap-2 px-6"
              onClick={onNext}
            >
              Continue <ArrowRight size={16} weight="bold" />
            </Button>
          )}
        </div>
      </div>
    </footer>
  )
}
