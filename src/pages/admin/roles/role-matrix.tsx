import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { roles, permissionModules } from "../data/dummy-admin";
import { ShieldCheck, FloppyDisk } from "@phosphor-icons/react";

export function RoleMatrix() {

    const [matrixState, setMatrixState] = useState<Record<string, Set<string>>>(() => {
        const initial: Record<string, Set<string>> = {};
        roles.forEach(r => {
            initial[r.id] = new Set();

            if (r.id === "role_admin") {
                permissionModules.forEach(m => m.permissions.forEach(p => initial[r.id].add(p.id)));
            }

            if (r.id === "role_ao") {
                initial[r.id].add("loan.create");
            }
        });
        return initial;
    });

    const togglePermission = (roleId: string, permId: string) => {
        setMatrixState(prev => {
            const newSet = new Set(prev[roleId]);
            if (newSet.has(permId)) newSet.delete(permId);
            else newSet.add(permId);
            return { ...prev, [roleId]: newSet };
        });
    };

    const toggleModule = (roleId: string, modulePerms: string[], checked: boolean) => {
        setMatrixState(prev => {
            const newSet = new Set(prev[roleId]);
            modulePerms.forEach(p => {
                if (checked) newSet.add(p);
                else newSet.delete(p);
            });
            return { ...prev, [roleId]: newSet };
        });
    };

    const isModuleChecked = (roleId: string, modulePerms: string[]) =>
        modulePerms.every(p => matrixState[roleId]?.has(p));

    const isModuleIndeterminate = (roleId: string, modulePerms: string[]) => {
        const checkedCount = modulePerms.filter(p => matrixState[roleId]?.has(p)).length;
        return checkedCount > 0 && checkedCount < modulePerms.length;
    };

    return (
        <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" weight="bold" />
                    <CardTitle className="text-lg">Role & Permission Matrix</CardTitle>
                </div>
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                    <FloppyDisk size={14} weight="bold" />
                    Save Changes
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                        <tr>
                            <th className="h-10 px-4 text-left font-semibold text-muted-foreground w-[280px] sticky left-0 bg-muted/50 z-10 border-r">
                                Module / Permission
                            </th>
                            {roles.map(role => (
                                <th key={role.id} className="h-10 px-4 text-center font-semibold text-muted-foreground w-[140px]">
                                    {role.name}
                                </th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {permissionModules.map((module) => {
                            const modulePermIds = module.permissions.map(p => p.id);
                            return (
                                <tbody key={module.module}>
                                {/* Module Header Row */}
                                <tr className="border-b bg-muted/20">
                                    <td className="px-4 py-2 font-semibold text-foreground sticky left-0 bg-muted/20 z-10 border-r">
                                        {module.module}
                                    </td>
                                    {roles.map(role => (
                                        <td key={role.id} className="px-4 py-2 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Checkbox
                                                    checked={isModuleChecked(role.id, modulePermIds)}
                                                    onCheckedChange={(checked) => toggleModule(role.id, modulePermIds, !!checked)}
                                                    ref={el => {
                                                        if (el) (el as any).indeterminate = isModuleIndeterminate(role.id, modulePermIds);
                                                    }}
                                                />
                                                <span className="text-xs text-muted-foreground">All</span>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                                {/* Permission Rows */}
                                {module.permissions.map((perm) => (
                                    <tr key={perm.id} className="border-b hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-2 pl-8 text-muted-foreground sticky left-0 bg-background z-10 border-r">
                                            {perm.name}
                                        </td>
                                        {roles.map(role => (
                                            <td key={role.id} className="px-4 py-2 text-center">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox
                                                        checked={matrixState[role.id]?.has(perm.id)}
                                                        onCheckedChange={() => togglePermission(role.id, perm.id)}
                                                    />
                                                </div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                </tbody>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}