/**
 * Audit Logs feature entry point — wraps the page in the app shell.
 */

import { AppShell } from "@/src/components/layout/AppShell";
import { AuditLogsPage } from "./audit-logs-page";

export default function AuditLogsIndex() {
    return (
        <AppShell>
            <AuditLogsPage />
        </AppShell>
    );
}
