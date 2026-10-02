import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { toastSuccess, toastError, toastInfo } from '@/src/shared/ui/toast'
import {
  ArrowCounterClockwise,
  CloudCheck,
  IdentificationCard,
  MagnifyingGlass,
  WarningCircle,
} from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import { Input } from '@/src/shared/ui/input'
import { Skeleton } from '@/src/shared/ui/skeleton'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { getWebLoanByCis } from '@/src/features/loans/api/webloans'
import {
  WEBLOAN_BRANCHES,
  type PreLoanItem,
  type WebLoanAccount,
  type WebLoanCisSearchResponse,
} from '@/src/shared/lib/api/types'
import { cn } from '@/src/shared/lib/utils'

import { ActiveLoansTable } from './active-loans-table'
import { ReadOnlyField, SectionCard, SubSectionHeading } from './section-card'
import { getSection } from '@/src/features/loans/constants/sections'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}

interface CISLookupProps {
  onPreLoanChange: (id: string, preloan: PreLoanItem | null) => void
}

export function CISLookup({ onPreLoanChange }: CISLookupProps) {
  const { control, setValue } = useFormContext<LoanApplicationFormData>()

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)

  const [laiAccounts, setLaiAccounts] = useState<WebLoanAccount[]>([])

  const [outstandingCount, setOutstandingCount] = useState(0)

  const onPreLoanChangeRef = useRef(onPreLoanChange)
  useEffect(() => {
    onPreLoanChangeRef.current = onPreLoanChange
  }, [onPreLoanChange])

  const client = useWatch({ control, name: 'client' })

  const branchType = useWatch({ control, name: 'branchType' })
  const isLoaded = !!client.cisId

  const fullName = [
    client.firstName,
    client.middleName,
    client.lastName,
    client.suffix,
  ]
    .filter(Boolean)
    .join(' ')
  const initials =
    [client.firstName?.[0], client.lastName?.[0]]
      .filter(Boolean)
      .join('')
      .toUpperCase() || '?'

  const CONFIRM_RESET_MS = 3000

  useEffect(() => {
    if (!confirmClear) return
    const timer = setTimeout(() => setConfirmClear(false), CONFIRM_RESET_MS)
    return () => clearTimeout(timer)
  }, [confirmClear])

  const clearForm = useCallback(() => {
    setValue('branchType.creationTypeCode', null)
    setValue('branchType.creationTypeLabel', '')
    setValue('branchType.branch', '')
    setValue('branchType.requestingOfficer', '')
    setValue('branchType.lai', '')
    setValue('client.cisId', '')
    setValue('client.firstName', '')
    setValue('client.middleName', '')
    setValue('client.lastName', '')
    setValue('client.suffix', '')
    setValue('client.birthdate', '')
    setValue('client.address', '')
    setValue('client.agency', '')
    setValue('client.position', '')
    setValue('client.employeeId', '')
    setValue('client.region', '')
    setValue('client.divisionCode', '')
    setValue('client.stationCode', '')
    setValue('client.misAgency', '')

    setValue('outstandingLoans', [])
    setValue('preLoan', undefined)
    setLaiAccounts([])
    setOutstandingCount(0)

    onPreLoanChangeRef.current('', null)
  }, [setValue])

  const handleChangeClient = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearForm()
    setConfirmClear(false)
    setSearchQuery('')
    setLookupError(null)
    toastInfo('Client cleared. Search for a new CIS number.')
  }

  const handleLookup = async () => {
    const query = searchQuery.trim()
    if (!query || isLoading) return

    setIsLoading(true)
    setLookupError(null)

    try {
      const result = await getWebLoanByCis(query)
      applySearchResult(result, query)
      toastSuccess('Client profile loaded successfully.')
    } catch (error) {
      const message = getErrorMessage(error)
      clearForm()
      setLookupError(message)
      toastError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const applySearchResult = (
    result: WebLoanCisSearchResponse,
    query: string,
  ) => {
    const b = result.borrower
    const accounts = result.accounts ?? []

    setLaiAccounts(accounts)

    setOutstandingCount(0)

    const firstBranchCode = accounts[0]?.branchCode ?? ''
    const branchName = firstBranchCode
      ? (WEBLOAN_BRANCHES.find((x) => x.code === firstBranchCode)?.name ??
        firstBranchCode)
      : ''
    setValue('branchType.creationTypeCode', null)
    setValue('branchType.creationTypeLabel', '')
    setValue('branchType.branch', branchName)

    setValue('branchType.lai', accounts.map((a) => a.accountId).join(', '))

    setValue('branchType.requestingOfficer', b.requestingOfficer ?? '')

    setValue('client.cisId', b.cisNo || query)
    setValue('client.firstName', b.firstName ?? '')
    setValue('client.middleName', b.middleName ?? '')
    setValue('client.lastName', b.lastName ?? '')

    setValue('client.suffix', b.appelation ?? '')
    setValue('client.birthdate', toDateInput(b.birthDate))
    setValue('client.address', b.address ?? '')

    setValue('client.agency', b.agencyType ?? '')
    setValue('client.position', b.positionTitle ?? '')
    setValue('client.employeeId', b.employeeNumber ?? '')
    setValue('client.region', b.regionCode ?? '')
    setValue('client.divisionCode', b.divisionCode ?? '')
    setValue('client.stationCode', b.stationCode ?? '')

    setValue('client.lengthOfService', b.lengthOfService ?? '')

    setValue('client.misAgency', b.misAgency ?? '')
  }

  const section = getSection('cis-lookup')

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      icon={
        <IdentificationCard size={20} weight="bold" className="text-primary" />
      }
    >
      <div className="space-y-6">
        {}
        <div className="space-y-4">
          <SubSectionHeading step="1.1" title="Client lookup (CIS number)" />

          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="absolute left-3 top-3 text-muted-foreground"
              />
              <Input
                placeholder="Enter CIS number…"
                aria-label="CIS number"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value
                  setSearchQuery(val)
                  if (!val.trim() && isLoaded) clearForm()
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="h-10 pl-9 tabular-nums"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleLookup}
              disabled={isLoading || !searchQuery.trim()}
              className="h-10 shrink-0 px-6"
            >
              {isLoading ? 'Fetching…' : 'Fetch Profile'}
            </Button>
          </div>

          {lookupError && (
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
                  <p className="font-medium">Unable to load client profile</p>
                  <p className="text-xs opacity-90">{lookupError}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1.5 text-destructive"
                onClick={handleLookup}
              >
                <ArrowCounterClockwise size={14} weight="bold" />
                Retry
              </Button>
            </div>
          )}

          {isLoading && (
            <div
              className="space-y-4 rounded-md border bg-muted/20 p-4"
              aria-label="Loading client profile"
              aria-busy="true"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            </div>
          )}

          {!isLoaded && !isLoading && !lookupError && (
            <p className="text-xs text-muted-foreground">
              Profile, branch routing and existing obligations are pulled
              automatically from the CIS.
            </p>
          )}
        </div>

        {isLoaded && !isLoading && (
          <div className="space-y-6">
            {}
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {fullName || '—'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    client.agency,
                    client.position,
                    client.employeeId && `ID ${client.employeeId}`,
                  ]
                    .filter(Boolean)
                    .join(' • ') || 'No agency details on file'}
                </p>
              </div>
              <Badge variant="outline" className="tabular-nums">
                CIS {client.cisId}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleChangeClient}
                className={cn(
                  'gap-1.5',
                  confirmClear && 'text-destructive hover:text-destructive',
                )}
              >
                {confirmClear ? (
                  <>
                    <WarningCircle size={14} weight="fill" />
                    Confirm — clears entered data
                  </>
                ) : (
                  <>
                    <ArrowCounterClockwise size={14} weight="bold" />
                    Change client
                  </>
                )}
              </Button>
            </div>

            {}
            <div className="space-y-3 rounded-md border bg-muted/20 p-4">
              <SubSectionHeading
                step="1.2"
                title="Branch & type"
                actions={
                  <Badge
                    variant="outline"
                    className="gap-1 text-xs font-normal"
                  >
                    <CloudCheck size={12} weight="bold" />
                    System verified
                  </Badge>
                }
              />
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ReadOnlyField
                  label="Loan type"
                  value={branchType.creationTypeLabel}
                  hint={
                    branchType.creationTypeLabel
                      ? undefined
                      : 'Set from the selected preloan'
                  }
                />
                <ReadOnlyField label="Branch" value={branchType.branch} />
                <ReadOnlyField
                  label="Requesting officer"
                  value={branchType.requestingOfficer}
                />
              </dl>
            </div>

            {}
            <ActiveLoansTable
              cisNo={client.cisId}
              accounts={laiAccounts}
              totalActiveLoansCount={outstandingCount}
              onPreLoanChange={onPreLoanChange}
            />
          </div>
        )}
      </div>
    </SectionCard>
  )
}
