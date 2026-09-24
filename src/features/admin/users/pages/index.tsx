/**
 * Users admin page — thin shell that wraps the data table in AppShell.
 */

import { AppShell } from "@/src/components/layout/AppShell";
import { UsersDataTable } from "../users-data-table";

export function UsersPage() {
    return (
        <AppShell>
            <div className="flex flex-1 flex-col gap-6 p-6">
                <UsersDataTable />
            </div>
        </AppShell>
    );
}
