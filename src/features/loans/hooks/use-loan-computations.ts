import { useMemo } from 'react'
import { useWatch, useFormContext } from 'react-hook-form'

import {
  buildLoanMetricsSnapshot,
  computeLoanMetrics,
  type BuyOutRowCarrier,
  type EbiRowCarrier,
  type IncomingRowCarrier,
  type LoanComputationResults,
  type LoanParamsCarrier,
  type NthpCarrier,
  type OutstandingLoanCarrier,
} from '@/src/features/loans/model/loan-computations'
import type { LoanParameters } from '@/src/features/loans/schemas/schema'

export function useLoanComputations(
  params: LoanParameters | undefined,
): LoanComputationResults {
  const { control } = useFormContext()

  const client = useWatch({ control, name: 'client' })
  const outstandingLoans = useWatch({ control, name: 'outstandingLoans' })
  const ebiReloans = useWatch({ control, name: 'ebiReloans' })
  const buyOuts = useWatch({ control, name: 'buyOuts' })
  const incomingLoans = useWatch({ control, name: 'incomingLoans' })

  return useMemo(() => {
    const { loan: loanInputs, income } = buildLoanMetricsSnapshot({
      loan: (params ?? {}) as LoanParamsCarrier,
      client: (client ?? {}) as NthpCarrier,
      outstandingLoans: outstandingLoans as
        readonly OutstandingLoanCarrier[] | undefined,
      ebiReloans: ebiReloans as readonly EbiRowCarrier[] | undefined,
      buyOuts: buyOuts as readonly BuyOutRowCarrier[] | undefined,
      incomingLoans: incomingLoans as readonly IncomingRowCarrier[] | undefined,
    })

    return computeLoanMetrics(loanInputs, income)
  }, [params, client, outstandingLoans, ebiReloans, buyOuts, incomingLoans])
}
