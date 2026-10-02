import { useWatch, useFormContext } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import {
  CheckCircle,
  CloudCheck,
  LockSimple,
  WarningCircle,
} from '@phosphor-icons/react'

import type {
  LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'

import {
  SECTIONS,
  type SectionId,
  type SectionDef,
} from '@/src/features/loans/constants/sections'

export type SectionStatus =
  'active' | 'complete' | 'auto' | 'error' | 'locked' | 'upcoming'

function countFieldErrors(node: unknown): number {
  if (!node || typeof node !== 'object') return 0
  const record = node as Record<string, unknown>
  if (typeof record.message === 'string') return 1
  return Object.values(record).reduce<number>(
    (sum, child) => sum + countFieldErrors(child),
    0,
  )
}

const LOAN_SCOPED_KEYS: Partial<Record<SectionId, string[]>> = {
  'loan-params': ['parameters'],
  'other-obligations': ['ebiReloans', 'buyOuts', 'incomingLoans'],
  verification: ['verification'],
  deviations: ['deviations'],
}

export function sectionErrorCount(
  errors: FieldErrors<LoanApplicationFormData>,
  id: SectionId,
): number {
  const keys = LOAN_SCOPED_KEYS[id]
  if (keys) {
    const loanErrors = errors.loans
    if (!Array.isArray(loanErrors)) return 0
    return loanErrors.reduce<number>(
      (n, le) =>
        n +
        (le
          ? keys.reduce(
              (m, k) => m + countFieldErrors(le[k as keyof typeof le]),
              0,
            )
          : 0),
      0,
    )
  }
  switch (id) {
    case 'cis-lookup':
      return (
        countFieldErrors(errors.branchType) + countFieldErrors(errors.client)
      )
    case 'personal-info':
      return 0
    case 'obligations':
      return countFieldErrors(errors.outstandingLoans)
    case 'approval-form':
      return 0
    default:
      return 0
  }
}

export function useSectionProgress(
  isClientLoaded: boolean,
  preLoanSelected: boolean,
  submitAttempted: boolean,
  activeSection: SectionId,
) {
  const { control, formState } = useFormContext<LoanApplicationFormData>()
  const branchType = useWatch({ control, name: 'branchType' })
  const loans = useWatch({ control, name: 'loans' })

  const isComplete = (id: SectionId): boolean => {
    switch (id) {
      case 'cis-lookup':
        return (
          isClientLoaded && !!branchType.requestingOfficer && preLoanSelected
        )
      case 'personal-info':
      case 'obligations':
      case 'other-obligations':
        return isClientLoaded
      case 'loan-params':
        if (!Array.isArray(loans) || loans.length === 0) return false
        return true
      case 'verification':
        if (!Array.isArray(loans) || loans.length === 0) return false
        return loans.every((l) => !!l?.verification?.findings?.trim())
      case 'deviations':
        if (!Array.isArray(loans) || loans.length === 0) return false
        return loans.every((l) => {
          const d = l?.deviations
          if (!d?.otherRemarks?.trim()) return false
          if (d.hasDeviations) {
            const details = d.deviationDetails ?? []
            if (details.length === 0) return false
            const justifications = d.deviationJustifications ?? {}
            return details.every(
              (reason) => (justifications[reason] ?? '').trim().length >= 5,
            )
          }
          return true
        })
      case 'approval-form':
        return isClientLoaded
    }
  }

  const getStatus = (section: SectionDef, index: number): SectionStatus => {
    if (submitAttempted && sectionErrorCount(formState.errors, section.id) > 0)
      return 'error'
    if (activeSection === section.id) return 'active'

    if (section.systemSourced) return isClientLoaded ? 'auto' : 'upcoming'
    if (isComplete(section.id)) return 'complete'
    if (!isClientLoaded && index > 0) return 'locked'
    return 'upcoming'
  }

  const errorCount = (id: SectionId) =>
    submitAttempted ? sectionErrorCount(formState.errors, id) : 0

  return { getStatus, errorCount, isComplete }
}

export function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === 'complete')
    return <CheckCircle size={20} weight="fill" className="text-primary" />
  if (status === 'error')
    return (
      <WarningCircle size={20} weight="fill" className="text-destructive" />
    )

  if (status === 'auto')
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <CloudCheck size={12} weight="bold" className="text-primary" />
        <span className="sr-only">Auto-populated</span>
      </div>
    )
  if (status === 'locked')
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/20">
        <LockSimple
          size={11}
          weight="bold"
          className="text-muted-foreground/50"
        />
      </div>
    )
  if (status === 'active')
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary">
        <div className="h-2 w-2 rounded-full bg-background" />
      </div>
    )
  return (
    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
  )
}