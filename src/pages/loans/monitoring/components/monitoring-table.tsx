import { useState, useMemo } from "react";
import {
    FlexRender,
    createCoreRowModel,
    createColumnHelper,
    coreFeatures,
    tableFeatures,
    rowSortingFeature,
    rowPaginationFeature,
    useTable,
    type PaginationState,
    type SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { CaretUp, CaretDown, CaretUpDown } from "@phosphor-icons/react";
import type { LoanMonitoringRecord, MonitoringFilters } from "../types";
import { loanMonitoringData } from "../data/dummy-data";
import { cn } from "@/src/lib/utils";

// Declare features for this table (v9 API)
const features = tableFeatures({
    ...coreFeatures,
    rowSortingFeature,
    rowPaginationFeature,
    coreRowModel: createCoreRowModel(),
});

const columnHelper = createColumnHelper<typeof features, LoanMonitoringRecord>();

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

    // Filter dummy data based on filters
    const filteredData = useMemo(() => {
        return loanMonitoringData.filter((item) => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    item.formNumber.toLowerCase().includes(searchLower) ||
                    item.customerName.toLowerCase().includes(searchLower) ||
                    item.branchCode.toLowerCase().includes(searchLower) ||
                    item.product.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status.length > 0) {
                if (!filters.status.includes(item.status)) return false;
            }

            // Branch filter
            if (filters.branchCode && filters.branchCode !== "all") {
                if (item.branchCode !== filters.branchCode) return false;
            }

            // Date range filter (simplified - would need proper date parsing in production)
            // Skipping for dummy data

            return true;
        });
    }, [filters]);

    // Apply sorting
    const sortedData = useMemo(() => {
        if (sorting.length === 0) return filteredData;
        const { id, desc } = sorting[0];
        return [...filteredData].sort((a, b) => {
            const aVal = a[id as keyof LoanMonitoringRecord];
            const bVal = b[id as keyof LoanMonitoringRecord];
            if (aVal < bVal) return desc ? 1 : -1;
            if (aVal > bVal) return desc ? -1 : 1;
            return 0;
        });
    }, [filteredData, sorting]);

    // Apply pagination
    const paginatedData = useMemo(() => {
        const start = pagination.pageIndex * pagination.pageSize;
        return sortedData.slice(start, start + pagination.pageSize);
    }, [sortedData, pagination]);

    const columns = columnHelper.columns([
        columnHelper.accessor("formNumber", {
            header: "Form #",
            cell: (info) => <span className="font-mono text-xs font-semibold">{info.getValue()}</span>,
            meta: { className: "sticky left-0 bg-background z-10 border-r" }
        }),
        columnHelper.accessor("branchCode", { header: "Branch", cell: (info) => <span className="text-xs">{info.getValue()}</span> }),
        columnHelper.accessor("customerName", { header: "Customer Name", cell: (info) => <span className="font-medium text-sm">{info.getValue()}</span> }),
        columnHelper.accessor("loanType", { header: "Loan Type", cell: (info) => <Badge variant="outline" className="text-xs font-normal">{info.getValue()}</Badge> }),
        columnHelper.accessor("product", { header: "Product", cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue()}</span> }),
        columnHelper.accessor("loanAmount", {
            header: () => <div className="text-right">Amount</div>,
            cell: (info) => <div className="text-right font-semibold">₱{info.getValue().toLocaleString()}</div>
        }),
        columnHelper.accessor("applicationDate", {
            header: "App. Date",
            cell: (info) => <span className="text-xs text-muted-foreground">{new Date(info.getValue()).toLocaleDateString()}</span>
        }),
        columnHelper.accessor("status", {
            header: "Status",
            cell: (info) => {
                const status = info.getValue();
                const variant = status === "Approved" ? "success" : status === "Rejected" ? "destructive" : "secondary";
                return <Badge variant={variant as any} className="text-xs">{status}</Badge>;
            }
        }),
        columnHelper.accessor("timeLapsedHours", {
            header: "Time Lapsed",
            cell: (info) => <TimeLapsedIndicator hours={info.getValue()} />
        }),
        columnHelper.accessor("lastApprover", { header: "Last Approver", cell: (info) => <span className="text-xs">{info.getValue()}</span> }),
    ]);

    const table = useTable({
        features,
        data: paginatedData,
        columns,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        manualPagination: true,
        manualSorting: true,
        pageCount: Math.ceil(sortedData.length / pagination.pageSize),
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
                                                {FlexRender({header})}
                                                {{ asc: <CaretUp size={14} />, desc: <CaretDown size={14} /> }[header.column.getIsSorted() as string] ?? <CaretUpDown size={14} className="opacity-30" />}
                                            </div>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length > 0 ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => onRowClick(row.original)}
                                >
                                    {row.getAllCells().map((cell) => (
                                        <TableCell key={cell.id} className={cn("py-2 px-4 h-12 text-sm", cell.column.columnDef.meta?.className)}>
                                            {FlexRender({cell})}
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
                    {Math.min((pagination.pageIndex + 1) * pagination.pageSize, sortedData.length)} of{" "}
                    {sortedData.length} entries
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                </div>
            </div>
        </div>
    );
}