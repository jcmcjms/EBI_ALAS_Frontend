import { AppShell } from "@/src/components/layout/AppShell";
import { AuditLogsPage } from "./audit-logs-page";

export default function AuditLogsIndex() {
    return (
        <AppShell>
            <AuditLogsPage />
        </AppShell>
    );
}
