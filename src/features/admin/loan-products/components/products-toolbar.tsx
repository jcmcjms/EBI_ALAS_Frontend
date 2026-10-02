import { toastSuccess, toastError } from '@/src/shared/ui/toast'
import {
  ArrowsClockwise,
  FileArrowUp,
  FileXls,
  MagnifyingGlass,
} from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/button'
import { Checkbox } from '@/src/shared/ui/checkbox'
import { Input } from '@/src/shared/ui/input'
import { Label } from '@/src/shared/ui/label'
import { Spinner } from '@/src/shared/ui/spinner'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { exportLoanProducts } from '../api/loan-products'

export interface ProductsToolbarProps {
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  showRetired: boolean
  onShowRetiredChange: (value: boolean) => void
  canManageProducts: boolean
  isSyncing: boolean
  onSyncNow: () => void
  onImport: () => void
}

export function ProductsToolbar({
  globalFilter,
  onGlobalFilterChange,
  showRetired,
  onShowRetiredChange,
  canManageProducts,
  isSyncing,
  onSyncNow,
  onImport,
}: ProductsToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {}
      <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
        <Checkbox
          id="show-retired"
          checked={showRetired}
          onCheckedChange={(checked) => onShowRetiredChange(checked === true)}
          aria-label="Include retired products"
        />
        <Label
          htmlFor="show-retired"
          className="cursor-pointer text-xs font-normal text-muted-foreground"
        >
          Include retired
        </Label>
      </div>

      {}
      <div className="relative">
        <MagnifyingGlass
          size={16}
          weight="bold"
          className="pointer-events-none absolute top-2.5 left-2.5 text-muted-foreground"
        />
        <Input
          placeholder="Search code or description…"
          value={globalFilter}
          onChange={(e) => onGlobalFilterChange(e.target.value)}
          className="h-9 w-full bg-background pl-8 sm:w-[260px]"
        />
      </div>

      {}
      {canManageProducts && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              exportLoanProducts(true)
                .then(() => toastSuccess('Exported all loan products to Excel'))
                .catch((e: unknown) => toastError(getErrorMessage(e)))
            }}
          >
            <FileXls size={14} weight="bold" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onImport}
          >
            <FileArrowUp size={14} weight="bold" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={onSyncNow}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Spinner className="size-3" />
            ) : (
              <ArrowsClockwise size={14} weight="bold" />
            )}
            Sync now
          </Button>
        </>
      )}
    </div>
  )
}
