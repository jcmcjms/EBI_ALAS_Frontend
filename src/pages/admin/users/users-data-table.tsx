import { useEffect, useState } from "react";
import {
    createColumnHelper,
    tableFeatures,
    useTable,
    columnFilteringFeature,
    columnVisibilityFeature,
    globalFilteringFeature,
    createFilteredRowModel,
    filterFn_includesString,
    FlexRender,
} from "@tanstack/react-table";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/src/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import {
    MagnifyingGlass,
    Plus,
    CaretDown,
    Pencil,
    Key,
    ShieldCheck,
    SignOut,
    ClockCounterClockwise,
    UserCircleMinus,
    UserCirclePlus,
    Funnel,
    Export,
} from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils";
import { stripRoleDisplayName } from "@/src/lib/role-badges";
import { BRANCHES, PERMISSIONS, type CreateUserPayload, type UpdateUserPayload, type UserResponse } from "@/src/lib/api/types";

/** Lookup branch display name by branch code. */
function getBranchName(code: string): string {
    const branch = BRANCHES.find(b => b.code === code);
    return branch?.name ?? code;
}
import { getErrorMessage } from "@/src/lib/apiClient";
import { useAuthStore } from "@/src/store/authStore";
import { useRoles } from "@/src/hooks/use-roles";
import { useCreateUser, useForcePasswordReset, useResetUserPassword, useRevokeUserSessions, useUpdateUser, useUpdateUserStatus, useUserStats, useUsers } from "@/src/hooks/use-users";
import { UserEditDrawer, type UserProfileChanges } from "./components/user-edit-drawer";
import { UserCreateDrawer, type UserCreatePayload } from "./components/user-create-drawer";
import { ConfirmActionSheet } from "./components/confirm-action-sheet";
import { AuditLogModal } from "./components/audit-log-modal";
import { TemporaryPasswordDialog, type TemporaryCredential } from "./components/temporary-password-dialog";

/** Returns `value` only after it has stayed unchanged for `delayMs`. */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(timer);
    }, [value, delayMs]);
    return debounced;
}

function formatFullName(user: Pick<UserResponse, "firstName" | "middleName" | "lastName">): string {
    return [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ");
}

/**
 * Per-instance imperative handlers shared with column cells through the
 * typed `tableMeta` slot declared below. Values are read at call time from
 * `table.options.meta`, so closures always see the latest render's handlers.
 */
type UsersTableMeta = {
    onEditUser?: (user: UserResponse) => void;
    onResetPassword?: (user: UserResponse) => void;
    onForcePasswordReset?: (user: UserResponse) => void;
    onRevokeSessions?: (user: UserResponse) => void;
    onViewAuditLog?: (user: UserResponse) => void;
    onToggleStatus?: (user: UserResponse) => void;
};

// Declare features for the table.
// NOTE: `globalFilteringFeature` is required for `state.globalFilter` to be a
// valid slice and for the search box to actually filter rows. String filter
// functions must be registered via `filterFns` to be usable by name.
// Pagination is server-owned — no rowPaginationFeature / createPaginatedRowModel.
const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    globalFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
    filterFns: { includesString: filterFn_includesString },
    tableMeta: {} as UsersTableMeta,
});

const columnHelper = createColumnHelper<typeof features, UserResponse>();

const columns = columnHelper.columns([
    columnHelper.display({
        id: "user",
        header: "User",
        cell: (info) => {
            const user = info.row.original;
            const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
            return (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase">
                        {initials}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">{formatFullName(user)}</span>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>
                </div>
            );
        },
    }),
    columnHelper.accessor("username", {
        header: "Username",
        cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor("branchId", {
        header: "Branch",
        cell: (info) => <span className="text-sm">{getBranchName(info.getValue())}</span>,
    }),
    columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => <Badge variant="secondary" className="font-normal text-xs">{info.getValue()}</Badge>,
    }),
    columnHelper.display({
        id: "coveredBranches",
        header: "Covered Branches",
        cell: (info) => {
            const user = info.row.original;
            // Only show for approvers with covered branches
            if (!user.coveredBranches || user.coveredBranches.length === 0) {
                return <span className="text-xs text-muted-foreground">—</span>;
            }
            const names = user.coveredBranches
                .map(code => BRANCHES.find(b => b.code === code)?.name ?? code)
                .filter(Boolean);
            if (names.length <= 2) {
                return (
                    <div className="flex flex-wrap gap-1">
                        {names.map(name => (
                            <Badge key={name} variant="outline" className="font-normal text-xs">{name}</Badge>
                        ))}
                    </div>
                );
            }
            return (
                <Badge variant="outline" className="font-normal text-xs">
                    {names.length} branches
                </Badge>
            );
        },
    }),
    columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => {
            const isActive = info.getValue();
            return (
                <Badge
                    variant="outline"
                    className={cn(
                        "font-normal text-xs",
                        isActive
                            ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                            : "border-red-600/25 bg-red-500/10 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400"
                    )}
                >
                    {isActive ? "Active" : "Suspended"}
                </Badge>
            );
        },
    }),
    columnHelper.accessor("createdAt", {
        header: "Created",
        cell: (info) => (
            <span className="text-xs whitespace-nowrap text-muted-foreground">
                {format(new Date(info.getValue()), "MMM d, yyyy h:mm a")}
            </span>
        ),
    }),
    columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
            const user = info.row.original;
            const meta = info.table.options.meta;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.username}`} />
                        }
                    >
                        <CaretDown size={16} weight="bold" />
                        <span className="sr-only">Open menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuItem onClick={() => meta?.onEditUser?.(user)}>
                            <Pencil size={14} /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => meta?.onResetPassword?.(user)}>
                            <Key size={14} /> Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => meta?.onForcePasswordReset?.(user)}>
                            <ShieldCheck size={14} /> Force Password Reset
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => meta?.onRevokeSessions?.(user)}>
                            <SignOut size={14} /> Revoke Sessions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => meta?.onViewAuditLog?.(user)}>
                            <ClockCounterClockwise size={14} /> View Audit Log
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.isActive ? (
                            <DropdownMenuItem variant="destructive" onClick={() => meta?.onToggleStatus?.(user)}>
                                <UserCircleMinus size={14} /> Suspend User
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem onClick={() => meta?.onToggleStatus?.(user)}>
                                <UserCirclePlus size={14} /> Activate User
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    }),
]);

interface ConfirmActionState {
    title: string;
    description: string;
    actionLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
}

export function UsersDataTable() {
    // ---- Permission gating (mirrors backend policies) ----
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const canCreateUsers = hasPermission(PERMISSIONS.userCreate);
    const canSuspendUsers = hasPermission(PERMISSIONS.userSuspend);

    // ---- Reference data (roles come from GET /api/roles) ----
    const { data: roles } = useRoles();

    // ---- Server-driven list state ----
    const [searchInput, setSearchInput] = useState("");
    const search = useDebouncedValue(searchInput, 300);
    const [roleFilter, setRoleFilter] = useState<string>("all");
    const [branchFilter, setBranchFilter] = useState<string>("all");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

    const usersQuery = useUsers({
        search,
        role: roleFilter === "all" ? undefined : roleFilter,
        branchId: branchFilter === "all" ? undefined : branchFilter,
        pageNumber: pagination.pageIndex + 1, // API is 1-based
        pageSize: pagination.pageSize,
    });

    const stats = useUserStats();

    const paged = usersQuery.data;

    // Server-side pagination controls derived from the PagedResult envelope.
    const canPreviousPage = paged?.hasPreviousPage ?? false;
    const canNextPage = paged?.hasNextPage ?? false;

    const shiftPage = (delta: number) =>
        setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex + delta) }));

    // ---- Mutations ----
    const createUserMutation = useCreateUser();
    const updateUserMutation = useUpdateUser();
    const updateUserStatusMutation = useUpdateUserStatus();
    const resetUserPasswordMutation = useResetUserPassword();
    const forcePasswordResetMutation = useForcePasswordReset();
    const revokeSessionsMutation = useRevokeUserSessions();

    // ---- Drawers / dialogs ----
    const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
    const [selectedUserForAuditLog, setSelectedUserForAuditLog] = useState<UserResponse | null>(null);
    const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
    const [tempCred, setTempCred] = useState<TemporaryCredential | null>(null);

    const table = useTable({
        features,
        data: paged?.items ?? [],
        columns,
        state: {
            globalFilter: "",
        },
        globalFilterFn: "includesString",
        meta: {
            onEditUser: (user) => setSelectedUser(user),
            onResetPassword: handleResetPasswordRequest,
            onForcePasswordReset: handleForcePasswordResetRequest,
            onRevokeSessions: handleRevokeSessionsRequest,
            onViewAuditLog: handleViewAuditLog,
            onToggleStatus: handleToggleStatusRequest,
        },
    });

    // ---- Readouts with empty-list guards ----
    // Derive from what actually arrived so a short last page or empty
    // filtered set can never disagree with the body.
    const totalRows = paged?.totalCount ?? 0;
    const itemCount = paged?.items.length ?? 0;
    const firstRowIndex = itemCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
    const lastRowIndex = firstRowIndex === 0 ? 0 : firstRowIndex + itemCount - 1;

    // ---- Filter helpers reset pagination when criteria change ----
    const applyRoleFilter = (value: string | null) => {
        setRoleFilter(value ?? "all");
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    };
    const applyBranchFilter = (value: string | null) => {
        setBranchFilter(value ?? "all");
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
    };

    // ---- Action handlers: destructive/sensitive actions route through ConfirmActionSheet ----

    function closeConfirm() {
        setConfirmAction(null);
    }

    function handleToggleStatusRequest(user: UserResponse) {
        if (!canSuspendUsers) {
            toastError("You don't have permission to suspend or activate users");
            return;
        }
        if (user.isActive) {
            setConfirmAction({
                title: "Suspend User Account",
                description: `Are you sure you want to suspend ${formatFullName(user)}? This will immediately revoke their access to ALAS.`,
                actionLabel: "Suspend User",
                destructive: true,
                onConfirm: () => {
                    updateUserStatusMutation.mutate(
                        { id: user.id, isActive: false },
                        {
                            onSuccess: () => toastSuccess(`${formatFullName(user)}'s account has been suspended`),
                            onError: (e) => toastError(getErrorMessage(e)),
                        }
                    );
                    closeConfirm();
                },
            });
        } else {
            setConfirmAction({
                title: "Activate User Account",
                description: `Are you sure you want to activate ${formatFullName(user)}? This will restore their access to ALAS.`,
                actionLabel: "Activate User",
                onConfirm: () => {
                    updateUserStatusMutation.mutate(
                        { id: user.id, isActive: true },
                        {
                            onSuccess: () => toastSuccess(`${formatFullName(user)}'s account has been activated`),
                            onError: (e) => toastError(getErrorMessage(e)),
                        }
                    );
                    closeConfirm();
                },
            });
        }
    }

    // Security workflows below have no backing endpoint yet — surface that
    // honestly instead of faking success.
    function handleResetPasswordRequest(user: UserResponse) {
        if (!hasPermission(PERMISSIONS.userEdit)) {
            toastError("You don't have permission to reset passwords");
            return;
        }
        setConfirmAction({
            title: "Reset Password",
            description: `Generate a new temporary password for @${user.username}? The user will be required to change it on next login.`,
            actionLabel: "Reset Password",
            onConfirm: () => {
                resetUserPasswordMutation.mutate(user.id, {
                    onSuccess: (res) => {
                        setTempCred({ username: res.username, temporaryPassword: res.temporaryPassword });
                    },
                    onError: (e) => toastError(getErrorMessage(e)),
                });
                closeConfirm();
            },
        });
    }

    function handleForcePasswordResetRequest(user: UserResponse) {
        if (!hasPermission(PERMISSIONS.userEdit)) {
            toastError("You don't have permission to force password resets");
            return;
        }
        setConfirmAction({
            title: "Force Password Reset",
            description: `Require @${user.username} to change their password on next login?`,
            actionLabel: "Force Reset",
            onConfirm: () => {
                forcePasswordResetMutation.mutate(user.id, {
                    onSuccess: () =>
                        toastSuccess(`${formatFullName(user)} will be required to change password on next login`),
                    onError: (e) => toastError(getErrorMessage(e)),
                });
                closeConfirm();
            },
        });
    }

    function handleRevokeSessionsRequest(user: UserResponse) {
        if (!hasPermission(PERMISSIONS.userSuspend)) {
            toastError("You don't have permission to revoke sessions");
            return;
        }
        setConfirmAction({
            title: "Revoke All Sessions",
            description: `Sign out @${user.username} from all active devices? This will invalidate all refresh tokens.`,
            actionLabel: "Revoke Sessions",
            destructive: true,
            onConfirm: () => {
                revokeSessionsMutation.mutate(user.id, {
                    onSuccess: (count) =>
                        toastSuccess(`Revoked ${count} active session(s) for ${formatFullName(user)}`),
                    onError: (e) => toastError(getErrorMessage(e)),
                });
                closeConfirm();
            },
        });
    }

    function handleViewAuditLog(user: UserResponse) {
        if (!hasPermission(PERMISSIONS.userView)) {
            toastError("You don't have permission to view audit logs");
            return;
        }
        setSelectedUserForAuditLog(user);
    }

    // ---- Create ----

    /**
     * Called by the drawer after local validation. The drawer owns the
     * generated temporary password and reveals it only after we report success.
     */
    async function handleCreateUser(payload: UserCreatePayload): Promise<boolean> {
        try {
            await createUserMutation.mutateAsync({
                username: payload.username,
                password: payload.password,
                firstName: payload.firstName,
                middleName: payload.middleName || null,
                lastName: payload.lastName,
                branchId: payload.branchId,
                role: payload.role,
                jobTitle: payload.jobTitle.trim() || null,
                eSignature: payload.eSignature,
                coveredBranches: payload.coveredBranches,
            } satisfies CreateUserPayload);
            // Show the secure handoff dialog instead of a toast.
            setTempCred({ username: payload.username, temporaryPassword: payload.password });
            return true;
        } catch (error) {
            toastError(getErrorMessage(error));
            return false;
        }
    }

    // ---- Update ----

    async function handleUpdateUser(userId: number, changes: UserProfileChanges): Promise<boolean> {
        try {
            // Spread the optional fields through. `eSignature` is only
            // present when the user actually edited the signature pad —
            // for routine profile edits it's omitted and the backend's
            // "no-change" semantics preserve the existing PNG.
            await updateUserMutation.mutateAsync({
                id: userId,
                payload: {
                    firstName: changes.firstName,
                    middleName: changes.middleName || null,
                    lastName: changes.lastName,
                    branchId: changes.branchId,
                    role: changes.role,
                    jobTitle: changes.jobTitle ?? null,
                    eSignature: changes.eSignature,
                    coveredBranches: changes.coveredBranches,
                } satisfies UpdateUserPayload,
            });
            toastSuccess(`${changes.firstName} ${changes.lastName} updated successfully`);
            setSelectedUser(null);
            return true;
        } catch (error) {
            toastError(getErrorMessage(error));
            return false;
        }
    }

    // ---- Export ----

    function handleExportCSV() {
        const headers = ["ID", "Username", "First Name", "Middle Name", "Last Name", "Branch", "Role", "Covered Branches", "Status", "Created At"];
        const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
        const rows = (paged?.items ?? []).map(u =>
            [
                String(u.id),
                u.username,
                u.firstName,
                u.middleName ?? "",
                u.lastName,
                getBranchName(u.branchId),
                u.role,
                (u.coveredBranches ?? []).map(code => BRANCHES.find(b => b.code === code)?.name ?? code).join(", "),
                u.isActive ? "Active" : "Suspended",
                u.createdAt,
            ].map(escapeCell).join(",")
        );
        // Leading BOM keeps Excel happy with UTF-8.
        const csvContent = "\uFEFF" + [headers.map(escapeCell).join(","), ...rows].join("\r\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toastSuccess(`Exported ${paged?.items.length ?? 0} users to CSV`);
    }

    return (
        <>
            <div className="space-y-4">
                {/* Dense Stats Bar */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="flex items-center justify-between border p-3 shadow-none">
                        <div className="text-sm text-muted-foreground">Total Users</div>
                        <div className="text-xl font-bold">{stats.totalCount}</div>
                    </Card>
                    <Card className="flex items-center justify-between border p-3 shadow-none">
                        <div className="text-sm text-muted-foreground">Active</div>
                        <div className="text-xl font-bold text-emerald-600">{stats.activeCount}</div>
                    </Card>
                    <Card className="flex items-center justify-between border p-3 shadow-none">
                        <div className="text-sm text-muted-foreground">Suspended</div>
                        <div className="text-xl font-bold text-red-600">{stats.suspendedCount}</div>
                    </Card>
                </div>

                <Card className="border shadow-sm">
                    <CardHeader className="border-b bg-muted/30 pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                User Directory
                                <Badge variant="outline" className="font-normal">{totalRows} records</Badge>
                            </CardTitle>

                            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                <div className="relative">
                                    <MagnifyingGlass size={16} weight="bold" className="absolute top-2.5 left-2.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search name, username..."
                                        value={searchInput}
                                        onChange={(e) => {
                                            setSearchInput(e.target.value);
                                            setPagination(prev => ({ ...prev, pageIndex: 0 }));
                                        }}
                                        className="h-9 w-full bg-background pl-8 sm:w-[220px]"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Select value={branchFilter} onValueChange={applyBranchFilter}>
                                        <SelectTrigger className="h-9 w-[150px] bg-background">
                                            <Funnel size={14} className="mr-1 text-muted-foreground" />
                                            <SelectValue placeholder="Branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {BRANCHES.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>

                                    <Select value={roleFilter} onValueChange={applyRoleFilter}>
                                        <SelectTrigger className="h-9 w-[150px] bg-background">
                                            <Funnel size={14} className="mr-1 text-muted-foreground" />
                                            <SelectValue placeholder="Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Roles</SelectItem>
                                            {roles.map(r => <SelectItem key={r.name} value={r.name}>{stripRoleDisplayName(r.displayName)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-2 sm:ml-auto">
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExportCSV}>
                                        <Export size={14} weight="bold" data-icon="inline-start" />
                                        Export CSV
                                    </Button>
                                    {canCreateUsers && (
                                        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setIsCreateDrawerOpen(true)}>
                                            <Plus size={14} weight="bold" data-icon="inline-start" />
                                            Add User
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="border-b hover:bg-transparent">
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id} className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                                                {header.isPlaceholder
                                                    ? null
                                                    : <FlexRender header={header} />}
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
                                            {/* getVisibleCells respects columnVisibility state; both it and
                                                getAllCells exist in v9 — this one honors hidden columns. */}
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

                    {/* Pagination — server-driven via PagedResult flags */}
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
                            <span>Page {paged?.currentPage ?? pagination.pageIndex + 1} of {paged?.totalPages ?? 1}</span>
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

            <UserEditDrawer
                user={selectedUser}
                canEdit={hasPermission(PERMISSIONS.userEdit)}
                onClose={() => setSelectedUser(null)}
                onSave={handleUpdateUser}
                onToggleStatus={handleToggleStatusRequest}
                onResetPassword={handleResetPasswordRequest}
                onForcePasswordReset={handleForcePasswordResetRequest}
                onRevokeSessions={handleRevokeSessionsRequest}
            />
            <UserCreateDrawer
                open={isCreateDrawerOpen}
                onClose={() => setIsCreateDrawerOpen(false)}
                onCreate={handleCreateUser}
            />
            <ConfirmActionSheet
                open={confirmAction !== null}
                onClose={closeConfirm}
                title={confirmAction?.title ?? ""}
                description={confirmAction?.description ?? ""}
                actionLabel={confirmAction?.actionLabel ?? ""}
                destructive={confirmAction?.destructive}
                onConfirm={confirmAction?.onConfirm ?? (() => {})}
            />
            <AuditLogModal
                user={selectedUserForAuditLog}
                onClose={() => setSelectedUserForAuditLog(null)}
            />
            <TemporaryPasswordDialog
                credential={tempCred}
                onDismiss={() => setTempCred(null)}
            />
        </>
    );
}
