/**
 * Audit Logs page — thin composition of filters, table, and details sheet.
 */

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select";
import { Spinner } from "@/src/components/ui/spinner";
import {
    ArrowRight,
    MagnifyingGlass,
    ShieldCheck,
    UserCircle,
    WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/src/shared/lib/utils";
import type { AuditLogRecord } from "@/src/lib/api/types";
import { useAuditLogs } from "../hooks/use-audit-logs";
import {
    ACTION_CONFIG,
    DEFAULT_ACTION_CONFIG,
    formatAuditDate,
    SEARCH_DEBOUNCE_MS,
} from "../types";
import { AuditLogDetailsSheet } from "../components/audit-log-details-sheet";

export function AuditLogsPage() {
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [page, setPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

    // Debounce search input.
    const [debouncedSearch, setDebouncedSearch] = useState("");
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [search]);

    const { data, isLoading } = useAuditLogs({
        page,
        pageSize: 20,
        search: debouncedSearch || undefined,
        action: actionFilter === "all" ? undefined : actionFilter,
    });

    const logs = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <ShieldCheck size={28} weight="bold" className="text-primary" />
                        System Audit Log
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Immutable record of all user actions, system events, and data
                        modifications.
                    </p>
                </div>
                <Badge variant="outline" className="gap-1.5 font-normal">
                    <WarningCircle size={14} weight="fill" className="text-amber-500" />
                    Admin Access Only
                </Badge>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <MagnifyingGlass
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            placeholder="Search user, target, or summary..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 h-10"
                        />
                    </div>
                    <Select
                        value={actionFilter}
                        onValueChange={(v) => {
                            setActionFilter(v ?? "all");
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-[200px] h-10">
                            <SelectValue placeholder="Filter by Action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="Create">Create</SelectItem>
                            <SelectItem value="Update">Update</SelectItem>
                            <SelectItem value="StatusChange">Status Change</SelectItem>
                            <SelectItem value="Delete">Delete</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[180px]">Timestamp</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Action</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Summary</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                    <Spinner className="mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    No audit log entries found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log: AuditLogRecord) => {
                                const config =
                                    ACTION_CONFIG[log.action] ?? DEFAULT_ACTION_CONFIG;
                                const ActionIcon = config.icon;
                                return (
                                    <TableRow
                                        key={log.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setSelectedLog(log)}
                                    >
                                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                                            {formatAuditDate(log.timestamp)}
                                        </TableCell>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <UserCircle
                                                size={16}
                                                className="text-muted-foreground"
                                            />
                                            {log.userName}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "gap-1.5 font-normal",
                                                    config.color,
                                                )}
                                            >
                                                <ActionIcon size={14} weight="bold" />
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-xs max-w-[200px] truncate">
                                            {log.entityLabel}
                                        </TableCell>
                                        <TableCell
                                            className="max-w-[300px] truncate text-sm text-muted-foreground"
                                            title={log.summary}
                                        >
                                            {log.summary}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                            >
                                                <ArrowRight size={16} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Pagination */}
            {data && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages} ({data.totalCount} entries)
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page >= totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Details Sheet */}
            <AuditLogDetailsSheet
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </div>
    );
}
