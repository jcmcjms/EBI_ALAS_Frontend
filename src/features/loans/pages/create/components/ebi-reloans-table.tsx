import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/table'
import { Input } from '@/src/shared/ui/input'
import { Bank } from '@phosphor-icons/react'
import { TransferActionMenu } from './transfer-action-menu'
import { SubSectionHeading } from './section-card'
import type { EbiReloan } from '@/src/features/loans/schemas/schema'

interface EbiReloansTableProps {
  rows: EbiReloan[]
  loanPath: string
  loanIndex: number
  setCell: (path: string, value: unknown) => void
  handleTransfer: (
    source: string,
    index: number,
    target: 'outstanding' | 'ebi',
  ) => void
}

export function EbiReloansTable({
  rows,
  loanPath,
  loanIndex,
  setCell,
  handleTransfer,
}: EbiReloansTableProps) {
  return (
    <div className="p-4">
      <SubSectionHeading
        step="5.1"
        title="EBI Accounts for Reloans"
        icon={
          <Bank
            size={16}
            weight="bold"
            className="text-primary"
            aria-hidden
          />
        }
      />
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">PN / Account No.</TableHead>
            <TableHead className="flex-1 min-w-[140px]">
              Product Name
            </TableHead>
            <TableHead className="text-right flex-1 min-w-[140px]">
              Existing Deduction
            </TableHead>
            <TableHead className="text-right w-[160px]">
              Pay to Close
            </TableHead>
            <TableHead className="w-[50px]">
              <span className="sr-only">Row actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`ebi-${i}`} className="hover:bg-muted/30">
              <TableCell className="min-w-0">
                <Input
                  value={row.pn ?? ''}
                  readOnly
                  title={row.pn}
                  className="h-8 text-xs bg-muted/50 min-w-0 overflow-hidden text-ellipsis"
                />
              </TableCell>
              <TableCell className="min-w-0">
                <Input
                  value={row.name ?? ''}
                  readOnly
                  title={row.name}
                  className="h-8 text-xs bg-muted/50 min-w-0 overflow-hidden text-ellipsis"
                />
              </TableCell>
              <TableCell className="min-w-0">
                <Input
                  type="number"
                  value={row.existingDeduction ?? 0}
                  readOnly
                  className="h-8 text-right text-xs bg-muted/50"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={row.payToClose ?? 0}
                  onChange={(e) =>
                    setCell(
                      `${loanPath}.ebiReloans.${i}.payToClose`,
                      Number(e.target.value || 0),
                    )
                  }
                  placeholder="0.00"
                  aria-label={`Pay to close for ${row.name ?? row.pn ?? `row ${i + 1}`}`}
                  className="h-8 text-right text-xs"
                />
              </TableCell>
              <TableCell className="text-right">
                <TransferActionMenu
                  currentSection="ebi"
                  onTransfer={(target) =>
                    handleTransfer('ebi', i, target as 'outstanding' | 'ebi')
                  }
                />
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-xs text-muted-foreground py-4"
              >
                No EBI reloans added. Transfer from Outstanding Loans to add.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}