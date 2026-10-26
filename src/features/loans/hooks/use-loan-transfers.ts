import { useCallback } from 'react'
import {
  useFieldArray,
  useFormContext,
  type Control,
  type FieldPath,
} from 'react-hook-form'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'

import {
  LOAN_SECTION_LABELS,
  mapToEbi,
  mapToOutstanding,
  type TransferSourceRow,
} from '../model/loan-transfer-utils'
import type { LoanApplicationFormData, OutstandingLoan } from '../schemas/schema'

export type PerLoanArrayKind = 'ebiReloans' | 'buyOuts' | 'incomingLoans'

type ArrayPath = FieldPath<LoanApplicationFormData>

const normalize = (v: unknown): TransferSourceRow =>
  typeof v === 'object' && v !== null ? (v as TransferSourceRow) : {}

export function useLoanTransfers(activeLoanIndex: number | null) {
  const { control, getValues, setValue } =
    useFormContext<LoanApplicationFormData>()

  const outstanding = useFieldArray({ control, name: 'outstandingLoans' })

  const arrayPath = (index: number, kind: PerLoanArrayKind) =>
    `loans.${index}.${kind}` as ArrayPath

  const getRows = <T>(index: number, kind: PerLoanArrayKind): T[] =>
    (getValues(arrayPath(index, kind)) as T[] | undefined) ?? []

  const setRows = (index: number, kind: PerLoanArrayKind, next: unknown[]) =>
    setValue(arrayPath(index, kind), next as never, { shouldDirty: true })

  const requireActive = (): number | null => {
    if (activeLoanIndex === null) {
      toastError('Select a loan number under 1.3 Account & preloan first.')
      return null
    }
    return activeLoanIndex
  }

  const appendRow = useCallback(
    (kind: PerLoanArrayKind, row: unknown) => {
      const index = requireActive()
      if (index === null) return
      setRows(index, kind, [...getRows(index, kind), row])
    },

    [activeLoanIndex],
  )

  const removeRow = useCallback(
    (kind: PerLoanArrayKind, rowIndex: number) => {
      const index = requireActive()
      if (index === null) return
      setRows(
        index,
        kind,
        getRows(index, kind).filter((_, i) => i !== rowIndex),
      )
    },

    [activeLoanIndex],
  )

  const handleTransfer = useCallback(
    (
      source: 'outstanding' | 'ebi',
      rowIndex: number,
      target: 'outstanding' | 'ebi',
      loanIndex: number,
    ) => {
      if (source === target) return

      const loanPath = (kind: 'outstandingLoans' | 'ebiReloans') =>
        `loans.${loanIndex}.${kind}` as ArrayPath

      const liveOutstanding =
        (getValues(loanPath('outstandingLoans')) as
          | OutstandingLoan[]
          | undefined) ?? []
      const liveEbi =
        (getValues(loanPath('ebiReloans')) as TransferSourceRow[] | undefined) ??
        []

      if (source === 'outstanding' && target === 'ebi') {
        const rowData = liveOutstanding[rowIndex]
        if (!rowData) {
          toastError("Couldn't find that loan to transfer. Refresh and try again.")
          return
        }
        const mapped = mapToEbi(normalize(rowData), 'outstanding')
        setValue(
          loanPath('outstandingLoans'),
          liveOutstanding.filter((_, i) => i !== rowIndex) as never,
          { shouldDirty: true },
        )
        setValue(loanPath('ebiReloans'), [...liveEbi, mapped] as never, {
          shouldDirty: true,
        })
      } else if (source === 'ebi' && target === 'outstanding') {
        const rowData = liveEbi[rowIndex]
        if (!rowData) {
          toastError("Couldn't find that loan to transfer. Refresh and try again.")
          return
        }
        const mapped = mapToOutstanding(normalize(rowData), 'ebi')
        setValue(
          loanPath('ebiReloans'),
          liveEbi.filter((_, i) => i !== rowIndex) as never,
          { shouldDirty: true },
        )
        setValue(
          loanPath('outstandingLoans'),
          [...liveOutstanding, mapped] as never,
          { shouldDirty: true },
        )
      }

      toastSuccess(
        `Transferred loan to ${LOAN_SECTION_LABELS[target === 'ebi' ? 'ebi' : 'outstanding']}`,
      )
    },

    [getValues, setValue],
  )

  return {
    outstanding,
    activeLoanIndex,
    getRows,
    appendRow,
    removeRow,
    handleTransfer,
    control: control as Control<LoanApplicationFormData>,
  }
}
