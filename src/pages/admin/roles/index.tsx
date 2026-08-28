import { AppShell } from "@/src/components/layout/AppShell";
import { RoleMatrix } from "@/src/pages/admin/roles/role-matrix";

export function RolesPage() {
    return (
        <AppShell>
            <div className="flex flex-1 flex-col gap-6 p-6">
                <RoleMatrix />
            </div>
        </AppShell>
    );
}
