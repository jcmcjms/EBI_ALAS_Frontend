import { useFormContext, useFieldArray } from 'react-hook-form'
import {
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

import type {
  LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import type { PreLoanItem, WebLoanAccount } from '@/src/shared/lib/api/types'
import { useLoanLoader } from './use-loan-loader'
import { LoanSelectionList } from './loan-selection-list'

interface ActiveLoansTableProps {
  cisNo: string
  accounts: WebLoanAccount[]
  totalActiveLoansCount?: number
  onPreLoanChange: (id: string, preloan: PreLoanItem | null) => void
}

export function ActiveLoansTable({
  cisNo,
  accounts,
  totalActiveLoansCount,
}: ActiveLoansTableProps) {
  const methods = useFormContext<LoanApplicationFormData>()
  const fieldArray = useFieldArray({
    control: methods.control,
    name: 'loans',
  })

  const {
    selectedAccountId,
    loans,
    isLoading,
    loadError,
    hasFetched,
    selectedProductCodes,
    handleFetch,
    handleLoanToggle,
  } = useLoanLoader(cisNo, accounts, methods, fieldArray)

  const selectedLoanNos = new Set(fieldArray.fields.map((f) => f.loanNo))

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
                  >
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

        {!isLoading && hasFetched && loans.length > 0 && (
          <LoanSelectionList
            loans={loans}
            selectedLoanNos={selectedLoanNos}
            selectedProductCodes={selectedProductCodes}
            onToggle={handleLoanToggle}
          />
        )}

        {!isLoading && hasFetched && loans.length === 0 && !loadError && (
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
            <ListChecks size={14} weight="bold" />
            Account {selectedAccountId} has no in-flight loans.
          </div>
        )}

        {!isLoading && !hasFetched && (
          <p className="text-xs text-muted-foreground">
            Select an account above to load pending loans.
          </p>
        )}

        {selectedAccountId && hasFetched && fieldArray.fields.length > 0 && (
          <div className="my-2 border-t border-dashed" />
        )}
        {fieldArray.fields.length === 0 &&
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