import { useEffect, useState } from 'react'
import { useTable } from '@tanstack/react-table'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { PERMISSIONS } from '@/src/shared/lib/api/types'
import type { UserResponse } from './api/users-types'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useRoles } from './hooks/use-roles'
import { useUsers, useUserStats } from './hooks/use-users'
import { exportUsers } from './api/users'
import { features, columns } from './components/user-columns'
import { UserStatsCards } from './components/user-stats-cards'
import { UserEditDrawer } from './components/user-edit-drawer'
import { UserCreateDrawer } from './components/user-create-drawer'
import { ConfirmActionSheet } from './components/confirm-action-sheet'
import { AuditLogModal } from './components/audit-log-modal'
import { TemporaryPasswordDialog } from './components/temporary-password-dialog'
import { ImportUsersSheet } from './components/import-users-sheet'
import { useUserActions } from './hooks/use-user-actions'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { UsersTableCard } from './components/users-table-card'

function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

export function UsersDataTable() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canCreateUsers = hasPermission(PERMISSIONS.userCreate)

  const { data: roles } = useRoles()

  const [searchInput, setSearchInput] = useState('')
  const search = useDebouncedValue(searchInput, 300)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const usersQuery = useUsers({
    search,
    role: roleFilter === 'all' ? undefined : roleFilter,
    branchId: branchFilter === 'all' ? undefined : branchFilter,
    pageNumber: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  })

  const stats = useUserStats()
  const paged = usersQuery.data

  const canPreviousPage = paged?.hasPreviousPage ?? false
  const canNextPage = paged?.hasNextPage ?? false

  const shiftPage = (delta: number) =>
    setPagination((prev) => ({
      ...prev,
      pageIndex: Math.max(0, prev.pageIndex + delta),
    }))

  const actions = useUserActions()

  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null)
  const [selectedUserForAuditLog, setSelectedUserForAuditLog] =
    useState<UserResponse | null>(null)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false)

  const table = useTable({
    features,
    data: paged?.items ?? [],
    columns,
    state: { globalFilter: '' },
    globalFilterFn: 'includesString',
    meta: {
      onEditUser: (user) => setSelectedUser(user),
      onResetPassword: actions.handleResetPasswordRequest,
      onForcePasswordReset: actions.handleForcePasswordResetRequest,
      onRevokeSessions: actions.handleRevokeSessionsRequest,
      onViewAuditLog: (user) =>
        actions.handleViewAuditLog(user, setSelectedUserForAuditLog),
      onToggleStatus: actions.handleToggleStatusRequest,
    },
  })

  const totalRows = paged?.totalCount ?? 0
  const itemCount = paged?.items.length ?? 0
  const firstRowIndex =
    itemCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRowIndex = firstRowIndex === 0 ? 0 : firstRowIndex + itemCount - 1

  const handleExport = () => {
    exportUsers({
      search,
      role: roleFilter === 'all' ? undefined : roleFilter,
      branchId: branchFilter === 'all' ? undefined : branchFilter,
    })
      .then(() => toastSuccess(`Exported ${totalRows} users to Excel`))
      .catch((error) => toastError(getErrorMessage(error)))
  }

  return (
    <>
      <div className="space-y-4">
        <UserStatsCards
          totalCount={stats.totalCount}
          activeCount={stats.activeCount}
          suspendedCount={stats.suspendedCount}
        />

        <UsersTableCard
          table={table}
          columnCount={columns.length}
          isLoading={usersQuery.isLoading}
          isError={usersQuery.isError}
          errorMessage={getErrorMessage(usersQuery.error)}
          isFetching={usersQuery.isFetching}
          totalRows={totalRows}
          firstRowIndex={firstRowIndex}
          lastRowIndex={lastRowIndex}
          currentPage={paged?.currentPage ?? pagination.pageIndex + 1}
          totalPages={paged?.totalPages ?? 1}
          canPreviousPage={canPreviousPage}
          canNextPage={canNextPage}
          search={search}
          roleFilter={roleFilter}
          branchFilter={branchFilter}
          canCreateUsers={canCreateUsers}
          onPreviousPage={() => shiftPage(-1)}
          onNextPage={() => shiftPage(1)}
          onRetry={() => usersQuery.refetch()}
          onClearFilters={() => {
            setSearchInput('')
            setRoleFilter('all')
            setBranchFilter('all')
          }}
          onCreateUser={() => setIsCreateDrawerOpen(true)}
          toolbarProps={{
            searchInput,
            onSearchInputChange: (v) => {
              setSearchInput(v)
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            },
            branchFilter,
            onBranchFilterChange: (value) => {
              setBranchFilter(value ?? 'all')
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            },
            roleFilter,
            onRoleFilterChange: (value) => {
              setRoleFilter(value ?? 'all')
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            },
            roles,
            canCreateUsers,
            onImport: () => setIsImportSheetOpen(true),
            onExport: handleExport,
            onCreateUser: () => setIsCreateDrawerOpen(true),
          }}
        />
      </div>

      <UserEditDrawer
        user={selectedUser}
        canEdit={hasPermission(PERMISSIONS.userEdit)}
        onClose={() => setSelectedUser(null)}
        onSave={(userId, changes) =>
          actions.handleUpdateUser(userId, changes, setSelectedUser)
        }
        onToggleStatus={actions.handleToggleStatusRequest}
        onResetPassword={actions.handleResetPasswordRequest}
        onForcePasswordReset={actions.handleForcePasswordResetRequest}
        onRevokeSessions={actions.handleRevokeSessionsRequest}
      />
      <UserCreateDrawer
        open={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        onCreate={actions.handleCreateUser}
      />
      <ConfirmActionSheet
        open={actions.confirmAction !== null}
        onClose={actions.closeConfirm}
        title={actions.confirmAction?.title ?? ''}
        description={actions.confirmAction?.description ?? ''}
        actionLabel={actions.confirmAction?.actionLabel ?? ''}
        destructive={actions.confirmAction?.destructive}
        isPending={actions.isResetPasswordPending}
        onConfirm={actions.confirmAction?.onConfirm ?? (() => {})}
      />
      <AuditLogModal
        user={selectedUserForAuditLog}
        onClose={() => setSelectedUserForAuditLog(null)}
      />
      <TemporaryPasswordDialog
        credential={actions.tempCred}
        onDismiss={() => actions.setTempCred(null)}
      />
      <ImportUsersSheet
        open={isImportSheetOpen}
        onClose={() => setIsImportSheetOpen(false)}
      />
    </>
  )
}