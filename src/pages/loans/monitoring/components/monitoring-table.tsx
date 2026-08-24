import { useState } from "react";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type PaginationState,
    type SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CaretUp, CaretDown, CaretUpDown } from "@phosphor-icons/react";
import { useLoanMonitoring } from "@/hooks/use-loan-monitoring";
import type { LoanMonitoringRecord, MonitoringFilters } from "../types";
import { cn } from "@/lib/utils";

interface MonitoringTableProps {
    filters: MonitoringFilters;
    onRowClick: (record: LoanMonitoringRecord) => void;
}

// Helper component for Time Lapsed SLA
function TimeLapsedIndicator({ hours }: { hours: number }) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    const label = days > 0 ? `${days}d ${remHours}h` : `${remHours}h`;

    let colorClass = "text-emerald-600 bg-emerald-500/10"; // < 24h
    if (hours >= 48) colorClass = "text-red-600 bg-red-500/10"; // > 48h (SLA Breach)
    else if (hours >= 24) colorClass = "text-amber-600 bg-amber-500/10"; // 24-48h

    return (
        <span className={cn("px-2 py-0.5 rounded-md text-xs font-semibold", colorClass)}>
      {label}
    </span>
    );
}

export function MonitoringTable({ filters, onRowClick }: MonitoringTableProps) {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });
    const [sorting, setSorting] = useState<SortingState>([{ id: "applicationDate", desc: true }]);

    const query = useLoanMonitoring(filters, pagination, sorting);

    const columns: ColumnDef<LoanMonitoringRecord>[] = [
        {
            accessorKey: "formNumber",
            header: "Form #",
            cell: (info) => <span className="font-mono text-xs font-semibold">{info.getValue<string>()}</span>,
            // Sticky first column for horizontal scrolling context
            meta: { className: "sticky left-0 bg-background z-10 border-r" }
        },
        { accessorKey: "branchCode", header: "Branch", cell: (info) => <span className="text-xs">{info.getValue<string>()}</span> },
        { accessorKey: "customerName", header: "Customer Name", cell: (info) => <span className="font-medium text-sm">{info.getValue<string>()}</span> },
        { accessorKey: "clientType", header: "Type", cell: (info) => <Badge variant="outline" className="text-xs font-normal">{info.getValue<string>()}</Badge> },
        { accessorKey: "product", header: "Product", cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue<string>()}</span> },
        {
            accessorKey: "loanAmount",
            header: () => <div className="text-right">Amount</div>,
            cell: (info) => <div className="text-right font-semibold">₱{info.getValue<number>().toLocaleString()}</div>
        },
        {
            accessorKey: "applicationDate",
            header: "App. Date",
            cell: (info) => <span className="text-xs text-muted-foreground">{new Date(info.getValue<string>()).toLocaleDateString()}</span>
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: (info) => {
                const status = info.getValue<string>();
                const variant = status === "Approved" ? "success" : status === "Rejected" ? "destructive" : "secondary";
                return <Badge variant={variant as any} className="text-xs">{status}</Badge>;
            }
        },
        {
            accessorKey: "timeLapsedHours",
            header: "Time Lapsed",
            cell: (info) => <TimeLapsedIndicator hours={info.getValue<number>()} />
        },
        { accessorKey: "lastApprover", header: "Last Approver", cell: (info) => <span className="text-xs">{info.getValue<string>()}</span> },
    ];

    const table = useReactTable({
        data: query.data?.data ?? [],
        columns,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: Math.ceil((query.data?.rowCount ?? 0) / pagination.pageSize),
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
                <Table>
                    <TableHeader className="bg-muted/40 sticky top-0 z-20">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b">
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className={cn("h-10 px-4 text-xs font-semibold text-muted-foreground", header.column.columnDef.meta?.className)}
                                    >
                                        {header.isPlaceholder ? null : (
                                            <div
                                                className={cn("flex items-center gap-1", header.column.getCanSort() && "cursor-pointer select-none")}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {{ asc: <CaretUp size={14} />, desc: <CaretDown size={14} /> }[header.column.getIsSorted() as string] ?? <CaretUpDown size={14} className="opacity-30" />}
                                            </div>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {query.isLoading ? (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">Loading records...</TableCell></TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => onRowClick(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className={cn("py-2 px-4 h-12 text-sm", cell.column.columnDef.meta?.className)}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">No loan applications found matching your criteria.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
                <div>
                    Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
                    {Math.min((pagination.pageIndex + 1) * pagination.pageSize, query.data?.rowCount ?? 0)} of{" "}
                    {query.data?.rowCount ?? 0} entries
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage() || query.isFetching}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage() || query.isFetching}>Next</Button>
                </div>
            </div>
        </div>
    );
}