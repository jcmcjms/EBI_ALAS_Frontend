import { createContext, useContext, type ReactNode } from 'react'

import { useActiveLoan } from './active-loan-context'
import { useLoanTransfers } from '@/src/features/loans/hooks/use-loan-transfers'

type LoanTransfersContextValue = ReturnType<typeof useLoanTransfers>

const LoanTransfersContext = createContext<LoanTransfersContextValue | null>(
  null,
)

export function LoanTransfersProvider({ children }: { children: ReactNode }) {
  const { activeIndex, loans } = useActiveLoan()
  const value = useLoanTransfers(loans.length > 0 ? activeIndex : null)
  return (
    <LoanTransfersContext.Provider value={value}>
      {children}
    </LoanTransfersContext.Provider>
  )
}

export function useLoanTransfersContext(): LoanTransfersContextValue {
  const ctx = useContext(LoanTransfersContext)
  if (!ctx) {
    throw new Error(
      'useLoanTransfersContext must be used within <LoanTransfersProvider> ' +
        '(mount it inside <FormProvider> in loan-creation.tsx).',
    )
  }
  return ctx
}
