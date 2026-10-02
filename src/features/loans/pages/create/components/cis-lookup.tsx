import { useCallback, useEffect, useRef, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { toastSuccess, toastError, toastInfo } from '@/src/shared/ui/toast'
import { IdentificationCard, CloudCheck } from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/badge'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { getWebLoanByCis } from '@/src/features/loans/api/webloans'
import {
  WEBLOAN_BRANCHES,
  type PreLoanItem,
  type WebLoanAccount,
  type WebLoanCisSearchResponse,
} from '@/src/shared/lib/api/types'

import { ActiveLoansTable } from './active-loans-table'
import { ReadOnlyField, SectionCard, SubSectionHeading } from './section-card'
import { CisSearchBar } from './cis-search-bar'
import { CisClientCard } from './cis-client-card'
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

  const handleSearchQueryChange = (val: string) => {
    setSearchQuery(val)
    if (!val.trim() && isLoaded) clearForm()
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
        <CisSearchBar
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchQueryChange}
          isLoading={isLoading}
          isLoaded={isLoaded}
          lookupError={lookupError}
          onLookup={handleLookup}
        />

        {isLoaded && !isLoading && (
          <div className="space-y-6">
            <CisClientCard
              initials={initials}
              fullName={fullName}
              cisId={client.cisId}
              agency={client.agency}
              position={client.position}
              employeeId={client.employeeId}
              confirmClear={confirmClear}
              onChangeClient={handleChangeClient}
            />

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