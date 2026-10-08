import { useState } from 'react'
import {
  FlexRender,
  useTable,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/data-display/table'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  CaretUp,
  CaretDown,
  CaretUpDown,
  WarningCircle,
  ArrowClockwise,
} from '@phosphor-icons/react'
import type {
  LoanMonitoringRecord,
  MonitoringFilters,
} from '@/src/features/loans/types/monitoring'
import { useLoanMonitoring } from '@/src/features/loans/hooks/use-loan-monitoring'
import { cn } from '@/src/shared/lib/utils'
import { EmptyState } from '@/src/shared/ui/feedback/empty-state'
import { features, buildColumns } from './monitoring-columns'
import {
  SharedTimerProvider,
  SkeletonRow,
  TableFooter,
} from './monitoring-table-utils'

const SKELETON_ROW_COUNT = 8

interface MonitoringTableProps {
  filters: MonitoringFilters
  onRowClick: (record: LoanMonitoringRecord) => void
  slaPolicy?: Record<string, number> | null
  currentUser?: { id: number; role: string; name?: string } | null
  onCancel?: (record: LoanMonitoringRecord) => void
}

export function MonitoringTable({
  filters,
  onRowClick,
  slaPolicy,
  currentUser,
  onCancel,
}: MonitoringTableProps) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 15,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'applicationDate', desc: true },
  ])

  const {
    data: pageData = [],
    rowCount = 0,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useLoanMonitoring(filters, pagination, sorting)

  const columns = buildColumns(slaPolicy, currentUser, onCancel)
  const pageCount = Math.max(1, Math.ceil(rowCount / pagination.pageSize))

  const table = useTable({
    features,
    data: pageData,
    columns,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    manualPagination: true,
    manualSorting: true,
    pageCount,
  })

  const showSkeleton = isLoading && pageData.length === 0
  const showError = isError
  const showEmpty = !showSkeleton && !showError && pageData.length === 0

  return (
    <SharedTimerProvider>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {isFetching && !isLoading && (
          <div className="px-4 py-1 text-[11px] text-muted-foreground bg-muted/40 border-b">
            Refreshing…
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-20">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'h-10 px-4 text-xs font-semibold text-muted-foreground',
                        header.column.columnDef.meta?.className,
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            header.column.getCanSort() &&
                              'cursor-pointer select-none',
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {FlexRender({ header })}
                          {{
                            asc: <CaretUp size={14} />,
                            desc: <CaretDown size={14} />,
                          }[header.column.getIsSorted() as string] ?? (
                            <CaretUpDown size={14} className="opacity-30" />
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                  <SkeletonRow key={i} colSpan={columns.length} />
                ))
              ) : showError ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <WarningCircle
                        size={28}
                        weight="bold"
                        className="text-destructive"
                      />
                      <div>
                        Failed to load loan applications.
                        <div className="text-xs mt-0.5">
                          {error instanceof Error
                            ? error.message
                            : 'Unknown error.'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="gap-1.5 mt-1"
                      >
                        <ArrowClockwise size={14} weight="bold" /> Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : showEmpty ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <EmptyState
                      title="No applications found"
                      hint="Try adjusting your filters."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => onRowClick(row.original)}
                  >
                    {row.getAllCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'py-2 px-4 h-12 text-sm',
                          cell.column.columnDef.meta?.className,
                        )}
                      >
                        {FlexRender({ cell })}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TableFooter
          rowCount={rowCount}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          onPreviousPage={() => table.previousPage()}
          onNextPage={() => table.nextPage()}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
        />
      </div>
    </SharedTimerProvider>
  )
}