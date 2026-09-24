/**
 * Users admin page — thin shell that composes the data table.
 */

import { UsersDataTable } from "../users-data-table";

export function UsersPage() {
    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            <UsersDataTable />
        </div>
    );
}
