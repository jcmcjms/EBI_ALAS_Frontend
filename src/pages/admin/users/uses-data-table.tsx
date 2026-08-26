import { useState, useMemo } from "react";
import {
    createColumnHelper,
    useTable,
    tableFeatures,
    columnFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    FlexRender,
    createFilteredRowModel,
    createPaginatedRowModel,
    type ColumnFiltersState,
    type ColumnVisibilityState,
    type PaginationState,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/src/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { MagnifyingGlass, Plus, CaretDown, Pencil, Key, UserCircleMinus, ClockCounterClockwise, Funnel, Export } from "@phosphor-icons/react";
import { dummyUsers, branches, roles, type AdminUser } from "../data/dummy-admin";
import { UserEditDrawer } from "./components/user-edit-drawer";

// Declare features for the table
const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    rowPaginationFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, AdminUser>();

const columns = [
    columnHelper.accessor("fullName", {
        header: "User",
        cell: (info) => {
            const user = info.row.original;
            const initials = user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2);
            return (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs uppercase">
                        {initials}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">{user.fullName}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                </div>
            );
        },
    }),
    columnHelper.accessor("employeeId", {
        header: "Employee ID",
        cell: (info) => <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.accessor("branch", {
        header: "Branch",
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => <Badge variant="secondary" className="font-normal text-xs">{info.getValue()}</Badge>,
    }),
    columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
            const status = info.getValue();
            return (
                <Badge
                    variant={status === "Active" ? "success" : "destructive"}
                    className="font-normal text-xs"
                >
                    {status}
                </Badge>
            );
        },
    }),
    columnHelper.accessor("lastActive", {
        header: "Last Active",
        cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
    }),
    columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0" />
                    }
                >
                    <span className="sr-only">Open menu</span>
                    <CaretDown size={16} weight="bold" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={() => info.table.options.meta?.onEditUser?.(info.row.original)}>
                        <Pencil size={14} className="mr-2" /> Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Key size={14} className="mr-2" /> Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <ClockCounterClockwise size={14} className="mr-2" /> Audit Log
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">
                        <UserCircleMinus size={14} className="mr-2" /> Suspend User
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
    }),
];

export function UsersDataTable() {
    const [globalFilter, setGlobalFilter] = useState("");
    const [branchFilter, setBranchFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    // Filter data by branch and role
    const filteredData = useMemo(() => {
        return dummyUsers.filter(u => {
            const matchBranch = branchFilter === "all" || u.branch === branchFilter;
            const matchRole = roleFilter === "all" || u.role === roleFilter;
            return matchBranch && matchRole;
        });
    }, [branchFilter, roleFilter]);

    const table = useTable({
        features,
        data: filteredData,
        columns,
        state: {
            globalFilter,
            columnFilters,
            columnVisibility,
            pagination,
        },
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        getGlobalFilterFn: "includesString",
        globalFilterFn: "includesString",
        meta: {
            onEditUser: (user: AdminUser) => setSelectedUser(user),
        },
    });

    const totalUsers = dummyUsers.length;
    const activeUsers = dummyUsers.filter(u => u.status === "Active").length;
    const suspendedUsers = dummyUsers.filter(u => u.status === "Suspended").length;

    return (
        <>
            <div className="space-y-4">
                {/* Dense Stats Bar */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="p-3 flex items-center justify-between shadow-none border">
                        <div className="text-sm text-muted-foreground">Total Users</div>
                        <div className="text-xl font-bold">{totalUsers}</div>
                    </Card>
                    <Card className="p-3 flex items-center justify-between shadow-none border">
                        <div className="text-sm text-muted-foreground">Active</div>
                        <div className="text-xl font-bold text-emerald-600">{activeUsers}</div>
                    </Card>
                    <Card className="p-3 flex items-center justify-between shadow-none border">
                        <div className="text-sm text-muted-foreground">Suspended</div>
                        <div className="text-xl font-bold text-red-600">{suspendedUsers}</div>
                    </Card>
                </div>

                <Card className="border shadow-sm">
                    <CardHeader className="pb-3 border-b bg-muted/30">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                User Directory
                                <Badge variant="outline" className="font-normal">{filteredData.length} records</Badge>
                            </CardTitle>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <div className="relative">
                                    <MagnifyingGlass size={16} className="absolute left-2.5 top-2.5 text-muted-foreground" weight="bold" />
                                    <Input
                                        placeholder="Search name, email, ID..."
                                        value={globalFilter ?? ""}
                                        onChange={(e) => setGlobalFilter(e.target.value)}
                                        className="pl-8 h-9 w-full sm:w-[220px] bg-background"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                                        <SelectTrigger className="h-9 w-[140px] bg-background">
                                            <Funnel size={14} className="mr-2 text-muted-foreground" />
                                            <SelectValue placeholder="Branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Branches</SelectItem>
                                            {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                        </SelectContent>
                                    </Select>

                                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                                        <SelectTrigger className="h-9 w-[140px] bg-background">
                                            <Funnel size={14} className="mr-2 text-muted-foreground" />
                                            <SelectValue placeholder="Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Roles</SelectItem>
                                            {roles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-2 sm:ml-auto">
                                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                                        <Export size={14} weight="bold" />
                                        Export
                                    </Button>
                                    <Button size="sm" className="h-9 gap-1.5 text-xs">
                                        <Plus size={14} weight="bold" />
                                        Add User
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
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
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            className="hover:bg-muted/30 transition-colors"
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="py-2 px-4 h-12">
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
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
                        <div>
                            Showing {table.state.pagination.pageIndex * table.state.pagination.pageSize + 1} to{" "}
                            {Math.min((table.state.pagination.pageIndex + 1) * table.state.pagination.pageSize, filteredData.length)} of{" "}
                            {filteredData.length} entries
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
                </Card>
            </div>

            <UserEditDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
        </>
    );
}
