import { useFormContext, useWatch, type FieldPath } from 'react-hook-form'
import { Badge } from '@/src/shared/ui/primitives/badge'

import { useLoanTransfersContext } from '../loan-transfers-provider'
import { SectionCard } from './section-card'
import { PerLoanTabs } from './per-loan-tabs'
import { getSection } from '@/src/features/loans/constants/sections'
import { useActiveLoan } from '../active-loan-context'
import { EbiReloansTable } from './ebi-reloans-table'
import { BuyoutAccountsTable } from './buyout-accounts-table'
import { IncomingLoansTable } from './incoming-loans-table'
import type {
  LoanApplicationFormData,
  EbiReloan,
  BuyOut,
  IncomingLoan,
} from '@/src/features/loans/schemas/schema'
import { parseProductCode } from '@/src/features/loans/model/loan-product-display'

/** ATM / salary products do not declare incoming loans on the create form. */
const HIDES_INCOMING_PRODUCTS = new Set(['C02', 'C21', 'C23', 'C35'])

export function OtherObligationsSection() {
  const { loans } = useActiveLoan()
  const section = getSection('other-obligations')

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      contentClassName="p-0 divide-y"
      badge={
        loans.length > 0 ? (
          <Badge variant="secondary">
            {loans.length} loan{loans.length === 1 ? '' : 's'}
          </Badge>
        ) : undefined
      }
    >
      {loans.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Select loan numbers under 1.3 Account & preloan to declare obligations per loan.
        </div>
      ) : (
        <PerLoanTabs
          idPrefix="other-obligations"
          ariaLabel="Obligations per loan"
          mountStrategy="active-only"
          renderPanel={(_loan, i) => <OtherObligationsFields loanIndex={i} />}
        />
      )}
    </SectionCard>
  )
}

function OtherObligationsFields({ loanIndex }: { loanIndex: number }) {
  const { control, setValue } = useFormContext<LoanApplicationFormData>()
  const { appendRow, removeRow, handleTransfer } = useLoanTransfersContext()

  const P = `loans.${loanIndex}`

  const ebi =
    (useWatch({
      control,
      name: `${P}.ebiReloans` as FieldPath<LoanApplicationFormData>,
    }) as EbiReloan[] | undefined) ?? []
  const buyOuts =
    (useWatch({
      control,
      name: `${P}.buyOuts` as FieldPath<LoanApplicationFormData>,
    }) as BuyOut[] | undefined) ?? []
  const incoming =
    (useWatch({
      control,
      name: `${P}.incomingLoans` as FieldPath<LoanApplicationFormData>,
    }) as IncomingLoan[] | undefined) ?? []
  const productRaw = useWatch({
    control,
    name: `${P}.parameters.product` as FieldPath<LoanApplicationFormData>,
  }) as string | undefined
  const loanProductCode = useWatch({
    control,
    name: `${P}.productCode` as FieldPath<LoanApplicationFormData>,
  }) as string | undefined
  const productCode = parseProductCode(productRaw) || (loanProductCode ?? '')
  const showIncoming = !HIDES_INCOMING_PRODUCTS.has(productCode)

  const setCell = (path: string, value: unknown) =>
    setValue(path as FieldPath<LoanApplicationFormData>, value as never, {
      shouldDirty: true,
    })

  const addBuyOut = () =>
    appendRow('buyOuts', {
      pn: '',
      name: '',
      amortization: 0,
      outstandingBalance: 0,
    })
  const addIncoming = () =>
    appendRow('incomingLoans', { name: '', deductions: 0, remarks: '' })

  return (
    <>
      <EbiReloansTable
        rows={ebi}
        loanPath={P}
        setCell={setCell}
        handleTransfer={handleTransfer}
      />
      <BuyoutAccountsTable
        rows={buyOuts}
        loanPath={P}
        setCell={setCell}
        addBuyOut={addBuyOut}
        removeRow={removeRow}
      />
      {showIncoming && (
        <IncomingLoansTable
          rows={incoming}
          loanPath={P}
          setCell={setCell}
          addIncoming={addIncoming}
          removeRow={removeRow}
        />
      )}
    </>
  )
}