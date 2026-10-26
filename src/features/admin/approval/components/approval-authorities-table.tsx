import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTable } from '@tanstack/react-table'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import {
  approvalAuthorityKeys,
  createApprovalAuthority,
  deactivateApprovalAuthority,
  getApprovalAuthorities,
  listApproverUsers,
  setApprovalAuthorityUsers,
  updateApprovalAuthority,
  type ApprovalAuthorityDto,
  type AuthorityLimitsPayload,
} from '../api/approval-authorities'
import { features, columns, type ApprovalAuthoritiesTableMeta } from './approval-authority-columns'
import { ApprovalAuthorityStatsCards } from './approval-authority-stats-cards'
import { ApprovalAuthoritiesTableCard } from './approval-authorities-table-card'
import { AuthorityCreateSheet } from './authority-create-sheet'
import { AuthorityEditSheet } from './authority-edit-sheet'
import { ApproverAssignmentSheet } from './approver-assignment-sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/shared/ui/feedback/alert-dialog'

export function ApprovalAuthoritiesTable() {
  const qc = useQueryClient()

  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalAuthorityDto | null>(null)
  const [assigning, setAssigning] = useState<ApprovalAuthorityDto | null>(null)
  const [deactivating, setDeactivating] = useState<ApprovalAuthorityDto | null>(null)

  const authorities = useQuery({
    queryKey: approvalAuthorityKeys.list(),
    queryFn: getApprovalAuthorities,
    staleTime: 30_000,
  })

  const approverUsers = useQuery({
    queryKey: approvalAuthorityKeys.approverUsers(),
    queryFn: listApproverUsers,
    staleTime: 60_000,
    enabled: assigning !== null,
  })

  const createMutation = useMutation({
    mutationFn: createApprovalAuthority,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string
      payload: AuthorityLimitsPayload
    }) => updateApprovalAuthority(key, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateApprovalAuthority,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const assignUsersMutation = useMutation({
    mutationFn: ({ key, userIds }: { key: string; userIds: string[] }) =>
      setApprovalAuthorityUsers(key, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const handleCreate = async (payload: AuthorityLimitsPayload) => {
    try {
      await createMutation.mutateAsync(payload)
      toastSuccess('Approval authority created')
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  const handleUpdate = async (key: string, payload: AuthorityLimitsPayload) => {
    try {
      await updateMutation.mutateAsync({ key, payload })
      toastSuccess('Approval authority updated')
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  const handleDeactivate = async () => {
    if (!deactivating) return
    try {
      await deactivateMutation.mutateAsync(deactivating.key)
      toastSuccess('Approval authority deactivated')
      setDeactivating(null)
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  const handleAssign = async (userIds: string[]) => {
    if (!assigning) return
    try {
      await assignUsersMutation.mutateAsync({ key: assigning.key, userIds })
      toastSuccess('Approvers updated')
      setAssigning(null)
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  const rows = authorities.data ?? []
  const totalCount = rows.length
  const branchCount = rows.filter((r) => r.scopeType <= 1).length
  const globalCount = rows.filter((r) => r.scopeType === 2).length

  const meta: ApprovalAuthoritiesTableMeta = {
    canManage: true,
    onEdit: (a) => setEditing(a),
    onAssign: (a) => setAssigning(a),
    onDeactivate: (a) => setDeactivating(a),
  }

  const table = useTable({
    features,
    data: rows,
    columns,
    state: { globalFilter, pagination },
    globalFilterFn: 'includesString',
    onPaginationChange: setPagination,
    meta,
  })

  const totalRows = table.getFilteredRowModel().rows.length
  const firstRow = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows)
  const totalPages = table.getPageCount() || 1

  return (
    <>
      <div className="space-y-4">
        <ApprovalAuthorityStatsCards
          totalCount={totalCount}
          branchCount={branchCount}
          globalCount={globalCount}
        />

        <ApprovalAuthoritiesTableCard
          table={table}
          columnCount={columns.length + 1}
          isLoading={authorities.isLoading}
          isError={authorities.isError}
          errorMessage={getErrorMessage(authorities.error)}
          isFetching={authorities.isFetching}
          totalRows={totalRows}
          firstRow={firstRow}
          lastRow={lastRow}
          totalPages={totalPages}
          pagination={pagination}
          globalFilter={globalFilter}
          setPagination={setPagination}
          setGlobalFilter={setGlobalFilter}
          onRetry={() => authorities.refetch()}
          toolbarProps={{
            search: globalFilter,
            onSearchChange: (v) => {
              setGlobalFilter(v)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            },
            canManage: true,
            onCreate: () => setCreateOpen(true),
          }}
        />
      </div>

      <AuthorityCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <AuthorityEditSheet
        authority={editing}
        onClose={() => setEditing(null)}
        onUpdate={handleUpdate}
      />
      <ApproverAssignmentSheet
        authority={assigning}
        users={approverUsers.data ?? []}
        isLoading={approverUsers.isLoading || approverUsers.isFetching}
        isPending={assignUsersMutation.isPending}
        onClose={() => setAssigning(null)}
        onSave={handleAssign}
      />
      <AlertDialog
        open={deactivating !== null}
        onOpenChange={(o) => !o && setDeactivating(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {deactivating?.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This tier can't be deactivated while open loans still use it.
              Past approvals are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deactivateMutation.isPending}
              onClick={handleDeactivate}
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
