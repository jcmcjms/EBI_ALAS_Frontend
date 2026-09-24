/**
 * Loan Products admin page — thin shell.
 */

import { Database } from "@phosphor-icons/react";
import { AppShell } from "@/src/components/layout/AppShell";
import { ProductsTable } from "../components/products-table";

export function LoanProductsPage() {
    return (
        <AppShell>
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
                        <p className="max-w-3xl text-muted-foreground">
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
        </AppShell>
    );
}
