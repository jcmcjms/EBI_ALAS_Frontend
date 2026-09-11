import { useEffect, useState } from "react";
import {
    FlexRender,
    createCoreRowModel,
    createColumnHelper,
    coreFeatures,
    metaHelper,
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
import { LOAN_STATUS_META } from "@/src/lib/loan-status";
import { AGING_BADGE_CLASS, assessAging } from "@/src/lib/loan-aging";
import type { LoanStatus } from "@/src/lib/loan-status";

/** Per-column Tailwind classes surfaced through `meta.className`. */
type MonitoringColumnMeta = {
    className?: string;
};

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

// Declare features for this table (v9 API).
// `columnMeta: metaHelper<MonitoringColumnMeta>()` registers the
// `meta.className` field so per-column Tailwind utilities can be
// applied at render time from the column definition.
const features = tableFeatures({
    ...coreFeatures,
    rowSortingFeature,
    rowPaginationFeature,
    columnMeta: metaHelper<MonitoringColumnMeta>(),
    coreRowModel: createCoreRowModel(),
});

const columnHelper = createColumnHelper<typeof features, LoanMonitoringRecord>();

interface MonitoringTableProps {
    filters: MonitoringFilters;
    onRowClick: (record: LoanMonitoringRecord) => void;
    /** Server-fetched SLA policy (hours per stage). Null when the
     *  /sla-policy endpoint is unreachable — the indicator falls back
     *  to built-in defaults from LOAN_STATUS_META. */
    slaPolicy?: Record<string, number> | null;
}

// ─── Time Lapsed indicator (SLA-driven urgency) ─────────────────────────────
//
// Computes elapsed time LIVE from `lastActionDate` (instead of reading the
// server-rounded `timeLapsedHours` snapshot) and re-renders every second
// so the indicator visibly ticks and shows minutes + seconds alongside
// hours. Server `timeLapsedHours` is still on the record for consumers
// that need a stable snapshot (sorting, exports) — this indicator just
// bypasses it for display accuracy.
//
// Urgency = elapsed-since-last-action vs the stage's handling SLA:
//   ok      < 60% of SLA consumed   → green
//   warning 60–99%                  → amber (act soon)
//   breach  ≥ 100%                  → red   (SLA missed)
//   none    terminal / no-SLA stage → neutral
//
// 60% gives the handler a visible heads-up before the breach, not after.
// A red "23h" on an Approved loan was noise — now it's slate.

function formatElapsed(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86_400);
    const remSecondsAfterDays = total % 86_400;
    const hours = Math.floor(remSecondsAfterDays / 3_600);
    const minutes = Math.floor((remSecondsAfterDays % 3_600) / 60);
    const seconds = remSecondsAfterDays % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return days > 0
        ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
        : `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

interface TimeLapsedIndicatorProps {
    lastActionDate: string;
    status: LoanStatus;
    slaPolicy?: Record<string, number> | null;
}

function TimeLapsedIndicator({ lastActionDate, status, slaPolicy }: TimeLapsedIndicatorProps) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const assessment = assessAging(status, lastActionDate, now, slaPolicy);

    return (
        <span
            title={
                assessment.slaHours === null
                    ? "No handling SLA for this stage"
                    : `${assessment.label} — ${assessment.pctOfSla?.toFixed(0)}% consumed`
            }
            aria-label={`Time in stage ${formatElapsed(now - new Date(lastActionDate).getTime())}, ${assessment.label}`}
            className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tabular-nums",
                AGING_BADGE_CLASS[assessment.tier],
            )}
        >
            {formatElapsed(now - new Date(lastActionDate).getTime())}
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

export function MonitoringTable({ filters, onRowClick, slaPolicy }: MonitoringTableProps) {
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
                const meta = LOAN_STATUS_META[status];
                return (
                    <Badge
                        variant="outline"
                        title={meta?.hint}
                        className={cn("text-xs font-normal", meta?.className)}
                    >
                        {meta?.label ?? status}
                    </Badge>
                );
            }
        }),
        columnHelper.accessor("lastActionDate", {
            header: "Time Lapsed",
            cell: (info) => (
                <TimeLapsedIndicator
                    lastActionDate={info.getValue()}
                    status={info.row.original.status}
                    slaPolicy={slaPolicy}
                />
            )
        }),
        columnHelper.accessor("lastActionBy", {
            header: "Last Action By",
            cell: (info) => {
                const verb = info.row.original.lastActionVerb;
                const ACTION_LABELS: Record<string, string> = {
                    Created: "Encoded",
                    StatusChanged: "Status updated",
                    PushedBack: "Pushed back",
                    EvaluatedRecommended: "Recommended",
                    EvaluatedNotRecommended: "Not recommended",
                };
                return (
                    <div className="flex flex-col">
                        <span className="text-xs font-medium">{info.getValue()}</span>
                        {verb && (
                            <span className="text-[10px] text-muted-foreground">
                                {ACTION_LABELS[verb] ?? verb}
                            </span>
                        )}
                    </div>
                );
            },
        }),
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
