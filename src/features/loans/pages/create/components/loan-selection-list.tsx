import { CheckCircle } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/shared/ui/tooltip'
import { cn } from '@/src/shared/lib/utils'
import type { PendingLoan } from '@/src/shared/lib/api/types'
import { extractProductCode } from './use-loan-loader'

interface LoanSelectionListProps {
  loans: PendingLoan[]
  selectedLoanNos: Set<string>
  selectedProductCodes: Set<string>
  onToggle: (loan: PendingLoan) => void
}

export function LoanSelectionList({
  loans,
  selectedLoanNos,
  selectedProductCodes,
  onToggle,
}: LoanSelectionListProps) {
  return (
    <section aria-label="Pending loan selection" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Loan Number
          </h4>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Select one or more (max 1 per product)
        </span>
      </div>

      <TooltipProvider>
        <div
          role="group"
          aria-label="Select loan numbers"
          className="grid gap-2"
        >
          {loans.map((l) => {
            const isSelected = selectedLoanNos.has(l.loanNo)
            const productCode = extractProductCode(l.productWithDescription)
            const isDisabled =
              !isSelected &&
              !!productCode &&
              selectedProductCodes.has(productCode)

            return (
              <Tooltip key={l.loanNo}>
                <TooltipTrigger>
                  <div
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-disabled={isDisabled || undefined}
                    tabIndex={isDisabled ? -1 : 0}
                    onClick={() => !isDisabled && onToggle(l)}
                    onKeyDown={(e) => {
                      if (
                        !isDisabled &&
                        (e.key === ' ' || e.key === 'Enter')
                      ) {
                        e.preventDefault()
                        onToggle(l)
                      }
                    }}
                    className={cn(
                      'group relative flex w-full items-start gap-3 rounded-md border bg-background p-3 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                        : 'border-border',
                      isDisabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                        isSelected
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground/40 group-hover:border-primary/60',
                      )}
                      aria-hidden
                    >
                      {isSelected && (
                        <CheckCircle
                          size={12}
                          weight="fill"
                          className="text-primary-foreground"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold">
                          {l.loanNo}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {l.productWithDescription}
                        </Badge>
                        {l.creationTypeLabel && (
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {l.creationTypeLabel}
                          </Badge>
                        )}
                        {l.loanPurpose && (
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {l.loanPurpose}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        Proposed Balance:{' '}
                        <span className="font-medium text-foreground">
                          ₱{(l.principal ?? 0).toLocaleString()}
                        </span>
                        {' · '}
                        Rate:{' '}
                        <span className="font-medium text-foreground">
                          {l.grantedRate ?? '—'}%
                        </span>
                        {l.totalTermDays != null && (
                          <>
                            {' · '}
                            Term:{' '}
                            <span className="font-medium text-foreground">
                              {l.totalTermDays}d
                            </span>
                          </>
                        )}
                        {l.policyTermMonths != null && (
                          <>
                            {' · '}
                            Policy Term:{' '}
                            <span className="font-medium text-foreground">
                              {l.policyTermMonths}mo
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </TooltipTrigger>
                {isDisabled && (
                  <TooltipContent>
                    <p>
                      Cannot select multiple loans of the same product (
                      {productCode}).
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </section>
  )
}