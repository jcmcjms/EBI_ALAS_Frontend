import { useFormContext, useWatch } from 'react-hook-form'
import { CurrencyDollar } from '@phosphor-icons/react'
import { Badge } from '@/src/shared/ui/badge'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'
import { getSection } from '@/src/features/loans/constants/sections'
import { SectionCard } from './section-card'
import { PerLoanTabs } from './per-loan-tabs'
import { LoanParametersFields } from './loan-parameters-fields'

export function LoanParametersTabsSection() {
  const { control, formState } = useFormContext<LoanApplicationFormData>()
  const loans = useWatch({ control, name: 'loans' }) ?? []
  const loanErrors = formState.errors.loans
  const section = getSection('loan-params')

  if (loans.length === 0) {
    return (
      <SectionCard
        step={section.step}
        title={section.label}
        description={section.description}
        icon={
          <CurrencyDollar size={20} weight="bold" className="text-primary" />
        }
      >
        <div className="rounded-none border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          Select loan numbers in Step 1.3 to configure loan parameters.
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      icon={<CurrencyDollar size={20} weight="bold" className="text-primary" />}
      badge={
        <Badge variant="secondary">
          {loans.length} loan{loans.length === 1 ? '' : 's'}
        </Badge>
      }
    >
      <PerLoanTabs
        idPrefix="loan-params"
        ariaLabel="Selected loans"
        hasError={(i) => Boolean(loanErrors?.[i])}
        renderPanel={(_, i) => (
          <LoanParametersFields fieldPrefix={`loans.${i}.parameters`} />
        )}
      />
    </SectionCard>
  )
}
