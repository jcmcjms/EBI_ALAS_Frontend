import { Database } from "@phosphor-icons/react";

import { ProductsTable } from "./components/products-table";

/**
 * Loan Products admin page.
 *
 * The bank policy table for loan products:
 *   - the `LoanProducts` mirror (`Features/Loans/LoanProduct.cs`) is
 *     populated by the background sync from webloan;
 *   - ops can edit the 8 policy fields (eligibility bounds, fees,
 *     advance interest) per product;
 *   - ops can trigger a manual sync to refresh the catalog without
 *     waiting for the next background tick.
 *
 * No Create / Delete on this surface — both are owned by the
 * webloan-side sync (creation) and the retirement flow (deletion of
 * sorts). The page therefore renders a read-mostly catalog with two
 * write actions: Edit (PUT) and Sync (POST).
 */
export function LoanProductsPage() {
    return (
        <div className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        <Database
                            size={22}
                            weight="bold"
                            className="text-primary"
                        />
                        Loan Products Management
                    </h1>
                    <p className="text-muted-foreground max-w-3xl">
                        Manage the bank&apos;s loan-product policy table —
                        eligibility bounds, fees, and advance interest. The
                        catalog itself is mirrored from webloan; this page
                        only edits ALAS-owned policy fields and triggers
                        manual syncs.
                    </p>
                </div>
            </div>

            <ProductsTable />
        </div>
    );
}
