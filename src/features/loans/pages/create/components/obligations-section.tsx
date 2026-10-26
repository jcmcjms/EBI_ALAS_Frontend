import { useFormContext, useWatch, type FieldPath } from 'react-hook-form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/data-display/table'
import { Badge } from '@/src/shared/ui/primitives/badge'

import { useLoanTransfersContext } from '../loan-transfers-provider'
import { useActiveLoan } from '../active-loan-context'
import { TransferActionMenu } from './transfer-action-menu'
import { PerLoanTabs } from './per-loan-tabs'
import { SectionCard } from './section-card'
import { getSection } from '@/src/features/loans/constants/sections'
import type {
  LoanApplicationFormData,
  OutstandingLoan,
} from '@/src/features/loans/schemas/schema'

export function ObligationsSection() {
  const { loans } = useActiveLoan()
  const section = getSection('obligations')

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      badge={
        loans.length > 0 ? (
          <Badge variant="secondary">
            {loans.length} loan{loans.length === 1 ? '' : 's'}
          </Badge>
        ) : undefined
      }
      contentClassName="p-0 divide-y"
    >
      {loans.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          Select loan numbers in Step 1.3 to review existing loans per
          application.
        </div>
      ) : (
        <PerLoanTabs
          idPrefix="existing-loans"
          ariaLabel="Existing loans per application"
          mountStrategy="active-only"
          renderPanel={(_loan, i) => <OutstandingForLoan loanIndex={i} />}
        />
      )}
    </SectionCard>
  )
}

function OutstandingForLoan({ loanIndex }: { loanIndex: number }) {
  const { control } = useFormContext<LoanApplicationFormData>()
  const { handleTransfer } = useLoanTransfersContext()

  const rows =
    (useWatch({
      control,
      name: `loans.${loanIndex}.outstandingLoans` as FieldPath<LoanApplicationFormData>,
    }) as OutstandingLoan[] | undefined) ?? []

  const totalOutstanding = rows.reduce(
    (sum, loan) => sum + (loan?.outstandingBalance || 0),
    0,
  )

  return (
    <div>
      <div className="flex items-center justify-end px-4 pt-3 text-xs text-muted-foreground">
        Total outstanding:{' '}
        <span className="ml-1 font-bold tabular-nums text-foreground">
          ₱{totalOutstanding.toLocaleString()}
        </span>
      </div>
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[100px]">PN</TableHead>
            <TableHead className="text-right">Principal Balance</TableHead>
            <TableHead className="text-right">Amortization</TableHead>
            <TableHead className="text-right">Outstanding Balance</TableHead>
            <TableHead>Date Granted</TableHead>
            <TableHead>Date Maturity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]">
              <span className="sr-only">Row actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((loan, i) => (
              <TableRow key={`${loan.pn}-${i}`} className="hover:bg-muted/30">
                <TableCell className="text-xs">{loan.pn}</TableCell>
                <TableCell className="text-right tabular-nums">
                  ₱{(loan.principalBalance ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ₱{(loan.amortization ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  ₱{(loan.outstandingBalance ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {loan.dateGranted
                    ? new Date(loan.dateGranted).toLocaleDateString()
                    : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {loan.dateMaturity
                    ? new Date(loan.dateMaturity).toLocaleDateString()
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {loan.status || '—'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <TransferActionMenu
                    currentSection="outstanding"
                    onTransfer={(target) =>
                      handleTransfer(
                        'outstanding',
                        i,
                        target as 'outstanding' | 'ebi',
                        loanIndex,
                      )
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-xs text-muted-foreground py-4"
              >
                No outstanding loans found for this application.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
