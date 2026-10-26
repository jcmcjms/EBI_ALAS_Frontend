import { useMemo, useState } from 'react'
import { FlexRender, useTable } from '@tanstack/react-table'

import { toastError, toastSuccess } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Badge } from '@/src/shared/ui/primitives/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/data-display/table'
import { TablePagination } from '@/src/shared/ui/data-display/table-pagination'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { EmptyState, ErrorState } from '@/src/shared/ui/feedback/empty-state'
import {
  PERMISSIONS,
  type BranchResponse,
  type BranchStatus,
} from '@/src/shared/lib/api/types'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useBranches } from '@/src/shared/lib/api/branches'
import {
  useCreateBranch,
  useUpdateBranch,
  useUpdateBranchStatus,
} from '../hooks/use-branches-admin'
import { columns, features, type BranchesTableMeta } from './branch-columns'
import { BranchCreateSheet } from './branch-create-sheet'
import { BranchEditSheet } from './branch-edit-sheet'
import { BranchStatsCards } from './branch-stats-cards'
import { BranchesToolbar, type StatusFilter } from './branches-toolbar'
import { ConfirmActionSheet } from '../../users/components/confirm-action-sheet'
import type { CreateBranchForm, UpdateBranchForm } from './branch-form-schema'

export function BranchesTable() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission(PERMISSIONS.branchManage)

  const { data, isLoading, isError, error, isFetching, refetch } = useBranches()
  const createMutation = useCreateBranch()
  const updateMutation = useUpdateBranch()
  const statusMutation = useUpdateBranchStatus()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<BranchResponse | null>(null)
  const [confirm, setConfirm] = useState<{
    branch: BranchResponse
    status: BranchStatus
  } | null>(null)

  const branches = useMemo(() => {
    const rows = data ?? []
    return statusFilter === 'all'
      ? rows
      : rows.filter((b) => b.status === statusFilter)
  }, [data, statusFilter])

  const meta: BranchesTableMeta = {
    canManage,
    onEditBranch: (branch) => setEditing(branch),
    onStatusChange: (branch, status) => setConfirm({ branch, status }),
  }

  const table = useTable({
    features,
    data: branches,
    columns,
    state: { globalFilter, pagination },
    globalFilterFn: 'includesString',
    onPaginationChange: setPagination,
    meta,
  })

  const totalCount = data?.length ?? 0
  const activeCount = data?.filter((b) => b.status === 'Active').length ?? 0
  const inactiveCount = totalCount - activeCount

  const totalRows = branches.length
  const firstRow =
    totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRows,
  )
  const totalPages = table.getPageCount() || 1

  const handleCreate = async (payload: CreateBranchForm) => {
    try {
      await createMutation.mutateAsync(payload)
      toastSuccess('Branch created')
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  const handleUpdate = async (code: string, payload: UpdateBranchForm) => {
    try {
      await updateMutation.mutateAsync({ code, payload })
      toastSuccess('Branch changes saved')
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  const handleStatusChange = async () => {
    if (!confirm) return
    try {
      await statusMutation.mutateAsync({
        code: confirm.branch.code,
        status: confirm.status,
      })
      toastSuccess(`Branch marked ${confirm.status.toLowerCase()}`)
      setConfirm(null)
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  return (
    <>
      <div className="space-y-4">
        <BranchStatsCards
          totalCount={totalCount}
          activeCount={activeCount}
          inactiveCount={inactiveCount}
        />

        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                Branch directory
                <Badge variant="outline" className="ml-1 font-normal">
                  {totalRows} {totalRows === 1 ? 'branch' : 'branches'}
                </Badge>
              </CardTitle>
              <BranchesToolbar
                globalFilter={globalFilter}
                onGlobalFilterChange={(value) => {
                  setGlobalFilter(value)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
                statusFilter={statusFilter}
                onStatusFilterChange={(value) => {
                  setStatusFilter(value)
                  setPagination((p) => ({ ...p, pageIndex: 0 }))
                }}
                canManage={canManage}
                onCreate={() => setCreateOpen(true)}
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/40">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-9 px-4 text-xs font-semibold text-muted-foreground"
                      >
                        {header.isPlaceholder ? null : (
                          <FlexRender header={header} />
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="py-12 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Spinner className="size-4" />
                        <span>Loading branches…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="p-0">
                      <ErrorState
                        message={getErrorMessage(error)}
                        onRetry={() => refetch()}
                      />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="h-12 px-4 py-2">
                          <FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="p-0">
                      <EmptyState
                        title="No branches found"
                        hint="No branches match the current filters."
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>

          <TablePagination
            firstRow={firstRow}
            lastRow={lastRow}
            totalRows={totalRows}
            currentPage={pagination.pageIndex + 1}
            totalPages={totalPages}
            canPreviousPage={table.getCanPreviousPage()}
            canNextPage={table.getCanNextPage()}
            onPreviousPage={() =>
              setPagination((p) => ({
                ...p,
                pageIndex: Math.max(0, p.pageIndex - 1),
              }))
            }
            onNextPage={() =>
              setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
            }
            isFetching={isFetching}
          />
        </Card>
      </div>

      <BranchCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <BranchEditSheet
        branch={editing}
        onClose={() => setEditing(null)}
        onUpdate={handleUpdate}
      />
      <ConfirmActionSheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={
          confirm?.status === 'Active'
            ? `Reopen branch ${confirm.branch.code}?`
            : confirm?.status === 'Merged'
              ? `Mark branch ${confirm.branch.code} as merged?`
              : `Close branch ${confirm?.branch.code ?? ''}?`
        }
        description={
          confirm
            ? (confirm.status === 'Active'
                ? `${confirm.branch.name} becomes active again.`
                : `A branch can't be closed or merged while loans are open or users are assigned to it.`)
            : ''
        }
        actionLabel={
          confirm?.status === 'Active'
            ? 'Reopen'
            : confirm?.status === 'Merged'
              ? 'Mark as merged'
              : 'Close branch'
        }
        pendingLabel={
          confirm?.status === 'Active'
            ? 'Reopening…'
            : confirm?.status === 'Merged'
              ? 'Marking as merged…'
              : 'Closing…'
        }
        destructive={confirm?.status !== 'Active'}
        isPending={statusMutation.isPending}
        onConfirm={handleStatusChange}
      />
    </>
  )
}
