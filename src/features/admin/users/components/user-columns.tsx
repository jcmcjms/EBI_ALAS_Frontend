/**
 * Users table column definitions.
 */

import { format } from "date-fns";
import {
    columnFilteringFeature,
    columnVisibilityFeature,
    createColumnHelper,
    createFilteredRowModel,
    filterFn_includesString,
    globalFilteringFeature,
    tableFeatures,
} from "@tanstack/react-table";
import {
    CaretDown,
    ClockCounterClockwise,
    Key,
    Pencil,
    ShieldCheck,
    SignOut,
    UserCircleMinus,
    UserCirclePlus,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { BRANCHES, type UserResponse } from "@/src/lib/api/types";
import { cn } from "@/src/lib/utils";

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatFullName(
    user: Pick<UserResponse, "firstName" | "middleName" | "lastName">,
): string {
    return [user.firstName, user.middleName, user.lastName]
        .filter(Boolean)
        .join(" ");
}

function getBranchName(code: string): string {
    return BRANCHES.find((b) => b.code === code)?.name ?? code;
}

// ─── Table meta type ────────────────────────────────────────────────────────

export type UsersTableMeta = {
    onEditUser?: (user: UserResponse) => void;
    onResetPassword?: (user: UserResponse) => void;
    onForcePasswordReset?: (user: UserResponse) => void;
    onRevokeSessions?: (user: UserResponse) => void;
    onViewAuditLog?: (user: UserResponse) => void;
    onToggleStatus?: (user: UserResponse) => void;
};

// ─── Table features config ──────────────────────────────────────────────────

export const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    globalFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
    filterFns: { includesString: filterFn_includesString },
    tableMeta: {} as UsersTableMeta,
});

// ─── Column definitions ─────────────────────────────────────────────────────

const columnHelper = createColumnHelper<typeof features, UserResponse>();

export const columns = columnHelper.columns([
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
                        <span className="font-medium text-foreground text-sm">
                            {formatFullName(user)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            @{user.username}
                        </span>
                    </div>
                </div>
            );
        },
    }),
    columnHelper.accessor("username", {
        header: "Username",
        cell: (info) => (
            <span className="text-xs text-muted-foreground">{info.getValue()}</span>
        ),
    }),
    columnHelper.accessor("branchId", {
        header: "Branch",
        cell: (info) => (
            <span className="text-sm">{getBranchName(info.getValue())}</span>
        ),
    }),
    columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => (
            <Badge variant="secondary" className="font-normal text-xs">
                {info.getValue()}
            </Badge>
        ),
    }),
    columnHelper.display({
        id: "coveredBranches",
        header: "Covered Branches",
        cell: (info) => {
            const user = info.row.original;
            if (!user.coveredBranches || user.coveredBranches.length === 0) {
                return <span className="text-xs text-muted-foreground">—</span>;
            }
            const names = user.coveredBranches
                .map((code) => BRANCHES.find((b) => b.code === code)?.name ?? code)
                .filter(Boolean);
            if (names.length <= 2) {
                return (
                    <div className="flex flex-wrap gap-1">
                        {names.map((name) => (
                            <Badge key={name} variant="outline" className="font-normal text-xs">
                                {name}
                            </Badge>
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
                            : "border-red-600/25 bg-red-500/10 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400",
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
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${user.username}`}
                            />
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
                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => meta?.onToggleStatus?.(user)}
                            >
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
