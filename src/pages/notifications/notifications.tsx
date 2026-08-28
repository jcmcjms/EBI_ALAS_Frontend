import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    BellSimple,
    CaretDown,
    ChatCircle,
    Check,
    ClipboardText,
    GearSix,
    ListDashes,
    MagnifyingGlass,
    Rows,
    WarningCircle,
    type Icon,
} from "@phosphor-icons/react";

import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent, DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import { formatRelativeTime, initialsOf, type NotificationType } from "@/src/lib/notifications";
import { cn } from "@/src/lib/utils";
import { useNotificationStore } from "@/src/store/notificationStore";

const PAGE_SIZE = 10;

const TYPE_META: Record<NotificationType, { label: string; icon: Icon; iconWrap: string; dot: string }> = {
    application: { label: "Application", icon: ClipboardText, iconWrap: "bg-blue-100 text-blue-600", dot: "bg-blue-500" },
    action: { label: "Action Required", icon: WarningCircle, iconWrap: "bg-amber-100 text-amber-600", dot: "bg-amber-500" },
    message: { label: "Message", icon: ChatCircle, iconWrap: "bg-green-100 text-green-600", dot: "bg-green-500" },
    system: { label: "System", icon: GearSix, iconWrap: "bg-violet-100 text-violet-600", dot: "bg-violet-500" },
};

type StatusFilter = "all" | "unread" | "read";
type TypeFilter = "all" | NotificationType;

interface FilterMenuProps<T extends string> {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}

function FilterMenu<T extends string>({ label, value, options, onChange }: FilterMenuProps<T>) {
    const active = options.find((o) => o.value === value);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="gap-2" />}>
                {value !== "all" && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                {active?.label ?? label}
                <CaretDown size={14} weight="bold" className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-36">
                <DropdownMenuRadioGroup value={value} onValueChange={(v) => v && onChange(v as T)}>
                    {options.map((o) => (
                        <DropdownMenuRadioItem key={o.value} value={o.value}>
                            {o.label}
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function NotificationsPage() {
    const navigate = useNavigate();
    const notifications = useNotificationStore((s) => s.notifications);
    const markRead = useNotificationStore((s) => s.markRead);
    const markAllRead = useNotificationStore((s) => s.markAllRead);
    const resolveNotification = useNotificationStore((s) => s.resolveNotification);

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<StatusFilter>("all");
    const [type, setType] = useState<TypeFilter>("all");
    const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
    const [page, setPage] = useState(1);
    const [prefs, setPrefs] = useState({ emailDigest: true, actionAlerts: true, autoRead: false });

    const unreadCount = notifications.filter((n) => !n.read).length;

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return notifications
            .filter((n) => (status === "all" ? true : status === "unread" ? !n.read : n.read))
            .filter((n) => type === "all" || n.type === type)
            .filter((n) => !q || n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [notifications, query, status, type]);

    useEffect(() => setPage(1), [query, status, type]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const to = Math.min(filtered.length, safePage * PAGE_SIZE);

    const openNotification = (id: string, link?: string) => {
        markRead(id);
        if (link) navigate(link);
    };

    const handleResolve = (id: string, resolution: "approved" | "declined") => {
        resolveNotification(id, resolution);
        if (resolution === "approved") toast.success("Request approved.");
        else toast.info("Request declined.");
        // TODO(api): POST /api/notifications/{id}/resolve with optimistic rollback.
    };

    const clearFilters = () => {
        setQuery("");
        setStatus("all");
        setType("all");
    };

    return (
        <div className="flex flex-1 flex-col bg-muted/40">
            <div className="container mx-auto w-full max-w-5xl flex-1 px-6 py-8">
                {/* Page header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
                            {unreadCount > 0 && (
                                <Badge className="tabular-nums">{unreadCount} unread</Badge>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Stay up to date with loan applications, approvals and system updates.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={markAllRead} disabled={unreadCount === 0} className="gap-2">
                            <Check size={16} weight="bold" />
                            Mark All as Read
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={<Button variant="outline" size="icon" aria-label="Notification preferences" />}
                            >
                                <GearSix size={16} weight="bold" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuCheckboxItem
                                    checked={prefs.emailDigest}
                                    onCheckedChange={(c) => setPrefs((p) => ({ ...p, emailDigest: !!c }))}
                                >
                                    Daily email digest
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={prefs.actionAlerts}
                                    onCheckedChange={(c) => setPrefs((p) => ({ ...p, actionAlerts: !!c }))}
                                >
                                    Alert on action-required items
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                    checked={prefs.autoRead}
                                    onCheckedChange={(c) => setPrefs((p) => ({ ...p, autoRead: !!c }))}
                                >
                                    Mark read when opened
                                </DropdownMenuCheckboxItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div className="relative min-w-0 flex-1 basis-64">
                        <MagnifyingGlass
                            size={16}
                            weight="bold"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search notifications..."
                            aria-label="Search notifications"
                            className="pl-9"
                        />
                    </div>
                    <FilterMenu<StatusFilter>
                        label="Status"
                        value={status}
                        onChange={setStatus}
                        options={[
                            { value: "all", label: "Status" },
                            { value: "unread", label: "Unread" },
                            { value: "read", label: "Read" },
                        ]}
                    />
                    <FilterMenu<TypeFilter>
                        label="Type"
                        value={type}
                        onChange={setType}
                        options={[
                            { value: "all", label: "Type" },
                            { value: "application", label: "Application" },
                            { value: "action", label: "Action Required" },
                            { value: "message", label: "Message" },
                            { value: "system", label: "System" },
                        ]}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setDensity((d) => (d === "comfortable" ? "compact" : "comfortable"))}
                        aria-pressed={density === "compact"}
                        aria-label="Toggle compact density"
                        title={density === "compact" ? "Comfortable density" : "Compact density"}
                    >
                        {density === "compact" ? <Rows size={16} weight="bold" /> : <ListDashes size={16} weight="bold" />}
                    </Button>
                </div>

                {/* List */}
                <Card className="mt-6 overflow-hidden">
                    {pageItems.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <BellSimple size={22} className="text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">No notifications match your filters</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Try adjusting the search or filters.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                Clear filters
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {pageItems.map((n) => {
                                const meta = TYPE_META[n.type];
                                const TypeIcon = meta.icon;
                                return (
                                    <li
                                        key={n.id}
                                        onClick={() => openNotification(n.id, n.link)}
                                        className={cn(
                                            "flex cursor-pointer gap-4 px-5 transition-colors hover:bg-muted/40",
                                            density === "comfortable" ? "py-4" : "py-2.5",
                                            !n.read && "bg-primary/[0.04]"
                                        )}
                                    >
                                        {n.actor ? (
                                            <Avatar className="mt-0.5">
                                                <AvatarFallback>{initialsOf(n.actor)}</AvatarFallback>
                                            </Avatar>
                                        ) : (
                                            <div
                                                className={cn(
                                                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                                    meta.iconWrap
                                                )}
                                            >
                                                <TypeIcon size={16} weight="bold" />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openNotification(n.id, n.link);
                                                    }}
                                                    className={cn(
                                                        "truncate text-left text-sm hover:underline",
                                                        n.read ? "font-medium text-foreground/80" : "font-semibold"
                                                    )}
                                                >
                                                    {n.title}
                                                </button>
                                                {!n.read && (
                                                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                                                )}
                                            </div>
                                            <p className="mt-0.5 truncate text-sm text-muted-foreground">{n.description}</p>

                                            {n.pendingAction && !n.resolved && (
                                                <div className="mt-2 flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleResolve(n.id, "approved");
                                                        }}
                                                    >
                                                        Accept
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleResolve(n.id, "declined");
                                                        }}
                                                    >
                                                        Decline
                                                    </Button>
                                                </div>
                                            )}
                                            {n.resolved && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {n.resolved === "approved" ? "You accepted this request." : "You declined this request."}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 items-center gap-3 self-center sm:gap-4">
                                            <Badge variant="outline" className="hidden gap-1.5 font-normal sm:flex">
                                                <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} aria-hidden />
                                                {meta.label}
                                            </Badge>
                                            <time
                                                dateTime={n.createdAt}
                                                title={new Date(n.createdAt).toLocaleString("en-PH")}
                                                className="w-24 text-right text-xs text-muted-foreground"
                                            >
                                                {formatRelativeTime(n.createdAt)}
                                            </time>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {from} to {to} of {filtered.length} notification{filtered.length === 1 ? "" : "s"}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                            Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}