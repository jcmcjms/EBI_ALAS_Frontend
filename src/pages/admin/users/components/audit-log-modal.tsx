import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Badge } from "@/src/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { format } from "date-fns";
import { useUserAuditLog } from "@/src/hooks/use-users";
import type { UserResponse } from "@/src/lib/api/types";

interface AuditLogModalProps {
    user: UserResponse | null;
    onClose: () => void;
}

export function AuditLogModal({ user, onClose }: AuditLogModalProps) {
    const { data: auditLog, isLoading, isError } = useUserAuditLog(user?.id ?? null);

    return (
        <Sheet open={!!user} onOpenChange={(next) => !next && onClose()}>
            <SheetContent side="right" className="flex flex-col p-0 sm:max-w-[700px]">
                <SheetHeader className="border-b bg-muted/30 p-6">
                    <SheetTitle>
                        Audit Log: {user ? `${user.firstName} ${user.lastName}` : ""}
                    </SheetTitle>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[120px]">Action</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        Loading audit log...
                                    </TableCell>
                                </TableRow>
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-red-600">
                                        Failed to load audit log
                                    </TableCell>
                                </TableRow>
                            ) : auditLog && auditLog.length > 0 ? (
                                auditLog.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal text-xs">
                                                {entry.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <div>{entry.summary}</div>
                                            {entry.ipAddress && (
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    IP: {entry.ipAddress}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        No audit log entries found for this user.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </SheetContent>
        </Sheet>
    );
}
