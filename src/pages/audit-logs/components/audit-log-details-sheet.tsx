import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/src/components/ui/sheet";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Clock, Code, Devices, Globe, UserCircle } from "@phosphor-icons/react";
import type { AuditLogRecord } from "@/src/lib/api/types";

interface Props {
    log: AuditLogRecord | null;
    onClose: () => void;
}

function formatJson(jsonStr: string | null): string {
    if (!jsonStr) return "No structural changes recorded.";
    try {
        return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
        return jsonStr;
    }
}

export function AuditLogDetailsSheet({ log, onClose }: Props) {
    if (!log) return null;

    return (
        <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
                <SheetHeader className="p-6 pb-4 border-b sticky top-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                            #{log.id}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                            {log.action}
                        </Badge>
                    </div>
                    <SheetTitle className="text-xl mt-2">
                        {log.summary}
                    </SheetTitle>
                    <SheetDescription className="text-sm">
                        Action performed on{" "}
                        <span className="font-medium text-foreground">
                            {log.entityLabel}
                        </span>
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-200px)] px-6 pb-6">
                    <div className="space-y-6">
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Clock size={12} /> Timestamp
                                </p>
                                <p className="text-sm font-medium">
                                    {new Date(log.timestamp).toLocaleString(
                                        "en-PH",
                                        {
                                            dateStyle: "full",
                                            timeStyle: "short",
                                        }
                                    )}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <UserCircle size={12} /> Actor
                                </p>
                                <p className="text-sm font-medium">
                                    {log.userName}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Globe size={12} /> IP Address
                                </p>
                                <p className="text-sm font-mono">
                                    {log.ipAddress ?? "N/A"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Devices size={12} /> Device / User-Agent
                                </p>
                                <p
                                    className="text-xs font-mono text-muted-foreground truncate"
                                    title={log.userAgent ?? undefined}
                                >
                                    {log.userAgent ?? "N/A"}
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* Entity Info */}
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                                Entity
                            </p>
                            <p className="text-sm font-medium">
                                {log.entityType} / {log.entityId}
                            </p>
                        </div>

                        <Separator />

                        {/* Technical Diff */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Code
                                    size={16}
                                    weight="bold"
                                    className="text-primary"
                                />
                                Technical Changes (JSON Diff)
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Exact state mutation recorded by the system
                                interceptor.
                            </p>
                            <pre className="bg-muted/50 border rounded-md p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                                {formatJson(log.rawChanges)}
                            </pre>
                        </div>
                    </div>
                </ScrollArea>

                <SheetFooter className="p-4 border-t bg-muted/20">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
