/**
 * Loan Products table — thin composition of columns, toolbar, and table UI.
 *
 * This file owns:
 * - Permission gating
 * - Data fetching (useLoanProducts)
 * - Local UI state (filter, pagination, editing, confirm)
 * - Composition of sub-components
 *
 * Column definitions live in `product-columns.tsx`.
 * Toolbar lives in `products-toolbar.tsx`.
 */

import { useMemo, useState } from "react";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { FlexRender, useTable } from "@tanstack/react-table";
import { Database } from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/src/components/ui/card";
import { Spinner } from "@/src/components/ui/spinner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";
import { cn } from "@/src/shared/lib/utils";
import { getErrorMessage } from "@/src/lib/apiClient";
import {
    PERMISSIONS,
    type UpdateLoanProductPayload,
} from "@/src/lib/api/types";
import { useAuthStore } from "@/src/store/authStore";
import {
    useLoanProducts,
    useSyncLoanProducts,
    useUpdateLoanProduct,
} from "../hooks/use-loan-products";
import { features, columns } from "./product-columns";
import { ProductsToolbar } from "./products-toolbar";
import { ProductEditSheet } from "./product-edit-sheet";
import { ImportProductsSheet } from "./import-products-sheet";
import { ConfirmActionSheet } from "../../users/components/confirm-action-sheet";

interface ConfirmActionState {
    title: string;
    description: string;
    actionLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
}

export function ProductsTable() {
    // ── Permissions ───────────────────────────────────────────────
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const canManageProducts = hasPermission(PERMISSIONS.loanProductManage);
    const canViewProducts = hasPermission(PERMISSIONS.loanProductView);

    // ── Data ─────────────────────────────────────────────────────
    const [showRetired, setShowRetired] = useState(false);
    const { data, isLoading, isError, error, isFetching } = useLoanProducts();
    const products = useMemo(
        () =>
            showRetired ? (data ?? []) : (data ?? []).filter((p) => !p.isRetired),
        [data, showRetired],
    );

    // ── Mutations ────────────────────────────────────────────────
    const updateMutation = useUpdateLoanProduct();
    const syncMutation = useSyncLoanProducts();

    // ── Local UI state ───────────────────────────────────────────
    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
    const [isImportSheetOpen, setIsImportSheetOpen] = useState(false);

    const editingProduct = useMemo(
        () =>
            editingCode !== null
                ? products.find((p) => p.code === editingCode) ?? null
                : null,
        [editingCode, products],
    );

    // ── Table instance ───────────────────────────────────────────
    const table = useTable({
        features,
        data: products,
        columns,
        state: { globalFilter, pagination },
        globalFilterFn: "includesString",
        meta: {
            onEditProduct: (product) => setEditingCode(product.code),
            onSyncNow: () => {
                if (!canManageProducts) {
                    toastError("You need the loan_product.manage permission to sync.");
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
                                toastSuccess(
                                    `Synced ${result.added + result.updated + result.preserved} products — ` +
                                        `${result.added} added, ${result.updated} updated, ${result.preserved} preserved.`,
                                );
                            },
                            onError: (e) => toastError(getErrorMessage(e)),
                        });
                        setConfirmAction(null);
                    },
                });
            },
        },
    });

    // ── Handlers ─────────────────────────────────────────────────
    const handleSave = async (
        productCode: string,
        values: UpdateLoanProductPayload,
    ): Promise<boolean> => {
        try {
            await updateMutation.mutateAsync({ code: productCode, payload: values });
            toastSuccess(`Updated policy for "${productCode}".`);
            return true;
        } catch (e) {
            toastError(getErrorMessage(e));
            return false;
        }
    };

    const handleGlobalFilterChange = (value: string) => {
        setGlobalFilter(value);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    const handleShowRetiredChange = (value: boolean) => {
        setShowRetired(value);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
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

    // ── Derived values ───────────────────────────────────────────
    const pagedRows = table.getRowModel().rows;
    const totalRows = products.length;
    const firstRow = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
    const lastRow = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows);
    const totalPages = table.getPageCount() || 1;

    // ── Render ───────────────────────────────────────────────────
    return (
        <>
            <div className="space-y-4">
                <Card className="border shadow-sm">
                    <CardHeader className="border-b bg-muted/30 pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Database size={18} weight="bold" className="text-muted-foreground" />
                                Loan Product Catalog
                                <Badge variant="outline" className="ml-1 font-normal">
                                    {totalRows} {totalRows === 1 ? "product" : "products"}
                                </Badge>
                                {isFetching && !isLoading && (
                                    <Spinner className="ml-1 size-3 text-muted-foreground" />
                                )}
                            </CardTitle>

                            <ProductsToolbar
                                globalFilter={globalFilter}
                                onGlobalFilterChange={handleGlobalFilterChange}
                                showRetired={showRetired}
                                onShowRetiredChange={handleShowRetiredChange}
                                canManageProducts={canManageProducts}
                                isSyncing={syncMutation.isPending}
                                onSyncNow={() => table.options.meta?.onSyncNow?.()}
                                onImport={() => setIsImportSheetOpen(true)}
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
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                            <div className="inline-flex items-center gap-2">
                                                <Spinner className="size-3" />
                                                Loading loan products…
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : isError ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-red-600">
                                            Failed to load products: {getErrorMessage(error)}
                                        </TableCell>
                                    </TableRow>
                                ) : pagedRows.length ? (
                                    pagedRows.map((row) => (
                                        <TableRow
                                            key={row.id}
                                            onClick={() => table.options.meta?.onEditProduct?.(row.original)}
                                            className={cn(
                                                "cursor-pointer transition-colors hover:bg-muted/30",
                                                row.original.isRetired && "opacity-70",
                                            )}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="h-14 px-4 py-2 align-middle">
                                                    <FlexRender cell={cell} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                            {globalFilter
                                                ? "No products match your search."
                                                : showRetired
                                                  ? "No loan products have been synced yet. Run a sync to pull them from webloan."
                                                  : 'No active loan products. Enable "Include retired" to see the full catalog, or run a sync.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
                        <div>
                            Showing {firstRow}–{lastRow} of {totalRows}{" "}
                            {totalRows === 1 ? "entry" : "entries"}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                                disabled={!table.getCanPreviousPage()}
                            >
                                Previous
                            </Button>
                            <span>
                                Page {pagination.pageIndex + 1} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="xs"
                                onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
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
            <ImportProductsSheet
                open={isImportSheetOpen}
                onClose={() => setIsImportSheetOpen(false)}
            />
        </>
    );
}
