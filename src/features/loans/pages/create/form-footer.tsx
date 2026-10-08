import { PaperPlaneTilt, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import type { SectionId } from '@/src/features/loans/constants/sections'

interface FormFooterProps {
  totalErrors: number
  isClientLoaded: boolean
  preLoanSelected: boolean
  loanCount: number
  canSubmit: boolean
  isSubmitting: boolean
  firstErrorSection?: SectionId
  onNavigateToError: (id: SectionId) => void
}

export function FormFooter({
  totalErrors,
  isClientLoaded,
  preLoanSelected,
  loanCount,
  canSubmit,
  isSubmitting,
  firstErrorSection,
  onNavigateToError,
}: FormFooterProps) {
  return (
    <footer className="sticky bottom-0 z-20 border-t bg-background/95 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {totalErrors > 0 ? (
          <div
            className="hidden items-center gap-1.5 text-sm text-destructive md:flex"
            role="alert"
          >
            <WarningCircle size={16} weight="fill" />
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
          <p
            id="submit-hint"
            className="hidden text-sm text-muted-foreground md:block"
          >
            {!isClientLoaded
              ? 'Search for a CIS number to begin.'
              : !preLoanSelected
                ? 'Select at least one loan to continue.'
                : `${loanCount} loan${loanCount === 1 ? '' : 's'} selected. Ready for processing.`}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            size="lg"
            className="gap-2 px-6"
            disabled={!canSubmit || isSubmitting}
            aria-describedby={canSubmit ? undefined : 'submit-hint'}
          >
            <PaperPlaneTilt size={16} weight="bold" />
            {isSubmitting ? 'Submitting…' : 'Submit for Recommendation'}
          </Button>
        </div>
      </div>
    </footer>
  )
}