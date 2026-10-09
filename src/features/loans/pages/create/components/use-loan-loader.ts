import { useEffect, useState } from 'react'
import { useWatch, type UseFieldArrayReturn, type UseFormReturn } from 'react-hook-form'
import { toastError } from '@/src/shared/ui/feedback/toast'
import axios from 'axios'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import {
  getOutstandingLoans,
  getPendingLoan,
} from '@/src/features/loans/api/webloans'
import type {
  OutstandingLoan,
  PendingLoan,
  WebLoanAccount,
} from '../../../api/loan-types'
import type {
  LoanApplicationFormData,
  CreationTypeCode,
} from '@/src/features/loans/schemas/schema'
import { CREATION_TYPE } from '@/src/features/loans/schemas/schema'

export function extractProductCode(desc: string | undefined): string | null {
  if (!desc) return null
  if (desc.startsWith('Consolidated')) return null
  const dash = desc.indexOf(' - ')
  return dash === -1 ? desc.trim() : desc.slice(0, dash).trim()
}

/** Force yyyy-MM-dd for &lt;input type="date"&gt; / form models. */
export function normalizeIsoDate(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useLoanLoader(
  cisNo: string,
  accounts: WebLoanAccount[],
  methods: UseFormReturn<LoanApplicationFormData>,
  fieldArray: Pick<UseFieldArrayReturn<LoanApplicationFormData, 'loans', 'id'>, 'replace' | 'append' | 'remove' | 'fields'>,
) {
  const { control, setValue, getValues } = methods
  const watchedLoans = useWatch({ control, name: 'loans' }) ?? []

  const [pendingNthpDate, setPendingNthpDate] = useState('')
  const selectedProductCodes = new Set(
    watchedLoans.map((f) => f.productCode).filter(Boolean),
  )

  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [loans, setLoans] = useState<PendingLoan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  const loadLoans = async (
    accountId: string,
    opts: { resetSelection: boolean },
  ) => {
    if (!accountId || !cisNo) return
    const accountRow = accounts.find((a) => a.accountId === accountId)
    if (!accountRow) return

    if (opts.resetSelection) {
      fieldArray.replace([])
      setValue('outstandingLoans', [])
      setValue('client.netTakeHomePay', 0)
      setPendingNthpDate('')
      setValue('branchType.creationTypeCode', null)
      setValue('branchType.creationTypeLabel', '')
    }

    setIsLoading(true)
    setLoadError(null)

    const [outstandingResult, pendingResult] = await Promise.allSettled([
      getOutstandingLoans(cisNo, accountId),
      getPendingLoan(cisNo, accountId),
    ])

    const firstRejection =
      (outstandingResult.status === 'rejected'
        ? outstandingResult.reason
        : null) ??
      (pendingResult.status === 'rejected' ? pendingResult.reason : null)

    if (firstRejection) {
      const status = axios.isAxiosError(firstRejection)
        ? firstRejection.response?.status
        : undefined
      const message =
        status === 403
          ? ((firstRejection.response?.data?.message as string | undefined) ??
            "This account's branch is outside your scope.")
          : getErrorMessage(firstRejection)

      setLoans([])
      setHasFetched(true)
      setLoadError(message)
      toastError(message)
      setIsLoading(false)
      return
    }

    if (outstandingResult.status === 'fulfilled') {
      const obRows = outstandingResult.value.loans ?? []
      setValue(
        'outstandingLoans',
        obRows.map((row: OutstandingLoan) => ({
          pn: row.loanNo ?? '',
          principalBalance: row.principal ?? 0,
          amortization: row.amortAmount ?? 0,
          outstandingBalance: row.principalBalance ?? 0,
          dateGranted: row.dateGranted ? row.dateGranted.slice(0, 10) : '',
          dateMaturity: row.dateMaturity ? row.dateMaturity.slice(0, 10) : '',
          status: row.productStatus ?? 'Active',
          productWithDescription: row.productWithDescription ?? '',
        })),
        { shouldDirty: false },
      )
    }

    if (pendingResult.status === 'fulfilled') {
      const pending = pendingResult.value
      setLoans(pending.loans ?? [])

      const nthpValue = Number(pending.nthp?.replace(/,/g, '') ?? '')
      if (pending.nthp && Number.isFinite(nthpValue)) {
        setValue('client.netTakeHomePay', nthpValue, { shouldDirty: false })
      }
      if (pending.nthpDate) {
        const d = normalizeIsoDate(pending.nthpDate)
        setPendingNthpDate(d)
        // Keep already-selected loan parameters in sync with the loaded NTHP date.
        const current = getValues('loans') ?? []
        if (current.length > 0) {
          fieldArray.replace(
            current.map((entry) => ({
              ...entry,
              parameters: { ...entry.parameters, nthpDate: d },
            })),
          )
        }
      }
    }

    setHasFetched(true)
    setIsLoading(false)
  }

  const handleFetch = (accountId: string) => {
    setSelectedAccountId(accountId)
    setValue('branchType.lai', accountId, { shouldDirty: false })
    return loadLoans(accountId, { resetSelection: true })
  }

  useEffect(() => {
    const lai = getValues('branchType.lai')
    if (
      lai &&
      !selectedAccountId &&
      accounts.some((a) => a.accountId === lai)
    ) {
      setSelectedAccountId(lai)
      void loadLoans(lai, { resetSelection: false })
    }
  }, [])

  const handleLoanToggle = (loan: PendingLoan) => {
    const existingIndex = fieldArray.fields.findIndex((f) => f.loanNo === loan.loanNo)

    if (existingIndex > -1) {
      fieldArray.remove(existingIndex)
      if (fieldArray.fields.length === 1) {
        setValue('branchType.creationTypeCode', null)
        setValue('branchType.creationTypeLabel', '')
      }
      return
    }

    const productCode = extractProductCode(loan.productWithDescription)

    if (productCode && selectedProductCodes.has(productCode)) {
      toastError(
        `Product ${productCode} is already selected. Cannot select multiple loans of the same product.`,
      )
      return
    }

    const [branchSegment, ...accountSegments] = selectedAccountId.split('-')
    const accountSegment = accountSegments.join('-')
    const branchCode =
      branchSegment?.trim() && accountSegment.trim() ? branchSegment.trim() : ''

    const KNOWN_CODES: ReadonlySet<CreationTypeCode> = new Set([
      CREATION_TYPE.NEW_LOAN,
      CREATION_TYPE.RELOAN,
      CREATION_TYPE.RESTRUCTURED,
      CREATION_TYPE.ADDITIONAL_LOAN,
    ])
    const rawCode = loan.creationType
    const code: CreationTypeCode | null =
      rawCode != null && (KNOWN_CODES as Set<number>).has(rawCode)
        ? (rawCode as CreationTypeCode)
        : null

    const newLoanEntry = {
      loanNo: loan.loanNo,
      productCode: productCode ?? '',
      productDescription: loan.productWithDescription ?? '',
      creationTypeCode: code,
      creationTypeLabel: loan.creationTypeLabel ?? '',
      branchCode,
      cDocStamp: loan.cDocStamp ?? undefined,
      parameters: {
        product: loan.productWithDescription ?? '',
        purpose: loan.loanPurpose ?? '',
        proposedAmount: loan.principal ?? 0,
        interestRate: loan.grantedRate ?? 0,
        term: Math.round(loan.totalTermDays ?? 0),
        policyTermMonths: loan.policyTermMonths ?? undefined,
        nthpDate: pendingNthpDate ? normalizeIsoDate(pendingNthpDate) : undefined,
        notarialFee: 0,
        docStamps: 0,
        insurance: 0,
        standardFeesSnapshot: {
          notarialFee: 0,
          docStamps: 0,
          insurance: 0,
        },
      },
    }

    fieldArray.append(newLoanEntry as Parameters<typeof fieldArray.append>[0])

    if (fieldArray.fields.length === 0) {
      setValue('branchType.creationTypeCode', code, { shouldDirty: false })
      setValue('branchType.creationTypeLabel', loan.creationTypeLabel ?? '', {
        shouldDirty: false,
      })
    }
  }

  return {
    selectedAccountId,
    loans,
    isLoading,
    loadError,
    hasFetched,
    selectedProductCodes,
    watchedLoans,
    handleFetch,
    handleLoanToggle,
  }
}