import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  FlexRender,
  createCoreRowModel,
  createColumnHelper,
  coreFeatures,
  metaHelper,
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
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
} from '@/src/shared/ui/table'
import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import {
  CaretUp,
  CaretDown,
  CaretUpDown,
  WarningCircle,
  ArrowClockwise,
  XCircle,
  UserCircle,
  FileDashed,
} from '@phosphor-icons/react'
import type {
  LoanMonitoringRecord,
  MonitoringFilters,
} from '@/src/features/loans/types/monitoring'
import { useLoanMonitoring } from '@/src/features/loans/hooks/use-loan-monitoring'
import { BRANCHES } from '@/src/lib/api/types'
import { cn } from '@/src/shared/lib/utils'
import { LOAN_STATUS_META } from '@/src/features/loans/utils/loan-status'
import {
  AGING_BADGE_CLASS,
  assessAging,
} from '@/src/features/loans/utils/loan-aging'
import type { LoanStatus } from '@/src/features/loans/utils/loan-status'
import { CANCELLABLE_STATUSES } from '@/src/features/loans/api/loan-review'
import { EmptyState } from '@/src/shared/ui/empty-state'

type MonitoringColumnMeta = {
  className?: string
}

const SKELETON_ROW_COUNT = 8

function resolveBranchName(code: string): string {
  if (!code || code === '—') return code || '—'
  return BRANCHES.find((b) => b.code === code)?.name ?? code
}

const features = tableFeatures({
  ...coreFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: metaHelper<MonitoringColumnMeta>(),
  coreRowModel: createCoreRowModel(),
})

const columnHelper = createColumnHelper<typeof features, LoanMonitoringRecord>()

interface MonitoringTableProps {
  filters: MonitoringFilters
  onRowClick: (record: LoanMonitoringRecord) => void

  slaPolicy?: Record<string, number> | null

  currentUser?: { id: number; role: string; name?: string } | null

  onCancel?: (record: LoanMonitoringRecord) => void
}

const SharedTimerContext = createContext<number>(Date.now())

function SharedTimerProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <SharedTimerContext.Provider value={now}>
      {children}
    </SharedTimerContext.Provider>
  )
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86_400)
  const remSecondsAfterDays = total % 86_400
  const hours = Math.floor(remSecondsAfterDays / 3_600)
  const minutes = Math.floor((remSecondsAfterDays % 3_600) / 60)
  const seconds = remSecondsAfterDays % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return days > 0
    ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

interface TimeLapsedIndicatorProps {
  lastActionDate: string
  status: LoanStatus
  slaPolicy?: Record<string, number> | null
}

function TimeLapsedIndicator({
  lastActionDate,
  status,
  slaPolicy,
}: TimeLapsedIndicatorProps) {
  const now = useContext(SharedTimerContext)

  const TERMINAL_STATUSES = new Set(['Cancelled', 'Disbursed', 'OnGoing'])
  const effectiveNow = TERMINAL_STATUSES.has(status)
    ? new Date(lastActionDate).getTime()
    : now

  const assessment = assessAging(
    status,
    lastActionDate,
    effectiveNow,
    slaPolicy,
  )

  return (
    <span
      title={
        assessment.slaHours === null
          ? 'No handling SLA for this stage'
          : `${assessment.label} — ${assessment.pctOfSla?.toFixed(0)}% consumed`
      }
      aria-label={`Time in stage ${formatElapsed(effectiveNow - new Date(lastActionDate).getTime())}, ${assessment.label}`}
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums',
        AGING_BADGE_CLASS[assessment.tier],
      )}
    >
      {formatElapsed(effectiveNow - new Date(lastActionDate).getTime())}
    </span>
  )
}

function SkeletonRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow className="border-b">
      <TableCell colSpan={colSpan} className="py-2 px-4 h-12">
        <div className="h-3 w-full max-w-[180px] rounded bg-muted animate-pulse" />
      </TableCell>
    </TableRow>
  )
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

  const columns = columnHelper.columns([
    columnHelper.accessor('formNumber', {
      header: 'LAM ID',
      cell: (info) => (
        <span className="text-xs font-semibold">{info.getValue()}</span>
      ),
      meta: { className: 'sticky left-0 bg-background z-10 border-r' },
    }),
    columnHelper.accessor('branchCode', {
      header: 'Branch',

      cell: (info) => (
        <span className="text-xs">{resolveBranchName(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('customerName', {
      header: 'Customer Name',
      cell: (info) => (
        <span className="font-medium text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('loanType', {
      header: 'Loan Type',
      cell: (info) => (
        <Badge variant="outline" className="text-xs font-normal">
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('product', {
      header: 'Product',
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('loanAmount', {
      header: () => <div className="text-right">Amount</div>,
      cell: (info) => (
        <div className="text-right font-semibold">
          ₱{info.getValue().toLocaleString()}
        </div>
      ),
    }),
    columnHelper.accessor('applicationDate', {
      header: 'App. Date',
      cell: (info) => (
        <span className="text-xs text-muted-foreground">
          {new Date(info.getValue()).toLocaleDateString()}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const status = info.getValue()
        const meta = LOAN_STATUS_META[status as LoanStatus]
        const flag = info.row.original.documentFlag
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              title={meta?.hint}
              className={cn('text-xs font-normal', meta?.className)}
            >
              {meta?.label ?? status}
            </Badge>
            {flag && (
              <Badge
                variant="outline"
                title={`${flag.missingCount} document(s) flagged: ${flag.reason ?? 'no reason provided'}`}
                className="h-5 gap-0.5 border-amber-300 bg-amber-50 px-1 text-[10px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
              >
                <FileDashed size={10} weight="bold" />
                {flag.missingCount}
              </Badge>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor('lastActionDate', {
      header: 'Time Lapsed',
      cell: (info) => (
        <TimeLapsedIndicator
          lastActionDate={info.getValue()}
          status={info.row.original.status}
          slaPolicy={slaPolicy}
        />
      ),
    }),
    columnHelper.accessor('lastActionBy', {
      header: 'Last Action By',
      cell: (info) => {
        const verb = info.row.original.lastActionVerb
        const ACTION_LABELS: Record<string, string> = {
          Created: 'Encoded',
          StatusChanged: 'Status updated',
          PushedBack: 'Pushed back',
          EvaluatedRecommended: 'Recommended',
          EvaluatedNotRecommended: 'Not recommended',
          ApplicationCancelled: 'Cancelled',
        }
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium">{info.getValue()}</span>
            {verb && (
              <span className="text-[10px] text-muted-foreground">
                {ACTION_LABELS[verb] ?? verb}
              </span>
            )}
          </div>
        )
      },
    }),
    columnHelper.accessor('assignedApproverName', {
      header: 'Assigned To',
      cell: (info) => {
        const row = info.row.original
        const mine = row.isQueueHead && row.queueOwnerName === currentUser?.name

        if (row.status === 'ForApproval') {
          if (row.assignedApproverName) {
            return (
              <div className="flex items-center gap-1.5">
                <UserCircle size={16} className="text-muted-foreground" />
                <span className="text-xs font-medium">
                  {row.assignedApproverName}
                </span>
                {mine && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    (you)
                  </span>
                )}
                {row.queuePosition != null && (
                  <span className="text-[10px] text-muted-foreground">
                    #{row.queuePosition}/{row.queueLength}
                  </span>
                )}
              </div>
            )
          }
          if (row.noAuthorityReason) {
            return (
              <Badge
                variant="outline"
                className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-normal"
                title={row.noAuthorityReason}
              >
                No approver configured
              </Badge>
            )
          }
        }

        if (row.isQueueHead) {
          return (
            <div className="flex items-center gap-1.5">
              <UserCircle size={16} className="text-muted-foreground" />
              <span className="text-xs font-medium">
                {row.queueOwnerName ?? info.getValue() ?? '—'}
              </span>
              {mine && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  (you)
                </span>
              )}
              {row.queuePosition != null && (
                <span className="text-[10px] text-muted-foreground">
                  #{row.queuePosition}/{row.queueLength}
                </span>
              )}
            </div>
          )
        }

        if (row.queuePosition != null) {
          return (
            <div className="flex items-center gap-1.5">
              <UserCircle size={16} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Waiting — {row.queueOwnerName ?? 'reviewer'}
              </span>
              <span className="text-[10px] text-muted-foreground">
                #{row.queuePosition}/{row.queueLength}
              </span>
            </div>
          )
        }

        return <span className="text-xs text-muted-foreground">—</span>
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const row = info.row.original
        const isEncoder = currentUser?.role === 'Encoder'
        const isOwner = currentUser?.id === row.createdById
        const cancellable =
          isEncoder && isOwner && CANCELLABLE_STATUSES.includes(row.status)
        if (!cancellable || !onCancel) return null
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Cancel application ${row.formNumber}`}
            onClick={(e) => {
              e.stopPropagation()
              onCancel(row)
            }}
          >
            <XCircle size={15} className="text-destructive" />
          </Button>
        )
      },
    }),
  ])

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
        {}
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

        {}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
          <div>
            {rowCount === 0 ? (
              '0 entries'
            ) : (
              <>
                Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  rowCount,
                )}{' '}
                of {rowCount} {rowCount === 1 ? 'entry' : 'entries'}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </SharedTimerProvider>
  )
}
