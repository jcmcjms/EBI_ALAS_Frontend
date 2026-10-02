import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/table'
import { Input } from '@/src/shared/ui/input'
import { Button } from '@/src/shared/ui/button'
import { CreditCard, Plus, Trash } from '@phosphor-icons/react'
import { SubSectionHeading } from './section-card'
import type { BuyOut } from '@/src/features/loans/schemas/schema'

interface BuyoutAccountsTableProps {
  rows: BuyOut[]
  loanPath: string
  setCell: (path: string, value: unknown) => void
  addBuyOut: () => void
  removeRow: (section: string, index: number) => void
}

export function BuyoutAccountsTable({
  rows,
  loanPath,
  setCell,
  addBuyOut,
  removeRow,
}: BuyoutAccountsTableProps) {
  return (
    <div className="p-4">
      <SubSectionHeading
        step="5.2"
        title="Buy-Out Accounts (Other FIs)"
        icon={
          <CreditCard
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
            onClick={addBuyOut}
            className="gap-1.5"
          >
            <Plus size={14} weight="bold" /> Add Account
          </Button>
        }
      />
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">PN / Ref No.</TableHead>
            <TableHead>Financial Institution / Name</TableHead>
            <TableHead className="text-right">Monthly Amort</TableHead>
            <TableHead className="text-right">Outstanding Balance</TableHead>
            <TableHead className="w-[50px]">
              <span className="sr-only">Row actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`buyout-${i}`} className="group hover:bg-muted/30">
              <TableCell>
                <Input
                  value={row.pn ?? ''}
                  onChange={(e) =>
                    setCell(`${loanPath}.buyOuts.${i}.pn`, e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </TableCell>
              <TableCell>
                <Input
                  value={row.name ?? ''}
                  onChange={(e) =>
                    setCell(`${loanPath}.buyOuts.${i}.name`, e.target.value)
                  }
                  className="h-8 text-xs"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={row.amortization ?? 0}
                  onChange={(e) =>
                    setCell(
                      `${loanPath}.buyOuts.${i}.amortization`,
                      Number(e.target.value || 0),
                    )
                  }
                  className="h-8 text-right text-xs"
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={row.outstandingBalance ?? 0}
                  onChange={(e) =>
                    setCell(
                      `${loanPath}.buyOuts.${i}.outstandingBalance`,
                      Number(e.target.value || 0),
                    )
                  }
                  className="h-8 text-right text-xs"
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeRow('buyOuts', i)}
                  aria-label="Delete buy-out account"
                >
                  <Trash size={14} weight="bold" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-xs text-muted-foreground py-4"
              >
                No external buy-outs added. Click &quot;Add Account&quot; to
                declare one.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}