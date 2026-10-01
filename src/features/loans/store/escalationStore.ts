import { create } from 'zustand/react'

interface EscalationState {
  escalatedLoanIds: Set<number>

  markEscalated: (loanId: number) => void

  isEscalated: (loanId: number) => boolean

  clearEscalated: (loanId: number) => void
}

export const useEscalationStore = create<EscalationState>((set, get) => ({
  escalatedLoanIds: new Set(),

  markEscalated: (loanId) =>
    set((state) => {
      const next = new Set(state.escalatedLoanIds)
      next.add(loanId)
      return { escalatedLoanIds: next }
    }),

  isEscalated: (loanId) => get().escalatedLoanIds.has(loanId),

  clearEscalated: (loanId) =>
    set((state) => {
      const next = new Set(state.escalatedLoanIds)
      next.delete(loanId)
      return { escalatedLoanIds: next }
    }),
}))
