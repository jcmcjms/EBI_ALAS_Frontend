/**
 * Loan Products table column definitions.
 *
 * Extracted from ProductsTable for single-responsibility:
 * this file owns "what columns exist and how they render".
 */

import { format } from "date-fns";
import {
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    columnVisibilityFeature,
    filterFn_includesString,
    globalFilteringFeature,
    rowPaginationFeature,
    tableFeatures,
} from "@tanstack/react-table";
import {
    ArrowsClockwise,
    CaretDown,
    Package,
    PencilSimple,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import type { LoanProductResponse } from "@/src/lib/api/types";

// ─── Table meta type ────────────────────────────────────────────────────────

export type ProductsTableMeta = {
    onEditProduct?: (product: LoanProductResponse) => void;
    onSyncNow?: () => void;
};

// ─── Table features config ──────────────────────────────────────────────────

export const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    globalFilteringFeature,
    rowPaginationFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns: { includesString: filterFn_includesString },
    tableMeta: {} as ProductsTableMeta,
});

// ─── Column definitions ─────────────────────────────────────────────────────

const columnHelper = createColumnHelper<typeof features, LoanProductResponse>();

export const columns = columnHelper.columns([
    columnHelper.accessor("code", {
        header: "Code",
        cell: (info) => (
            <div className="flex items-center gap-2">
                <Package size={14} weight="bold" className="text-muted-foreground" />
                <span className="font-semibold text-sm">{info.getValue()}</span>
            </div>
        ),
    }),
    columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
            <span className="text-sm text-foreground/80">{info.getValue()}</span>
        ),
    }),
    columnHelper.accessor("minAmount", {
        header: "Principal Range",
        cell: (info) => {
            const row = info.row.original;
            return (
                <span className="text-xs font-medium tabular-nums whitespace-nowrap">
                    {formatCurrency(row.minAmount)} – {formatCurrency(row.maxAmount)}
                </span>
            );
        },
    }),
    columnHelper.accessor("minTermDays", {
        header: "Term (days)",
        cell: (info) => {
            const row = info.row.original;
            return (
                <span className="text-xs font-medium tabular-nums">
                    {row.minTermDays}–{row.maxTermDays}
                </span>
            );
        },
    }),
    columnHelper.accessor("notarialFee", {
        header: "Fees (₱)",
        cell: (info) => {
            const row = info.row.original;
            return (
                <div className="flex flex-col gap-0.5 text-[11px] tabular-nums">
                    <FeeRow label="Notary" value={row.notarialFee} />
                    <FeeRow label="Doc Stamp" value={row.docStampFee} />
                    <FeeRow label="Insurance" value={row.insuranceFee} />
                </div>
            );
        },
    }),
    columnHelper.accessor("advanceInterestRate", {
        header: "Rate",
        cell: (info) => (
            <span className="text-xs font-medium tabular-nums">
                {(info.getValue() * 100).toFixed(2)}% p.a.
            </span>
        ),
    }),
    columnHelper.accessor("isRetired", {
        header: "Status",
        cell: (info) => {
            const isRetired = info.getValue();
            return (
                <Badge
                    variant="outline"
                    className={
                        isRetired
                            ? "border-red-600/25 bg-red-500/10 text-red-700 font-normal text-[10px] dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400"
                            : "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 font-normal text-[10px] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                    }
                >
                    {isRetired ? "Retired" : "Active"}
                </Badge>
            );
        },
    }),
    columnHelper.accessor("lastSyncedAt", {
        header: "Last Synced",
        cell: (info) => {
            const raw = info.getValue();
            const d = new Date(raw);
            const display = Number.isNaN(d.getTime())
                ? raw
                : format(d, "MMM d, yyyy h:mm a");
            return (
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <span className="cursor-help border-b border-dotted border-muted-foreground/50 text-[11px] tabular-nums text-muted-foreground" />
                        }
                    >
                        {display}
                    </TooltipTrigger>
                    <TooltipContent>
                        {Number.isNaN(d.getTime()) ? raw : d.toISOString()}
                    </TooltipContent>
                </Tooltip>
            );
        },
    }),
    columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => {
            const product = info.row.original;
            const meta = info.table.options.meta;
            return (
                <span
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
                    }}
                >
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label={`Actions for ${product.code}`}
                                />
                            }
                        >
                            <CaretDown size={16} weight="bold" />
                            <span className="sr-only">Open menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                            <DropdownMenuItem
                                onClick={() => meta?.onEditProduct?.(product)}
                            >
                                <PencilSimple size={14} /> Edit Policy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => meta?.onSyncNow?.()}>
                                <ArrowsClockwise size={14} /> Sync from webloan
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </span>
            );
        },
    }),
]);

// ─── Cell helpers ───────────────────────────────────────────────────────────

function FeeRow({ label, value }: { label: string; value: number }) {
    return (
        <span>
            <span className="text-muted-foreground">{label}:</span>{" "}
            <span className="font-medium">{formatCurrency(value)}</span>
        </span>
    );
}

export function formatCurrency(value: number): string {
    if (!Number.isFinite(value)) return "₱0.00";
    return `₱${value.toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}
