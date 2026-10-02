import { useEffect, useState } from 'react'
import { useFormContext, useWatch, useFieldArray } from 'react-hook-form'
import { toastError } from '@/src/shared/ui/toast'
import {
  CheckCircle,
  CircleNotch,
  ListChecks,
  MagnifyingGlass,
  Receipt,
  Stack,
  WarningCircle,
} from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/select'
import { Skeleton } from '@/src/shared/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/src/shared/ui/tooltip'
import axios from 'axios'

import { cn } from '@/src/shared/lib/utils'
import { getErrorMessage } from '@/src/lib/apiClient'
import {
  getOutstandingLoans,
  getPendingLoan,
} from '@/src/features/loans/api/webloans'
import type {
  OutstandingLoan,
  PendingLoan,
  WebLoanAccount,
} from '@/src/lib/api/types'

import type {
  LoanApplicationFormData,
  CreationTypeCode,
} from '@/src/features/loans/schemas/schema'
import {
  CREATION_TYPE,
  createPerLoanSectionDefaults,
} from '@/src/features/loans/schemas/schema'
import type { PreLoanItem } from '@/src/lib/api/types'

interface ActiveLoansTableProps {
  cisNo: string

  accounts: WebLoanAccount[]

  totalActiveLoansCount?: number

  onPreLoanChange: (id: string, preloan: PreLoanItem | null) => void
}

function extractProductCode(desc: string | undefined): string | null {
  if (!desc) return null
  if (desc.startsWith('Consolidated')) return null
  const dash = desc.indexOf(' - ')
  return dash === -1 ? desc.trim() : desc.slice(0, dash).trim()
}

export function ActiveLoansTable({
  cisNo,
  accounts,
  totalActiveLoansCount,
  onPreLoanChange,
}: ActiveLoansTableProps) {
  const { control, setValue, getValues } =
    useFormContext<LoanApplicationFormData>()

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'loans',
  })

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
      replace([])
      onPreLoanChange('', null)

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
        setValue('client.netTakeHomePay', nthpValue, {
          shouldDirty: false,
        })
      }
      if (pending.nthpDate) {
        const d = pending.nthpDate.slice(0, 10)
        setPendingNthpDate(d)
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
    const existingIndex = fields.findIndex((f) => f.loanNo === loan.loanNo)

    if (existingIndex > -1) {
      remove(existingIndex)

      if (fields.length === 1) {
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
        nthpDate: pendingNthpDate,
        notarialFee: 0,
        docStamps: 0,
        insurance: 0,
        standardFeesSnapshot: {
          notarialFee: 0,
          docStamps: 0,
          insurance: 0,
        },
      },
      ...createPerLoanSectionDefaults(),
    }

    append(newLoanEntry)

    if (fields.length === 0) {
      setValue('branchType.creationTypeCode', code, { shouldDirty: false })
      setValue('branchType.creationTypeLabel', loan.creationTypeLabel ?? '', {
        shouldDirty: false,
      })
    }
  }

  return (
    <Card key={cisNo} className="shadow-none">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt size={16} weight="bold" className="text-primary" />
          <span className="tabular-nums text-muted-foreground">1.3</span>
          Account & preloan
          {typeof totalActiveLoansCount === 'number' &&
            totalActiveLoansCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {totalActiveLoansCount} on file
              </Badge>
            )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {}
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <label
              htmlFor="active-loans-account"
              className="text-xs font-medium text-muted-foreground"
            >
              LAI (Loan Application Index)
            </label>
            <Select
              value={selectedAccountId}
              onValueChange={(val) => handleFetch(val as string)}
            >
              <SelectTrigger id="active-loans-account" className="h-10 w-full">
                <SelectValue placeholder="Select an LAI..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acct) => (
                  <SelectItem
                    key={acct.accountId}
                    value={acct.accountId}
                    className=""
                  >
                    {}
                    {acct.accountId}
                    {acct.name ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        · {acct.name}
                      </span>
                    ) : null}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => selectedAccountId && handleFetch(selectedAccountId)}
            disabled={!selectedAccountId || isLoading}
            className="h-10 shrink-0 gap-1.5 font-normal"
          >
            <MagnifyingGlass size={14} weight="bold" />
            Refresh
          </Button>
        </div>

        {}
        {loadError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <WarningCircle
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
              />
              <div>
                <p className="font-medium">Unable to load pending loans</p>
                <p className="text-xs opacity-90">{loadError}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1.5 text-destructive"
              onClick={() => handleFetch(selectedAccountId)}
            >
              Retry
            </Button>
          </div>
        )}

        {}
        {isLoading && (
          <div
            className="space-y-2 rounded-md border bg-muted/20 p-3"
            aria-busy="true"
            aria-label="Loading pending loans"
          >
            <div className="flex items-center gap-2">
              <CircleNotch
                size={16}
                weight="bold"
                className="animate-spin text-primary"
              />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {}
        {!isLoading && hasFetched && loans.length > 0 && (
          <section aria-label="Pending loan selection" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Loan Number
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Select one or more (max 1 per product)
              </span>
            </div>

            <TooltipProvider>
              <div
                role="group"
                aria-label="Select loan numbers"
                className="grid gap-2"
              >
                {loans.map((l) => {
                  const isSelected = fields.some((f) => f.loanNo === l.loanNo)
                  const productCode = extractProductCode(
                    l.productWithDescription,
                  )

                  const isDisabled =
                    !isSelected &&
                    !!productCode &&
                    selectedProductCodes.has(productCode)

                  return (
                    <Tooltip key={l.loanNo}>
                      <TooltipTrigger>
                        <div
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-disabled={isDisabled || undefined}
                          tabIndex={isDisabled ? -1 : 0}
                          onClick={() => !isDisabled && handleLoanToggle(l)}
                          onKeyDown={(e) => {
                            if (
                              !isDisabled &&
                              (e.key === ' ' || e.key === 'Enter')
                            ) {
                              e.preventDefault()
                              handleLoanToggle(l)
                            }
                          }}
                          className={cn(
                            'group relative flex w-full items-start gap-3 rounded-md border bg-background p-3 text-left transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                              : 'border-border',
                            isDisabled && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          {}
                          <div
                            className={cn(
                              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                              isSelected
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground/40 group-hover:border-primary/60',
                            )}
                            aria-hidden
                          >
                            {isSelected && (
                              <CheckCircle
                                size={12}
                                weight="fill"
                                className="text-primary-foreground"
                              />
                            )}
                          </div>

                          {}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold">
                                {l.loanNo}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {l.productWithDescription}
                              </Badge>
                              {l.creationTypeLabel && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {l.creationTypeLabel}
                                </Badge>
                              )}
                              {l.loanPurpose && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                >
                                  {l.loanPurpose}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              Proposed Balance:{' '}
                              <span className="font-medium text-foreground">
                                ₱{(l.principal ?? 0).toLocaleString()}
                              </span>
                              {' · '}
                              Rate:{' '}
                              <span className="font-medium text-foreground">
                                {l.grantedRate ?? '—'}%
                              </span>
                              {l.totalTermDays != null && (
                                <>
                                  {' · '}
                                  Term:{' '}
                                  <span className="font-medium text-foreground">
                                    {l.totalTermDays}d
                                  </span>
                                </>
                              )}
                              {l.policyTermMonths != null && (
                                <>
                                  {' · '}
                                  Policy Term:{' '}
                                  <span className="font-medium text-foreground">
                                    {l.policyTermMonths}
                                    mo
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      {isDisabled && (
                        <TooltipContent>
                          <p>
                            Cannot select multiple loans of the same product (
                            {productCode}).
                          </p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
          </section>
        )}

        {}
        {!isLoading && hasFetched && loans.length === 0 && !loadError && (
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
            <ListChecks size={14} weight="bold" />
            Account {selectedAccountId} has no in-flight loans.
          </div>
        )}

        {}
        {!isLoading && !hasFetched && (
          <p className="text-xs text-muted-foreground">
            Select an account above to load pending loans.
          </p>
        )}

        {}
        {}
        {selectedAccountId && hasFetched && fields.length > 0 && (
          <>
            <div className="my-2 border-t border-dashed" />
          </>
        )}
        {fields.length === 0 &&
          selectedAccountId &&
          hasFetched &&
          loans.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-3 text-[11px] text-muted-foreground">
              <Stack size={14} weight="bold" />
              Pick one or more loan numbers above to enable preloan selection.
            </div>
          )}
      </CardContent>
    </Card>
  )
}
