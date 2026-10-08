import {
  createCoreRowModel,
  createColumnHelper,
  coreFeatures,
  metaHelper,
  tableFeatures,
  rowSortingFeature,
  rowPaginationFeature,
} from '@tanstack/react-table'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import { UserCircle, FileDashed, XCircle } from '@phosphor-icons/react'
import type {
  LoanMonitoringRecord,
} from '@/src/features/loans/types/monitoring'
import { BRANCHES } from '@/src/shared/lib/api/types'
import { cn } from '@/src/shared/lib/utils'
import {
  LOAN_STATUS_META,
  type LoanStatus,
} from '@/src/features/loans/model/loan-status'
import { CANCELLABLE_STATUSES } from '@/src/features/loans/api/loan-review'
import { TimeLapsedIndicator } from './monitoring-table-utils'

type MonitoringColumnMeta = {
  className?: string
}

const features = tableFeatures({
  ...coreFeatures,
  rowSortingFeature,
  rowPaginationFeature,
  columnMeta: metaHelper<MonitoringColumnMeta>(),
  coreRowModel: createCoreRowModel(),
})

export { features }

const columnHelper = createColumnHelper<typeof features, LoanMonitoringRecord>()

function resolveBranchName(code: string): string {
  if (!code || code === '—') return code || '—'
  return BRANCHES.find((b) => b.code === code)?.name ?? code
}

const ACTION_LABELS: Record<string, string> = {
  Created: 'Encoded',
  StatusChanged: 'Status updated',
  PushedBack: 'Pushed back',
  EvaluatedRecommended: 'Recommended',
  EvaluatedNotRecommended: 'Not recommended',
  ApplicationCancelled: 'Cancelled',
}

export function buildColumns(
  slaPolicy?: Record<string, number> | null,
  currentUser?: { id: number; role: string; name?: string } | null,
  onCancel?: (record: LoanMonitoringRecord) => void,
) {
  return columnHelper.columns([
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
                <span className="text-xs font-medium">{row.assignedApproverName}</span>
                {mine && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">(you)</span>}
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
              {mine && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">(you)</span>}
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
}