import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/data-display/table'
import { Input } from '@/src/shared/ui/primitives/input'
import { Button } from '@/src/shared/ui/primitives/button'
import { ArrowLineDown, Plus, Trash } from '@phosphor-icons/react'
import { SubSectionHeading } from './section-card'
import type { IncomingLoan } from '@/src/features/loans/schemas/schema'
import type { PerLoanArrayKind } from '@/src/features/loans/hooks/use-loan-transfers'

interface IncomingLoansTableProps {
  rows: IncomingLoan[]
  loanPath: string
  setCell: (path: string, value: unknown) => void
  addIncoming: () => void
  removeRow: (kind: PerLoanArrayKind, index: number) => void
}

export function IncomingLoansTable({
  rows,
  loanPath,
  setCell,
  addIncoming,
  removeRow,
}: IncomingLoansTableProps) {
  return (
    <div className="p-4">
      <SubSectionHeading
        step="5.3"
        title="Incoming / Undeducted Loans"
        icon={
          <ArrowLineDown
            size={16}
            weight="bold"
            className="text-primary"
            aria-hidden
          />
        }
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addIncoming}
            className="gap-1.5"
          >
            <Plus size={14} weight="bold" /> Add Loan
          </Button>
        }
      />
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Creditor / Name</TableHead>
            <TableHead className="text-right">Expected Deduction</TableHead>
            <TableHead>Remarks / Notes</TableHead>
            <TableHead className="w-[50px]">
              <span className="sr-only">Row actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={`incoming-${i}`}
              className="group hover:bg-muted/30"
            >
              <TableCell>
                <Input
                  value={row.name ?? ''}
                  onChange={(e) =>
                    setCell(`${loanPath}.incomingLoans.${i}.name`, e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={row.deductions ?? 0}
                  onChange={(e) =>
                    setCell(
                      `${loanPath}.incomingLoans.${i}.deductions`,
                      Number(e.target.value || 0),
                    )
                  }
                  className="h-8 text-right text-xs"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.remarks ?? ''}
                  onChange={(e) =>
                    setCell(`${loanPath}.incomingLoans.${i}.remarks`, e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeRow('incomingLoans', i)}
                  aria-label="Delete incoming loan"
                >
                  <Trash size={14} weight="bold" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-xs text-muted-foreground py-4"
              >
                No incoming loans declared. Click &quot;Add Loan&quot; to add
                one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}