import { AppShell } from "@/src/components/layout/AppShell";
import { LoanCreationPage } from "./loan-creation";

export default function LoanCreationIndex() {
    return (
        <AppShell>
            <LoanCreationPage />
        </AppShell>
    );
}
