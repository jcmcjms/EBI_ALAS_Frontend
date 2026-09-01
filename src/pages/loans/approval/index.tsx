import { AppShell } from "@/src/components/layout/AppShell";
import { LoanApprovalPage } from "./loan-approval";

export default function LoanApprovalIndex() {
    return (
        <AppShell>
            <LoanApprovalPage />
        </AppShell>
    );
}