/**
 * Activity timeline — renders a list of timeline items with icons and timestamps.
 *
 * Pure presentation component. Data transformation (`toTimelineItems`) is
 * exported separately so callers can transform before rendering.
 */

import {
    CheckCircle,
    ClipboardText,
    Clock,
    FloppyDisk,
    LockSimple,
    SignIn,
} from "@phosphor-icons/react";
import type { Activity } from "../api/account";
import { formatRelativeTime } from "@/src/features/notifications/types";
import type { ActivityKind } from "../types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TimelineItem {
    id: string;
    kind: ActivityKind;
    title: string;
    description: string;
    createdAt: string;
}

// ─── Icon map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<ActivityKind, typeof Clock> = {
    application: ClipboardText,
    approval: CheckCircle,
    security: LockSimple,
    draft: FloppyDisk,
    login: SignIn,
};

// ─── Transformation ─────────────────────────────────────────────────────────

/**
 * Bucket the backend's free-form `Action` strings into the five UI kinds.
 * Exported so both OverviewTab (preview) and ActivityTab (full list) share
 * the same mapping logic.
 */
export function toTimelineItems(records: Activity[]): TimelineItem[] {
    return records.map((a) => {
        const action = (a.action ?? "").toLowerCase();

        let kind: ActivityKind = "application";
        if (
            action.includes("password") ||
            action.includes("login") ||
            action.includes("sign")
        ) {
            kind = action.includes("password") ? "security" : "login";
        } else if (action.includes("draft") || action.includes("saved")) {
            kind = "draft";
        } else if (
            action.includes("recommend") ||
            action.includes("approv") ||
            action.includes("release")
        ) {
            kind = "approval";
        }

        const fromTo = [a.fromStatus, a.toStatus].filter(Boolean).join(" → ");
        const description =
            [
                a.comments,
                a.loanClientName ? `Client: ${a.loanClientName}` : null,
                fromTo || null,
            ]
                .filter(Boolean)
                .join(" • ") || a.action;

        return {
            id: String(a.id),
            kind,
            title: `${a.lamId} — ${a.action}`,
            description,
            createdAt: a.actionDate,
        };
    });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
    return (
        <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border">
            {items.map((item) => {
                const KindIcon = ICON_MAP[item.kind];
                return (
                    <li key={item.id} className="relative flex gap-4">
                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
                            <KindIcon size={14} weight="bold" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">{item.title}</p>
                            <p
                                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"
                                title={new Date(item.createdAt).toLocaleString()}
                            >
                                <Clock size={12} weight="bold" />
                                {formatRelativeTime(item.createdAt)}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {item.description}
                            </p>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
