import { useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
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
import {
  TransferTargetDialog,
  type TransferTargetOption,
} from './transfer-target-dialog'
import { SectionCard } from './section-card'
import { getSection } from '@/src/features/loans/constants/sections'

export function ObligationsSection() {
  const { control } = useFormContext()

  const { outstanding, handleTransfer } = useLoanTransfersContext()
  const { loans, activeIndex } = useActiveLoan()
  const outstandingFields = outstanding.fields

  const watchedLoans =
    (useWatch({ control, name: 'outstandingLoans' }) as Array<{
      pn?: string
      principalBalance?: number
      amortization?: number
      outstandingBalance?: number
      dateGranted?: string
      dateMaturity?: string
      status?: string
      productWithDescription?: string
    }>) || []

  const [pending, setPending] = useState<{
    rowIndex: number
    rowLabel: string
  } | null>(null)

  const loanOptions: TransferTargetOption[] = loans.map((l, index) => ({
    loanIndex: index,
    productCode: l.productCode ?? '',
    loanNo: l.loanNo ?? '',
  }))

  const totalOutstanding = watchedLoans.reduce(
    (sum, loan) => sum + (loan?.outstandingBalance || 0),
    0,
  )

  const section = getSection('obligations')

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      systemSourced
      badge={
        <span className="text-xs text-muted-foreground">
          Total outstanding:{' '}
          <span className="font-bold text-foreground">
            ₱{totalOutstanding.toLocaleString()}
          </span>
        </span>
      }
      contentClassName="p-0"
    >
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
          {outstandingFields.length > 0 ? (
            outstandingFields.map((field, i) => {
              const loan = watchedLoans[i]
              return (
                <TableRow key={field.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs">{loan?.pn}</TableCell>
                  <TableCell className="text-right">
                    ₱{(loan?.principalBalance ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ₱{(loan?.amortization ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ₱{(loan?.outstandingBalance ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {loan?.dateGranted
                      ? new Date(loan.dateGranted).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {loan?.dateMaturity
                      ? new Date(loan.dateMaturity).toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal text-xs">
                      {loan?.status || '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <TransferActionMenu
                      currentSection="outstanding"
                      onTransfer={(target) => {
                        if (target !== 'ebi') {
                          handleTransfer(
                            'outstanding',
                            i,
                            target as 'outstanding' | 'ebi',
                            activeIndex,
                          )
                          return
                        }
                        if (loans.length <= 1) {
                          handleTransfer('outstanding', i, 'ebi', activeIndex)
                          return
                        }
                        setPending({
                          rowIndex: i,
                          rowLabel: [loan?.pn, loan?.productWithDescription]
                            .filter(Boolean)
                            .join(' · '),
                        })
                      }}
                    />
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-center text-xs text-muted-foreground py-4"
              >
                No outstanding loans found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {pending && (
        <TransferTargetDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(null)
          }}
          rowLabel={pending.rowLabel}
          options={loanOptions}
          defaultLoanIndex={activeIndex}
          onConfirm={(loanIndex) =>
            handleTransfer('outstanding', pending.rowIndex, 'ebi', loanIndex)
          }
        />
      )}
    </SectionCard>
  )
}
