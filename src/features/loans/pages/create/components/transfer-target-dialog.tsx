import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/src/shared/ui/feedback/dialog'
import { Button } from '@/src/shared/ui/primitives/button'
import { cn } from '@/src/shared/lib/utils'

export interface TransferTargetOption {
  loanIndex: number
  productCode: string
  loanNo: string
}

export interface TransferTargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rowLabel: string
  options: TransferTargetOption[]
  defaultLoanIndex?: number
  onConfirm: (loanIndex: number) => void
}

export function TransferTargetDialog({
  open,
  onOpenChange,
  rowLabel,
  options,
  defaultLoanIndex,
  onConfirm,
}: TransferTargetDialogProps) {
  const [selected, setSelected] = useState<number | null>(() => {
    if (
      defaultLoanIndex !== undefined &&
      options.some((o) => o.loanIndex === defaultLoanIndex)
    ) {
      return defaultLoanIndex
    }
    return options[0]?.loanIndex ?? null
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Target loan application</DialogTitle>
          <DialogDescription>
            Choose which application should receive “{rowLabel}” as an EBI
            reloan. Only that application will include this obligation.
          </DialogDescription>
        </DialogHeader>
        <div
          role="radiogroup"
          aria-label="Target loan application"
          className="space-y-2"
        >
          {options.map((opt) => {
            const active = selected === opt.loanIndex
            return (
              <button
                key={opt.loanIndex}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(opt.loanIndex)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                    : 'border-border hover:bg-muted/40',
                )}
              >
                <span>
                  {opt.productCode} · {opt.loanNo}
                </span>
              </button>
            )
          })}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selected === null}
            onClick={() => {
              if (selected === null) return
              onConfirm(selected)
              onOpenChange(false)
            }}
          >
            Move to EBI Reloans
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
