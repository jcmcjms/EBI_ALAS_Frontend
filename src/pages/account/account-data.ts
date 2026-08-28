// Seed data for the account page.
// TODO(api): replace with GET /api/users/me/profile, /api/users/me/activity,
// /api/users/me/sessions once the .NET endpoints exist.

export interface ProfileDetails {
    email: string;
    phone: string | null;
    location: string;
    joinedDate: string;
    emergencyContact: string | null;
    photo: string | null;
}

export const PROFILE_DETAILS: ProfileDetails = {
    email: "m.santos@enterprisebank.ph",
    phone: null,
    location: "Makati Main Branch",
    joinedDate: "2021-03-15",
    emergencyContact: null,
    photo: null,
};

export const ACCOUNT_STATS = [
    { label: "Processed", value: "128" },
    { label: "Pending", value: "14" },
    { label: "Approval", value: "96%" },
] as const;

export type ActivityKind = "application" | "approval" | "security" | "draft" | "login";

export interface ActivityItem {
    id: string;
    kind: ActivityKind;
    title: string;
    description: string;
    createdAt: string;
    badge?: string;
    link?: string;
}

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number) => minutesAgo(n * 60);
const daysAgo = (n: number) => hoursAgo(n * 24);

export const ACTIVITY_ITEMS: ActivityItem[] = [
    {
        id: "act-001",
        kind: "application",
        title: "LA-2026-08-9942 submitted for recommendation",
        description: "Multi-purpose loan, \u20b1150,000.00, 24 months \u2014 routed to the Credit Manager.",
        createdAt: hoursAgo(3),
        badge: "Latest",
        link: "/loans/monitoring",
    },
    {
        id: "act-002",
        kind: "draft",
        title: "Draft saved \u2014 LA-2026-08-9941",
        description: "Client lookup and loan parameters completed; verification pending.",
        createdAt: hoursAgo(5),
    },
    {
        id: "act-003",
        kind: "security",
        title: "Password changed",
        description: "Changed from this device per the 90-day rotation policy.",
        createdAt: daysAgo(2),
    },
    {
        id: "act-004",
        kind: "approval",
        title: "Recommended LA-2026-08-9936",
        description: "Salary loan, \u20b180,000.00 \u2014 DTI 32%, within threshold.",
        createdAt: daysAgo(1),
        link: "/loans/monitoring",
    },
    {
        id: "act-005",
        kind: "login",
        title: "Signed in from branch terminal",
        description: "Makati Main \u2014 Terminal 04, 08:02 PHT.",
        createdAt: daysAgo(3),
    },
    {
        id: "act-006",
        kind: "approval",
        title: "Release confirmed \u2014 PN-2026-0113",
        description: "\u20b1250,000.00 released to CIS 88-40213.",
        createdAt: daysAgo(4),
        link: "/loans/monitoring",
    },
];

export type ApplicationStatus = "released" | "recommended" | "pending" | "returned";

export interface ProcessedApplication {
    id: string;
    client: string;
    status: ApplicationStatus;
    date: string;
    amount: number;
}

export const PROCESSED_APPLICATIONS: ProcessedApplication[] = [
    { id: "LA-2026-08-9942", client: "Dela Cruz, M.", status: "pending", date: "2026-08-27", amount: 150_000 },
    { id: "LA-2026-08-9936", client: "Reyes, A.", status: "recommended", date: "2026-08-26", amount: 80_000 },
    { id: "LA-2026-08-9931", client: "Villanueva, J.", status: "released", date: "2026-08-21", amount: 250_000 },
    { id: "LA-2026-08-9927", client: "Ocampo, R.", status: "returned", date: "2026-08-18", amount: 300_000 },
    { id: "LA-2026-08-9919", client: "Navarro, L.", status: "released", date: "2026-08-12", amount: 120_000 },
    { id: "LA-2026-08-9912", client: "Bautista, C.", status: "released", date: "2026-08-05", amount: 95_000 },
];

export interface RecentClient {
    cisId: string;
    name: string;
    agency: string;
}

export const RECENT_CLIENTS: RecentClient[] = [
    { cisId: "88-40213", name: "Marisol Dela Cruz", agency: "DepEd \u2014 NCR" },
    { cisId: "77-10290", name: "Alfredo Reyes", agency: "PNP \u2014 Makati" },
    { cisId: "91-55207", name: "Jovita Villanueva", agency: "DOH \u2014 General Hospital" },
    { cisId: "84-33118", name: "Ramon Ocampo", agency: "BIR \u2014 South Region" },
];

export interface ActiveSession {
    id: string;
    device: string;
    detail: string;
    lastActive: string;
    current: boolean;
}

export const ACTIVE_SESSIONS: ActiveSession[] = [
    {
        id: "ses-001",
        device: "Windows \u2022 Chrome",
        detail: "Makati Main \u2014 Terminal 04",
        lastActive: new Date().toISOString(),
        current: true,
    },
    {
        id: "ses-002",
        device: "Android \u2022 ALAS Mobile",
        detail: "Makati City (mobile data)",
        lastActive: daysAgo(2),
        current: false,
    },
];

export function formatPhp(amount: number): string {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

/** "loan_product.manage" \u2192 "Loan Product Manage" */
export function permissionLabel(permission: string): string {
    return permission
        .split(/[._]/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}