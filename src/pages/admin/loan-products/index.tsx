import { AppShell } from "@/src/components/layout/AppShell";
import { LoanProductsPage } from "./loan-products-page";

export function LoanProductsIndex() {
    return (
        <AppShell>
            <LoanProductsPage />
        </AppShell>
    );
}

export default LoanProductsIndex;
