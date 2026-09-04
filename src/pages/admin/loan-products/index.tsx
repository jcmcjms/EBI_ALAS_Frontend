import { AppShell } from "@/src/components/layout/AppShell";
import { LoanProductsPage as LoanProductsPageBody } from "./loan-products-page";

/**
 * Route entry point. Wraps the body in the shared `AppShell` so the
 * sidebar + site-header chrome are applied consistently with the
 * other admin pages.
 */
export function LoanProductsPage() {
    return (
        <AppShell>
            <LoanProductsPageBody />
        </AppShell>
    );
}
