import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    columnFilteringFeature,
    createColumnHelper,
    createFilteredRowModel,
    createPaginatedRowModel,
    columnVisibilityFeature,
    filterFn_includesString,
    FlexRender,
    globalFilteringFeature,
    rowPaginationFeature,
    tableFeatures,
    useTable,
} from "@tanstack/react-table";
import {
    ArrowsClockwise,
    CaretDown,
    Database,
    MagnifyingGlass,
    Package,
    PencilSimple,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Spinner } from "@/src/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import { cn } from "@/src/lib/utils";
import { getErrorMessage } from "@/src/lib/apiClient";
import {
    PERMISSIONS,
    type LoanProductResponse,
    type UpdateLoanProductPayload,
} from "@/src/lib/api/types";
import { useAuthStore } from "@/src/store/authStore";
import { useLoanProducts } from "@/src/lib/api/loan-products";
import {
    useSyncLoanProducts,
    useUpdateLoanProduct,
} from "@/src/hooks/use-loan-products";
import { ProductEditSheet } from "./product-edit-sheet";
import { ConfirmActionSheet } from "../../users/components/confirm-action-sheet";

/**
 * Loan-product catalog table.
 *
 * ## Backend model
 *
 * This table is the admin-side mirror of the bank policy table. The
 * data flow is:
 *
 *   1. The hosted `LoanProductSyncHostedService` runs every N hours
 *      (`LoanProductSyncService` default 6h) and upserts every row
 *      from `webloan.loan_product` into the ALAS `LoanProducts` table.
 *   2. Ops can trigger a manual sync via the "Sync now" button — same
 *      code path as the background job.
 *   3. Ops can edit the **policy** fields (eligibility bounds, fees,
 *      advance interest) on a synced row via the Edit sheet.
 *
 * The table is intentionally narrow:
 *   - No `Create` action — rows are created by the sync, not by ops.
 *   - No `Delete` action — `MapLoanProductEndpoints` has no
 *     `MapDelete`; retirement is driven by the sync (`IsRetired`).
 *   - No `isActive` toggle — the field that *looks* like a toggle
 *     (`isActive` on the proposed shape) is `isRetired` on the
 *     backend, and it's sync-owned.
 *   - Defaults to **active-only** (`GET /api/loan-products/active`).
 *     An "Include retired" toggle in the header flips to the full
 *     list endpoint so ops can audit historical rows on demand.
 *
 * ## Permission gating
 *
 * The UI mirrors the backend policies on `MapLoanProductEndpoints`:
 *   - `PERMISSIONS.loanProductView`   — required to even see the table
 *     (`RequireAuthorization("CanViewLoanProduct")` on `GET /`).
 *   - `PERMISSIONS.loanProductManage` — required for `PUT /{code}` and
 *     `POST /sync` (`RequireAuthorization("CanManageLoanProduct")`).
 *     The Edit and Sync buttons check this before rendering.
 *
 * Note: there is no backend DELETE so a Delete UI would be decorative
 * at best and confusing at worst — a 405 from a missing endpoint is a
 * poor UX. We omit it entirely.
 */

// ── Table-level meta (imperative handlers from the component down to cells) ──

type ProductsTableMeta = {
    onEditProduct?: (product: LoanProductResponse) => void;
    onSyncNow?: () => void;
};

const features = tableFeatures({
    columnFilteringFeature,
    columnVisibilityFeature,
    globalFilteringFeature,
    rowPaginationFeature,
    filteredRowModel: createFilteredRowModel(),
    paginatedRowModel: createPaginatedRowModel(),
    filterFns: { includesString: filterFn_includesString },
    tableMeta: {} as ProductsTableMeta,
});

const columnHelper = createColumnHelper<typeof features, LoanProductResponse>();

const columns = columnHelper.columns([
    columnHelper.accessor("code", {
        header: "Code",
        cell: (info) => (
            <div className="flex items-center gap-2">
                <Package
                    size={14}
                    weight="bold"
                    className="text-muted-foreground"
                />
                <span className="font-semibold text-sm">
                    {info.getValue()}
                </span>
            </div>
        ),
    }),
    columnHelper.accessor("description", {
        header: "Description",
        cell: (info) => (
            <span className="text-sm text-foreground/80">
                {info.getValue()}
            </span>
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
    columnHelper.accessor("minTermMonths", {
        header: "Term (mo)",
        cell: (info) => {
            const row = info.row.original;
            return (
                <span className="text-xs font-medium tabular-nums">
                    {row.minTermMonths}–{row.maxTermMonths}
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
                    <span>
                        <span className="text-muted-foreground">Notary:</span>{" "}
                        <span className="font-medium">
                            {formatCurrency(row.notarialFee)}
                        </span>
                    </span>
                    <span>
                        <span className="text-muted-foreground">Doc Stamp:</span>{" "}
                        <span className="font-medium">
                            {formatCurrency(row.docStampFee)}
                        </span>
                    </span>
                    <span>
                        <span className="text-muted-foreground">Insurance:</span>{" "}
                        <span className="font-medium">
                            {formatCurrency(row.insuranceFee)}
                        </span>
                    </span>
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
            const row = info.row.original;
            if (row.isRetired) {
                return (
                    <Badge
                        variant="outline"
                        className="border-red-600/25 bg-red-500/10 text-red-700 font-normal text-[10px] dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400"
                    >
                        Retired
                    </Badge>
                );
            }
            return (
                <Badge
                    variant="outline"
                    className="border-emerald-600/25 bg-emerald-500/10 text-emerald-700 font-normal text-[10px] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
                >
                    Active
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
                            <span className="text-[11px] tabular-nums text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50" />
                        }
                    >
                        {display}
                    </TooltipTrigger>
                    <TooltipContent>
                        {Number.isNaN(d.getTime())
                            ? raw
                            : d.toISOString()}
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
                        <DropdownMenuItem
                            onClick={() => meta?.onSyncNow?.()}
                        >
                            <ArrowsClockwise size={14} /> Sync from webloan
                        </DropdownMenuItem>
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

export function ProductsTable() {
    // ── Permission gating (mirrors backend policies) ─────────────
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const canManageProducts = hasPermission(PERMISSIONS.loanProductManage);
    const canViewProducts = hasPermission(PERMISSIONS.loanProductView);

    // ── Data ─────────────────────────────────────────────────────
    // Default to **active-only**. The day-to-day operator task on this
    // page is "configure the products we sell right now" — retired
    // rows are mostly historical context and clutter the table when
    // the bank has cycled through many products. The "Include retired"
    // toggle below flips the hook to `isActive: false`, which routes
    // the request to `GET /api/loan-products` (full list) instead of
    // `/api/loan-products/active`.
    const [showRetired, setShowRetired] = useState(false);
    const { data, isLoading, isError, error, isFetching } = useLoanProducts({
        isActive: !showRetired,
    });
    const products = data ?? [];

    // ── Mutations ────────────────────────────────────────────────
    const updateMutation = useUpdateLoanProduct();
    const syncMutation = useSyncLoanProducts();

    // ── Local UI state ───────────────────────────────────────────
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(
        null
    );

    // The product being edited. We look it up in the cached list so
    // the form opens with up-to-date values without a second
    // roundtrip. (We could `useLoanProduct(code)` for an explicit
    // refetch, but the list is already fresh after every successful
    // mutation — `useUpdateLoanProduct` invalidates the list.)
    const editingProduct = useMemo(
        () =>
            editingCode !== null
                ? products.find((p) => p.code === editingCode) ?? null
                : null,
        [editingCode, products]
    );

    const table = useTable({
        features,
        data: products,
        columns,
        state: {
            globalFilter,
            pagination,
        },
        globalFilterFn: "includesString",
        meta: {
            onEditProduct: (product) => setEditingCode(product.code),
            onSyncNow: () => {
                if (!canManageProducts) {
                    toast.error(
                        "You need the loan_product.manage permission to sync."
                    );
                    return;
                }
                setConfirmAction({
                    title: "Sync from webloan",
                    description:
                        "Pull the latest loan-product catalog from webloan. The sync will add new products, mark retired ones, and preserve your policy edits on existing rows.",
                    actionLabel: "Run Sync",
                    onConfirm: () => {
                        syncMutation.mutate(undefined, {
                            onSuccess: (result) => {
                                toast.success(
                                    `Synced ${result.added + result.updated + result.preserved} products — ` +
                                        `${result.added} added, ${result.updated} updated, ${result.preserved} preserved.`
                                );
                            },
                            onError: (e) => toast.error(getErrorMessage(e)),
                        });
                        setConfirmAction(null);
                    },
                });
            },
        },
    });

    const handleSave = async (
        productCode: string,
        values: UpdateLoanProductPayload
    ): Promise<boolean> => {
        try {
            await updateMutation.mutateAsync({ code: productCode, payload: values });
            toast.success(`Updated policy for "${productCode}".`);
            return true;
        } catch (e) {
            toast.error(getErrorMessage(e));
            return false;
        }
    };

    // ── Permission gate ──────────────────────────────────────────
    if (!canViewProducts) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                    You do not have permission to view loan products.
                </CardContent>
            </Card>
        );
    }

    const pagedRows = table.getRowModel().rows;
    const totalRows = products.length;
    const firstRow = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
    const lastRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows);
    const totalPages = table.getPageCount() || 1;

    return (
        <>
            <div className="space-y-4">
                <Card className="border shadow-sm">
                    <CardHeader className="border-b bg-muted/30 pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Database
                                    size={18}
                                    weight="bold"
                                    className="text-muted-foreground"
                                />
                                Loan Product Catalog
                                <Badge
                                    variant="outline"
                                    className="ml-1 font-normal"
                                >
                                    {totalRows} {totalRows === 1 ? "product" : "products"}
                                </Badge>
                                {isFetching && !isLoading && (
                                    <Spinner className="ml-1 size-3 text-muted-foreground" />
                                )}
                            </CardTitle>

                            <div className="flex items-center gap-2">
                                {/* "Include retired" toggle.
                                 *
                                 * Off (default): fetch only active products
                                 * from `/api/loan-products/active`. This is
                                 * the day-to-day operator view — only the
                                 * products we sell right now.
                                 *
                                 * On: fetch every row from
                                 * `/api/loan-products`, including retired
                                 * ones, so ops can audit historical policy
                                 * (the row's `IsRetired` chip + last-synced
                                 * timestamp stay visible).
                                 *
                                 * The toggle changes the underlying query
                                 * key (`queryKeys.loanProducts.list(...)`),
                                 * so flipping it swaps the request — not just
                                 * a client-side filter. The same row won't
                                 * appear in both lists. */}
                                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                                    <Checkbox
                                        id="show-retired"
                                        checked={showRetired}
                                        onCheckedChange={(checked) => {
                                            setShowRetired(checked === true);
                                            // Reset pagination — the
                                            // active set and the full
                                            // set have different sizes.
                                            setPagination((p) => ({
                                                ...p,
                                                pageIndex: 0,
                                            }));
                                        }}
                                        aria-label="Include retired products"
                                    />
                                    <Label
                                        htmlFor="show-retired"
                                        className="cursor-pointer text-xs font-normal text-muted-foreground"
                                    >
                                        Include retired
                                    </Label>
                                </div>

                                <div className="relative">
                                    <MagnifyingGlass
                                        size={16}
                                        weight="bold"
                                        className="absolute top-2.5 left-2.5 text-muted-foreground pointer-events-none"
                                    />
                                    <Input
                                        placeholder="Search code or description…"
                                        value={globalFilter}
                                        onChange={(e) => {
                                            setGlobalFilter(e.target.value);
                                            // Reset to first page so the
                                            // user actually sees the
                                            // search results.
                                            setPagination((p) => ({
                                                ...p,
                                                pageIndex: 0,
                                            }));
                                        }}
                                        className="h-9 w-full bg-background pl-8 sm:w-[260px]"
                                    />
                                </div>
                                {canManageProducts && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-1.5"
                                        onClick={() =>
                                            table.options.meta?.onSyncNow?.()
                                        }
                                        disabled={syncMutation.isPending}
                                    >
                                        {syncMutation.isPending ? (
                                            <Spinner className="size-3" />
                                        ) : (
                                            <ArrowsClockwise
                                                size={14}
                                                weight="bold"
                                            />
                                        )}
                                        Sync now
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow
                                        key={headerGroup.id}
                                        className="border-b hover:bg-transparent"
                                    >
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                className="h-9 px-4 text-xs font-semibold text-muted-foreground"
                                            >
                                                {header.isPlaceholder ? null : (
                                                    <FlexRender
                                                        header={header}
                                                    />
                                                )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            <div className="inline-flex items-center gap-2">
                                                <Spinner className="size-3" />
                                                Loading loan products…
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center text-red-600"
                                        >
                                            Failed to load products:{" "}
                                            {getErrorMessage(error)}
                                        </TableCell>
                                    </TableRow>
                                ) : pagedRows.length ? (
                                    pagedRows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            className={cn(
                                                "transition-colors hover:bg-muted/30",
                                                row.original.isRetired &&
                                                    "opacity-70"
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className="h-14 px-4 py-2 align-middle"
                                                >
                                                    <FlexRender cell={cell} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell
                                            colSpan={columns.length}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            {globalFilter
                                                ? "No products match your search."
                                                : showRetired
                                                  ? "No loan products have been synced yet. Run a sync to pull them from webloan."
                                                  : "No active loan products. Enable “Include retired” to see the full catalog, or run a sync."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>

                    <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
                        <div>
                            Showing {firstRow}–{lastRow} of {totalRows}{" "}
                            {totalRows === 1 ? "entry" : "entries"}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() =>
                                    setPagination((p) => ({
                                        ...p,
                                        pageIndex: Math.max(0, p.pageIndex - 1),
                                    }))
                                }
                                disabled={!table.getCanPreviousPage()}
                            >
                                Previous
                            </Button>
                            <span>
                                Page {pagination.pageIndex + 1} of{" "}
                                {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() =>
                                    setPagination((p) => ({
                                        ...p,
                                        pageIndex: p.pageIndex + 1,
                                    }))
                                }
                                disabled={!table.getCanNextPage()}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            <ProductEditSheet
                product={editingProduct}
                canEdit={canManageProducts}
                onClose={() => setEditingCode(null)}
                onSave={handleSave}
                isSaving={updateMutation.isPending}
            />

            <ConfirmActionSheet
                open={confirmAction !== null}
                onClose={() => setConfirmAction(null)}
                title={confirmAction?.title ?? ""}
                description={confirmAction?.description ?? ""}
                actionLabel={confirmAction?.actionLabel ?? ""}
                destructive={confirmAction?.destructive}
                onConfirm={confirmAction?.onConfirm ?? (() => {})}
            />
        </>
    );
}

// ── Local helpers ─────────────────────────────────────────────────────

function formatCurrency(value: number): string {
    if (!Number.isFinite(value)) return "₱0.00";
    return `₱${value.toLocaleString("en-PH", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}
