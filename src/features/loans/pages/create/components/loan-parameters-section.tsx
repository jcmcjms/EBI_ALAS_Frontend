import { CurrencyDollar } from '@phosphor-icons/react'
import { SectionCard } from './section-card'
import { getSection } from '@/src/features/loans/constants/sections'
import { LoanParametersFields } from './loan-parameters-fields'

interface LoanParametersSectionProps {
  fieldPrefix: string

  loanIndex: number
}

export function LoanParametersSection({
  fieldPrefix,
  loanIndex,
}: LoanParametersSectionProps) {
  const section = getSection('loan-params')

  return (
    <SectionCard
      step={section.step}
      title={`Loan Parameters ${loanIndex > 0 ? `(Loan ${loanIndex + 1})` : ''}`}
      description={section.description}
      icon={<CurrencyDollar size={20} weight="bold" className="text-primary" />}
    >
      <LoanParametersFields fieldPrefix={fieldPrefix} />
    </SectionCard>
  )
}
