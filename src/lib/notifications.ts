// Domain types + seed data for notifications.
// TODO(api): move types into src/lib/api/types.ts and hydrate via
// GET /api/notifications once the .NET endpoint exists.

export type NotificationType = "application" | "action" | "message" | "system";

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    description: string;
    /** ISO timestamp */
    createdAt: string;
    read: boolean;
    /** Person-originated notifications render an avatar instead of a type icon. */
    actor?: string;
    /** Renders Accept/Decline actions until resolved. */
    pendingAction?: "access-request" | "recommendation";
    resolved?: "approved" | "declined";
    /** Route to navigate to when the notification is opened. */
    link?: string;
}

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number) => minutesAgo(n * 60);
const daysAgo = (n: number) => hoursAgo(n * 24);

export function formatRelativeTime(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]!.toUpperCase())
        .join("");
}

export const DUMMY_NOTIFICATIONS: AppNotification[] = [
    {
        id: "ntf-001",
        type: "action",
        title: "Recommendation required",
        description: "LA-2026-08-9942 (Dela Cruz, M.) is awaiting your recommendation.",
        createdAt: minutesAgo(5),
        read: false,
        pendingAction: "recommendation",
        link: "/loans/monitoring",
    },
    {
        id: "ntf-002",
        type: "action",
        title: "Rizalina Garcia",
        description: "Loan Clerk requesting access to the Loan Creation module.",
        createdAt: minutesAgo(30),
        read: false,
        actor: "Rizalina Garcia",
        pendingAction: "access-request",
    },
    {
        id: "ntf-003",
        type: "message",
        title: "Memo from Credit Manager",
        description: "New interest rate matrix effective September 1, 2026.",
        createdAt: hoursAgo(1),
        read: false,
    },
    {
        id: "ntf-004",
        type: "application",
        title: "Application submitted",
        description: "LA-2026-08-9941 submitted for review by AO Santos.",
        createdAt: hoursAgo(3),
        read: false,
        link: "/loans/monitoring",
    },
    {
        id: "ntf-005",
        type: "message",
        title: "You were mentioned",
        description: "AO Santos mentioned you in a comment on LA-2026-08-9936.",
        createdAt: hoursAgo(5),
        read: true,
    },
    {
        id: "ntf-006",
        type: "system",
        title: "Scheduled maintenance",
        description: "Core banking sync window Sunday, 02:00\u201304:00 PHT.",
        createdAt: daysAgo(1),
        read: true,
    },
    {
        id: "ntf-007",
        type: "application",
        title: "Loan released",
        description: "PN-2026-0113 released to CIS 88-40213.",
        createdAt: daysAgo(1),
        read: true,
        link: "/loans/monitoring",
    },
    {
        id: "ntf-008",
        type: "application",
        title: "Verification completed",
        description: "Employment verification confirmed for CIS 77-10290.",
        createdAt: daysAgo(2),
        read: true,
    },
    {
        id: "ntf-009",
        type: "message",
        title: "Document shared",
        description: "E. Davis shared the updated COE template in the Loans workspace.",
        createdAt: daysAgo(2),
        read: true,
    },
    {
        id: "ntf-010",
        type: "application",
        title: "Buy-out recorded",
        description: "Incoming buy-out account recorded for CIS 77-10290 (HDMF).",
        createdAt: daysAgo(3),
        read: true,
    },
    {
        id: "ntf-011",
        type: "system",
        title: "Rate matrix updated",
        description: "Salary loan rates revised per ALCO memo 2026-08-14.",
        createdAt: daysAgo(3),
        read: true,
    },
    {
        id: "ntf-012",
        type: "application",
        title: "Application returned",
        description: "LA-2026-08-9927 returned with deviations for re-submission.",
        createdAt: daysAgo(4),
        read: true,
        link: "/loans/monitoring",
    },
    {
        id: "ntf-013",
        type: "message",
        title: "Weekly digest ready",
        description: "Your branch processed 27 approvals this week.",
        createdAt: daysAgo(5),
        read: true,
    },
    {
        id: "ntf-014",
        type: "system",
        title: "Role updated",
        description: "Your role was granted loan_product.view by the System Administrator.",
        createdAt: daysAgo(6),
        read: true,
    },
];