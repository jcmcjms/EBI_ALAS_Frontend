import { useMemo, useState } from 'react'
import { FlexRender, useTable } from '@tanstack/react-table'
import { Plus } from '@phosphor-icons/react'

import { toastError, toastSuccess } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { Button } from '@/src/shared/ui/primitives/button'
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
import { Input } from '@/src/shared/ui/primitives/input'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { EmptyState, ErrorState } from '@/src/shared/ui/feedback/empty-state'
import { PERMISSIONS, type BranchResponse, type BranchStatus } from '@/src/shared/lib/api/types'
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
import { ConfirmActionSheet } from '../../users/components/confirm-action-sheet'
import type { CreateBranchForm, UpdateBranchForm } from './branch-form-schema'

type StatusFilter = 'all' | BranchStatus

export function BranchesTable() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManage = hasPermission(PERMISSIONS.branchManage)

  const { data, isLoading, isError, error, refetch } = useBranches()
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
      toastSuccess('Branch created successfully')
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  const handleUpdate = async (code: string, payload: UpdateBranchForm) => {
    try {
      await updateMutation.mutateAsync({ code, payload })
      toastSuccess('Branch updated successfully')
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
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            Branch Directory
            <Badge variant="outline" className="ml-1 font-normal">
              {totalRows} {totalRows === 1 ? 'branch' : 'branches'}
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value)
                setPagination((p) => ({ ...p, pageIndex: 0 }))
              }}
              placeholder="Search code or name…"
              className="h-9 w-[200px]"
            />
            <div className="flex gap-1">
              {(['all', 'Active', 'Closed', 'Merged'] as const).map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(s)
                    setPagination((p) => ({ ...p, pageIndex: 0 }))
                  }}
                >
                  {s === 'all' ? 'All' : s}
                </Button>
              ))}
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={16} />
                New branch
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorState
            message={getErrorMessage(error)}
            onRetry={() => refetch()}
          />
        ) : totalRows === 0 ? (
          <EmptyState
            title="No branches found"
            hint="No branches match the current filters."
          />
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {!isLoading && !isError && totalRows > 0 && (
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
          entityLabel="branches"
        />
      )}

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
            ? 'Reopen branch'
            : confirm?.status === 'Merged'
              ? 'Mark branch as merged'
              : 'Close branch'
        }
        description={
          confirm
            ? `Change ${confirm.branch.code} — ${confirm.branch.name} to ${confirm.status}? Closure is blocked while open loans or active users remain assigned.`
            : ''
        }
        actionLabel={
          confirm?.status === 'Active'
            ? 'Reopen'
            : confirm?.status === 'Merged'
              ? 'Mark merged'
              : 'Close branch'
        }
        destructive={confirm?.status !== 'Active'}
        isPending={statusMutation.isPending}
        onConfirm={handleStatusChange}
      />
    </Card>
  )
}
