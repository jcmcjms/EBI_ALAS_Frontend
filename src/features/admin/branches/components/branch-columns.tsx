import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  columnVisibilityFeature,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  tableFeatures,
} from '@tanstack/react-table'
import { PencilSimple, TreeStructure } from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/shared/ui/navigation/dropdown-menu'
import { formatLoanDateTime } from '@/src/shared/lib/format'
import type { BranchResponse } from '@/src/shared/lib/api/types'

export type BranchesTableMeta = {
  canManage: boolean
  onEditBranch?: (branch: BranchResponse) => void
  onStatusChange?: (branch: BranchResponse, status: 'Active' | 'Closed' | 'Merged') => void
}

export function statusVariant(
  status: string,
): 'default' | 'secondary' | 'outline' {
  if (status === 'Active') return 'default'
  if (status === 'Closed') return 'secondary'
  return 'outline'
}

export const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  tableMeta: {} as BranchesTableMeta,
})

const columnHelper = createColumnHelper<typeof features, BranchResponse>()

export const columns = columnHelper.columns([
  columnHelper.accessor('code', {
    header: 'Code',
    cell: (info) => (
      <div className="flex items-center gap-2">
        <TreeStructure size={14} weight="bold" className="text-muted-foreground" />
        <span className="font-semibold text-sm tabular-nums">{info.getValue()}</span>
      </div>
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => (
      <span className="text-sm text-foreground/80">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('areaCode', {
    header: 'Area',
    cell: (info) => (
      <span className="text-xs font-medium tabular-nums">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={statusVariant(info.getValue())}>{info.getValue()}</Badge>
    ),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatLoanDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: (info) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatLoanDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: (info) => {
      const meta = info.table.options.meta as BranchesTableMeta | undefined
      const branch = info.row.original
      if (!meta?.canManage) return null
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${branch.code}`}
                />
              }
            >
              <PencilSimple size={16} />
              <span className="sr-only">Open menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => meta.onEditBranch?.(branch)}>
                Edit details
              </DropdownMenuItem>
              {branch.status !== 'Active' && (
                <DropdownMenuItem
                  onClick={() => meta.onStatusChange?.(branch, 'Active')}
                >
                  Reopen
                </DropdownMenuItem>
              )}
              {branch.status === 'Active' && (
                <>
                  <DropdownMenuItem
                    onClick={() => meta.onStatusChange?.(branch, 'Closed')}
                  >
                    Close branch
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => meta.onStatusChange?.(branch, 'Merged')}
                  >
                    Mark merged
                  </DropdownMenuItem>
                </>
              )}
              {branch.status === 'Closed' && (
                <DropdownMenuItem
                  onClick={() => meta.onStatusChange?.(branch, 'Merged')}
                >
                  Mark merged
                </DropdownMenuItem>
              )}
              {branch.status === 'Merged' && (
                <DropdownMenuItem
                  onClick={() => meta.onStatusChange?.(branch, 'Closed')}
                >
                  Mark closed
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  }),
])
