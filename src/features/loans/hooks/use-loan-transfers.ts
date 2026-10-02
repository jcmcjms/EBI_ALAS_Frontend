import { useCallback } from 'react'
import {
  useFieldArray,
  useFormContext,
  type Control,
  type FieldPath,
} from 'react-hook-form'
import { toastSuccess, toastError } from '@/src/shared/ui/toast'

import {
  LOAN_SECTION_LABELS,
  mapToEbi,
  mapToOutstanding,
  type TransferSourceRow,
} from '../utils/loan-transfer-utils'
import type {
  LoanApplicationFormData,
  OutstandingLoan,
} from '../schemas/schema'

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
      toastError('Select a loan number in Step 1.3 before adding obligations.')
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
    ) => {
      if (source === target) return

      if (target === 'ebi' && activeLoanIndex === null) {
        toastError(
          'Select a loan number in Step 1.3 before transferring to EBI accounts.',
        )
        return
      }

      if (source === 'outstanding') {
        const live =
          (getValues('outstandingLoans') as OutstandingLoan[] | undefined) ?? []
        const rowData = live[rowIndex]
        if (!rowData) {
          toastError('Could not transfer loan — source row not found.')
          return
        }
        const mapped = mapToEbi(normalize(rowData), 'outstanding')
        const targetIndex = activeLoanIndex as number
        setRows(targetIndex, 'ebiReloans', [
          ...getRows(targetIndex, 'ebiReloans'),
          mapped,
        ])
        outstanding.remove(rowIndex)
      } else {
        const sourceIndex = activeLoanIndex as number
        const live = getRows<TransferSourceRow>(sourceIndex, 'ebiReloans')
        const rowData = live[rowIndex]
        if (!rowData) {
          toastError('Could not transfer loan — source row not found.')
          return
        }
        const mapped = mapToOutstanding(normalize(rowData), 'ebi')
        setRows(
          sourceIndex,
          'ebiReloans',
          live.filter((_, i) => i !== rowIndex),
        )
        outstanding.append(mapped as never, { shouldFocus: false })
      }

      toastSuccess(
        `Transferred loan to ${LOAN_SECTION_LABELS[target === 'ebi' ? 'ebi' : 'outstanding']}`,
      )
    },

    [activeLoanIndex, outstanding],
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
