/**
 * Users data table — thin composition of columns, toolbar, stats, and table UI.
 *
 * This file owns:
 * - Permission gating
 * - Data fetching (useUsers, useUserStats)
 * - Local UI state (filters, pagination, selected user)
 * - Composition of sub-components
 *
 * Column definitions live in `components/user-columns.tsx`.
 * Toolbar lives in `components/users-toolbar.tsx`.
 * Stats cards live in `components/user-stats-cards.tsx`.
 * Action handlers live in `hooks/use-user-actions.ts`.
 */

import { useEffect, useState } from "react";
import { FlexRender, useTable } from "@tanstack/react-table";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";
import { getErrorMessage } from "@/src/lib/apiClient";
import { PERMISSIONS, type UserResponse } from "@/src/lib/api/types";
import { useAuthStore } from "@/src/store/authStore";
import { useRoles } from "./hooks/use-roles";
import { useUsers, useUserStats } from "./hooks/use-users";
import { exportUsers } from "./api/users";
import { features, columns } from "./components/user-columns";
import { UsersToolbar } from "./components/users-toolbar";
import { UserStatsCards } from "./components/user-stats-cards";
import { UserEditDrawer } from "./components/user-edit-drawer";
import { UserCreateDrawer } from "./components/user-create-drawer";
import { ConfirmActionSheet } from "./components/confirm-action-sheet";
import { AuditLogModal } from "./components/audit-log-modal";
import { TemporaryPasswordDialog } from "./components/temporary-password-dialog";
import { ImportUsersSheet } from "./components/import-users-sheet";
import { useUserActions } from "./hooks/use-user-actions";
import { toastSuccess, toastError } from "@/src/components/ui/toast";

// ─── Hook ───────────────────────────────────────────────────────────────────

function useDebouncedValue<T>(value: T, delayMs = 300): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function UsersDataTable() {
    // ── Permissions ───────────────────────────────────────────────
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const canCreateUsers = hasPermission(PERMISSIONS.userCreate);

    // ── Reference data ────────────────────────────────────────────
    const { data: roles } = useRoles();

    // ── Server-driven list state ──────────────────────────────────
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput, 300);
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [branchFilter, setBranchFilter] = useState<string>("all");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

    const usersQuery = useUsers({
        search,
        role: roleFilter === "all" ? undefined : roleFilter,
        branchId: branchFilter === "all" ? undefined : branchFilter,
        pageNumber: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
    });

    const stats = useUserStats();
    const paged = usersQuery.data;

    const canPreviousPage = paged?.hasPreviousPage ?? false;
    const canNextPage = paged?.hasNextPage ?? false;

    const shiftPage = (delta: number) =>
        setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex + delta) }));

    // ── Action handlers ───────────────────────────────────────────
    const actions = useUserActions();

    // ── Drawers / dialogs ─────────────────────────────────────────
    const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
    const [selectedUserForAuditLog, setSelectedUserForAuditLog] = useState<UserResponse | null>(null);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
    const [isImportSheetOpen, setIsImportSheetOpen] = useState(false);

    // ── Table instance ────────────────────────────────────────────
    const table = useTable({
        features,
        data: paged?.items ?? [],
        columns,
        state: { globalFilter: "" },
        globalFilterFn: "includesString",
        meta: {
            onEditUser: (user) => setSelectedUser(user),
            onResetPassword: actions.handleResetPasswordRequest,
            onForcePasswordReset: actions.handleForcePasswordResetRequest,
            onRevokeSessions: actions.handleRevokeSessionsRequest,
            onViewAuditLog: (user) => actions.handleViewAuditLog(user, setSelectedUserForAuditLog),
            onToggleStatus: actions.handleToggleStatusRequest,
        },
    });

    // ── Derived values ────────────────────────────────────────────
    const totalRows = paged?.totalCount ?? 0;
    const itemCount = paged?.items.length ?? 0;
    const firstRowIndex = itemCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
    const lastRowIndex = firstRowIndex === 0 ? 0 : firstRowIndex + itemCount - 1;

    const applyRoleFilter = (value: string | null) => {
        setRoleFilter(value ?? "all");
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };
    const applyBranchFilter = (value: string | null) => {
        setBranchFilter(value ?? "all");
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const handleExport = () => {
        exportUsers({
            search,
            role: roleFilter === "all" ? undefined : roleFilter,
            branchId: branchFilter === "all" ? undefined : branchFilter,
        })
            .then(() => toastSuccess(`Exported ${totalRows} users to Excel`))
            .catch((error) => toastError(getErrorMessage(error)));
    };

    // ── Render ────────────────────────────────────────────────────
    return (
        <>
            <div className="space-y-4">
                <UserStatsCards
                    totalCount={stats.totalCount}
                    activeCount={stats.activeCount}
                    suspendedCount={stats.suspendedCount}
                />

                <Card className="border shadow-sm">
                    <CardHeader className="border-b bg-muted/30 pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                User Directory
                                <Badge variant="outline" className="font-normal">
                                    {totalRows} records
                                </Badge>
                            </CardTitle>

                            <UsersToolbar
                                searchInput={searchInput}
                                onSearchInputChange={(v) => {
                                    setSearchInput(v);
                                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                                }}
                                branchFilter={branchFilter}
                                onBranchFilterChange={applyBranchFilter}
                                roleFilter={roleFilter}
                                onRoleFilterChange={applyRoleFilter}
                                roles={roles}
                                canCreateUsers={canCreateUsers}
                                onImport={() => setIsImportSheetOpen(true)}
                                onExport={handleExport}
                                onCreateUser={() => setIsCreateDrawerOpen(true)}
                            />
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="border-b hover:bg-transparent">
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
                                {usersQuery.isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                            Loading users...
                                        </TableCell>
                                    </TableRow>
                                ) : usersQuery.isError ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-red-600">
                                            Failed to load users: {getErrorMessage(usersQuery.error)}
                                        </TableCell>
                                    </TableRow>
                                ) : table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} className="transition-colors hover:bg-muted/30">
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="h-12 px-4 py-2">
                                                    <FlexRender cell={cell} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
                        <div>
                            Showing {firstRowIndex} to {lastRowIndex} of {totalRows} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() => shiftPage(-1)}
                                disabled={!canPreviousPage || usersQuery.isFetching}
                            >
                                Previous
                            </Button>
                            <span>
                                Page {paged?.currentPage ?? pagination.pageIndex + 1} of{" "}
                                {paged?.totalPages ?? 1}
                            </span>
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() => shiftPage(1)}
                                disabled={!canNextPage || usersQuery.isFetching}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Drawers / dialogs */}
            <UserEditDrawer
                user={selectedUser}
                canEdit={hasPermission(PERMISSIONS.userEdit)}
                onClose={() => setSelectedUser(null)}
                onSave={(userId, changes) => actions.handleUpdateUser(userId, changes, setSelectedUser)}
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
                title={actions.confirmAction?.title ?? ""}
                description={actions.confirmAction?.description ?? ""}
                actionLabel={actions.confirmAction?.actionLabel ?? ""}
                destructive={actions.confirmAction?.destructive}
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
    );
}
