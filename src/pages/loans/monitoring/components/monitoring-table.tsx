import { useState } from "react";
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
import { CaretUp, CaretDown, CaretUpDown, WarningCircle, ArrowClockwise } from "@phosphor-icons/react";
import type { LoanMonitoringRecord, MonitoringFilters } from "../types";
import { useLoanMonitoring } from "@/src/hooks/use-loan-monitoring";
import { BRANCHES } from "@/src/lib/api/types";
import { cn } from "@/src/lib/utils";

/**
 * Resolve a branch code (e.g. "011") to its human-readable name
 * (e.g. "Head Office Branch") using the static `BRANCHES` directory.
 *
 * The monitoring record carries `branchCode` as the canonical wire value —
 * the table sends it back to `GET /api/loans?branchCode=…` for filtering
 * and the server sorts on it. We only swap in the name for the rendered
 * cell; the underlying field stays the code so filter / sort / API
 * contracts remain untouched.
 *
 * Falls back to the raw code when:
 *   - the value is the sentinel `"—"` (no branch on the loan),
 *   - the code is not present in the static directory (e.g. a new branch
 *     added server-side that hasn't been mirrored yet — same fallback
 *     behaviour as `dashboard.tsx` and `cis-lookup.tsx`).
 */
function resolveBranchName(code: string): string {
    if (!code || code === "—") return code || "—";
    return BRANCHES.find((b) => b.code === code)?.name ?? code;
}

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

/**
 * Skeleton row used while the first page is loading (no `keepPreviousData`
 * cache yet). Matches the column count so the layout doesn't jump when
 * the real rows arrive.
 */
function SkeletonRow({ colSpan }: { colSpan: number }) {
    return (
        <TableRow className="border-b">
            <TableCell colSpan={colSpan} className="py-2 px-4 h-12">
                <div className="h-3 w-full max-w-[180px] rounded bg-muted animate-pulse" />
            </TableCell>
        </TableRow>
    );
}

export function MonitoringTable({ filters, onRowClick }: MonitoringTableProps) {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 });
    const [sorting, setSorting] = useState<SortingState>([{ id: "applicationDate", desc: true }]);

    // Server is the single source of truth for filter / sort / paginate.
    // The hook returns the already-mapped page of records plus the total
    // row count so react-table can drive its pagination footer.
    //
    // `keepPreviousData` (set inside the hook) keeps the previous page
    // visible during a refetch so pagination/sort doesn't flash an empty
    // state — first load still shows the skeleton below.
    const {
        data: pageData = [],
        rowCount = 0,
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    } = useLoanMonitoring(filters, pagination, sorting);

    const columns = columnHelper.columns([
        columnHelper.accessor("formNumber", {
            header: "LAM ID",
            cell: (info) => <span className="text-xs font-semibold">{info.getValue()}</span>,
            meta: { className: "sticky left-0 bg-background z-10 border-r" }
        }),
        columnHelper.accessor("branchCode", {
            header: "Branch",
            // Display the resolved branch name (e.g. "Head Office Branch")
            // rather than the raw code (e.g. "011"). The accessor value is
            // still the code, so default sort still orders by code — swap
            // to `sortingFn` keyed on the name if alphabetical-by-name
            // sorting is needed later.
            cell: (info) => <span className="text-xs">{resolveBranchName(info.getValue())}</span>,
        }),
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

    // Server-driven pagination: react-table just renders pageCount and
    // triggers `setPagination` on prev/next clicks — the actual page
    // fetch happens inside the hook when `pagination` changes.
    const pageCount = Math.max(1, Math.ceil(rowCount / pagination.pageSize));

    const table = useTable({
        features,
        data: pageData,
        columns,
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        manualPagination: true,
        manualSorting: true,
        pageCount,
    });

    // ── Render states ────────────────────────────────────────────────────
    //
    // Three distinct empty-body cases:
    //
    //   (a) `isLoading && !data` — first page ever, no keepPreviousData
    //       cache yet → show skeleton rows so the layout doesn't jump.
    //
    //   (b) `isError` — the GET /api/loans call failed. Surface a
    //       retryable error banner instead of an empty table.
    //
    //   (c) `pageData.length === 0` — server returned zero rows for
    //       the current filter. Show a contextual empty state with a
    //       hint to clear filters.
    const showSkeleton = isLoading && pageData.length === 0;
    const showError = isError;
    const showEmpty = !showSkeleton && !showError && pageData.length === 0;

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Refetch banner — subtle indicator that a background refresh
                is in flight (e.g. after returning from another page). */}
            {isFetching && !isLoading && (
                <div className="px-4 py-1 text-[11px] text-muted-foreground bg-muted/40 border-b">
                    Refreshing…
                </div>
            )}

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
                        {showSkeleton ? (
                            // 8 skeleton rows is enough to fill the visible
                            // viewport on a 1080p screen at the default
                            // 15-row pageSize — more would just churn DOM.
                            Array.from({ length: 8 }).map((_, i) => (
                                <SkeletonRow key={i} colSpan={columns.length} />
                            ))
                        ) : showError ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center">
                                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                                        <WarningCircle size={28} weight="bold" className="text-destructive" />
                                        <div>
                                            Failed to load loan applications.
                                            <div className="text-xs mt-0.5">
                                                {error instanceof Error ? error.message : "Unknown error."}
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => refetch()}
                                            className="gap-1.5 mt-1"
                                        >
                                            <ArrowClockwise size={14} weight="bold" /> Retry
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : showEmpty ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                                    No loan applications match the current filters.
                                </TableCell>
                            </TableRow>
                        ) : (
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
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Footer — driven entirely by server rowCount, so
                the "X to Y of N" labels reflect the backend's filtered
                total, not the page slice. */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10 text-xs text-muted-foreground">
                <div>
                    {rowCount === 0 ? (
                        "0 entries"
                    ) : (
                        <>
                            Showing {pagination.pageIndex * pagination.pageSize + 1} to{" "}
                            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, rowCount)} of{" "}
                            {rowCount} {rowCount === 1 ? "entry" : "entries"}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                </div>
            </div>
        </div>
    );
}
