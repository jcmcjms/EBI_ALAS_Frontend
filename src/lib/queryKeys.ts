/**
 * Canonical TanStack Query key factory.
 *
 * Why centralize keys:
 *  - One place to grep for "what queries do we have?"
 *  - Keys are typed tuples (not bare strings), so invalidation is
 *    structurally safe (`queryKeys.users.all` vs ad-hoc strings).
 *  - Invalidation is partial-match safe: invalidating `users.all` covers
 *    `users.list(...)`, `users.detail(id)`, and `users.stats.*` in one call.
 *
 * Conventions:
 *  - `all` = the broadest prefix for invalidation.
 *  - `list(filters)` and `detail(id)` = concrete leaf keys.
 *  - Add new domains here when introducing a new reference dataset.
 */
export const queryKeys = {
    // ── Reference data (rarely changes) ──────────────────────────────────────
    branches: {
        all: ["branches"] as const,
        list: (params: { isActive?: boolean; search?: string } = {}) =>
            ["branches", "list", params] as const,
        detail: (id: number) => ["branches", "detail", id] as const,
    },
    loanStatuses: {
        all: ["loan-statuses"] as const,
        list: () => ["loan-statuses", "list"] as const,
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    me: ["auth", "me"] as const,

    // ── Roles ───────────────────────────────────────────────────────────────
    roles: {
        all: ["roles"] as const,
    },

    // ── Users (transactional) ───────────────────────────────────────────────
    users: {
        all: ["users"] as const,
        // Generic params: accept any structurally-shaped query filter object.
        // The list hook (`useUsers`) passes `UserQueryParams`; we accept the
        // shape at the key layer so it stays decoupled from the type module.
        list: <T extends object>(params: T) => ["users", "list", params] as const,
        detail: (id: number) => ["users", "detail", id] as const,
        stats: () => ["users", "stats"] as const,
    },

    // ── Loans (transactional — always fresh by default) ─────────────────────
    loans: {
        monitoring: <F, P, S>(filters: F, pagination: P, sorting: S) =>
            ["loans", "monitoring", filters, pagination, sorting] as const,
    },

    // ── WebLoans (CIS lookup / outstanding / pending) ──────────────────────
    webLoans: {
        cis: (cisNo: string) => ["webloans", "cis", cisNo] as const,
        activeLoans: (cisNo: string, accountNo: string) =>
            ["webloans", "active-loans", cisNo, accountNo] as const,
        outstandingLoans: (cisNo: string, accountNo: string) =>
            ["webloans", "outstanding-loans", cisNo, accountNo] as const,
        pendingLoan: (cisNo: string, accountNo: string) =>
            ["webloans", "pending-loan", cisNo, accountNo] as const,
    },

    // ── Dashboard ───────────────────────────────────────────────────────────
    dashboard: {
        summary: ["dashboard", "summary"] as const,
        full: ["dashboard"] as const,
    },

    // ── Audit Logs ─────────────────────────────────────────────────────────
    auditLogs: {
        all: ["auditLogs"] as const,
        list: <T extends object>(params: T) =>
            ["auditLogs", "list", params] as const,
        detail: (id: number) => ["auditLogs", "detail", id] as const,
    },

    // ── Account ─────────────────────────────────────────────────────────────
    account: {
        profile: ["account-profile"] as const,
        sessions: (page: number, pageSize: number) =>
            ["account-sessions", page, pageSize] as const,
        activity: (limit: number) => ["account-activity", limit] as const,
        loans: (limit: number) => ["account-loans", limit] as const,
        clients: (limit: number) => ["account-clients", limit] as const,
    },
} as const;