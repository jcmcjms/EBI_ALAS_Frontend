import { create } from 'zustand/react'

interface EscalationState {
  escalatedLoanIds: Set<string>

  markEscalated: (loanId: number | string) => void

  isEscalated: (loanId: number | string) => boolean

  clearEscalated: (loanId: number | string) => void
}

export const useEscalationStore = create<EscalationState>((set, get) => ({
  escalatedLoanIds: new Set(),

  markEscalated: (loanId) =>
    set((state) => {
      const next = new Set(state.escalatedLoanIds)
      next.add(String(loanId))
      return { escalatedLoanIds: next }
    }),

  isEscalated: (loanId) => get().escalatedLoanIds.has(String(loanId)),

  clearEscalated: (loanId) =>
    set((state) => {
      const next = new Set(state.escalatedLoanIds)
      next.delete(String(loanId))
      return { escalatedLoanIds: next }
    }),
}))
