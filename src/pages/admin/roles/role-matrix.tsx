import { Fragment, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Badge } from "@/src/components/ui/badge";
import { ShieldCheck, Info } from "@phosphor-icons/react";
import { getErrorMessage } from "@/src/lib/apiClient";
import { useRoleMatrix } from "@/src/hooks/use-roles";

/** Display metadata for each permission (ids mirror backend Permissions.cs). */
const PERMISSION_LABELS: Record<string, string> = {
    "loans.create": "Create / Encode Loan",
    "loans.view": "View Loans",
    "loans.recommend": "Recommend Loan",
    "loans.evaluate": "Evaluate / Credit Check",
    "loans.approve": "Approve Loan",
    "loans.reject": "Reject Loan",
    "user.create": "Create User",
    "user.view": "View Users",
    "user.edit": "Edit User Details",
    "user.suspend": "Suspend / Activate User",
    "role.manage": "Manage Roles & Permissions",
    "role.view": "View Roles & Matrix",
};

/** Groups permissions into display modules by prefix. */
const MODULES: { module: string; ids: string[] }[] = [
    {
        module: "Loan Origination",
        ids: ["loans.view", "loans.create", "loans.recommend", "loans.evaluate", "loans.approve", "loans.reject"],
    },
    {
        module: "User Management",
        ids: ["user.view", "user.create", "user.edit", "user.suspend"],
    },
    {
        module: "Role & Permission Management",
        ids: ["role.view", "role.manage"],
    },
];

/**
 * Read-only view over GET /api/roles/matrix.
 * The role→permission mapping lives in backend code
 * (Common/Constants/RolePermissions.cs) — there is intentionally no save
 * endpoint, so the matrix is displayed rather than edited.
 */
export function RoleMatrix() {
    const { data: matrix, isLoading, error } = useRoleMatrix();

    const permissionSetByRole = useMemo(() => {
        const map = new Map<string, Set<string>>();
        matrix.forEach(entry => map.set(entry.role, new Set(entry.permissions)));
        return map;
    }, [matrix]);

    return (
        <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" weight="bold" />
                    <CardTitle className="text-lg">Role &amp; Permission Matrix</CardTitle>
                    <Badge variant="outline" className="font-normal">{matrix.length} roles</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Info size={14} weight="bold" />
                    Managed by backend configuration — changes require a deployment.
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        Loading role matrix...
                    </div>
                ) : error ? (
                    <div className="flex h-40 items-center justify-center text-sm text-red-600">
                        Failed to load role matrix: {getErrorMessage(error)}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-separate" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                                <col className="w-[280px]" />
                                {matrix.map(entry => (
                                    <col key={entry.role} className="w-[140px]" />
                                ))}
                            </colgroup>
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="h-10 px-4 text-left font-semibold text-muted-foreground sticky left-0 bg-muted/50 z-10 border-r">
                                        Module / Permission
                                    </th>
                                    {matrix.map(entry => (
                                        <th key={entry.role} className="h-10 px-4 text-center font-semibold text-muted-foreground">
                                            <div className="flex flex-col">
                                                <span>{entry.role}</span>
                                                <span className="text-[10px] font-normal text-muted-foreground/80 leading-tight">
                                                    {entry.displayName}
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MODULES.map(({ module, ids }) => {
                                    const applicableIds = ids.filter(id => id in PERMISSION_LABELS);
                                    return (
                                        <Fragment key={module}>
                                            {/* Module Header Row */}
                                            <tr className="border-b bg-muted/20">
                                                <td colSpan={matrix.length + 1} className="px-4 py-2 font-semibold text-foreground sticky left-0 bg-muted/20 z-10 border-r">
                                                    {module}
                                                </td>
                                            </tr>
                                            {/* Permission Rows */}
                                            {applicableIds.map((permId) => (
                                                <tr key={permId} className="border-b hover:bg-muted/10 transition-colors">
                                                    <td className="px-4 py-2 pl-8 text-muted-foreground sticky left-0 bg-background z-10 border-r">
                                                        {PERMISSION_LABELS[permId] ?? permId}
                                                        <span className="ml-2 font-mono text-[10px] text-muted-foreground/60">{permId}</span>
                                                    </td>
                                                    {matrix.map(entry => {
                                                        const granted = permissionSetByRole.get(entry.role)?.has(permId) ?? false;
                                                        return (
                                                            <td key={entry.role} className="px-4 py-2 text-center">
                                                                <div className="flex items-center justify-center">
                                                                    <Checkbox checked={granted} disabled aria-label={`${entry.role}: ${permId}`} />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
