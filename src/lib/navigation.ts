import {
    Bell,
    ChartBar,
    House,
    ListChecks,
    Users,
    type Icon,
} from "@phosphor-icons/react"

/**
 * Single source of truth for the app's primary navigation.
 * Consumed by the sidebar (AppSidebar/NavMain) and the top bar
 * (SiteHeader) so titles stay consistent everywhere.
 *
 * Placeholder entries ("#") have no page yet and never match a route.
 *
 * Each item can have a `requiredPermission` string (or `items` with individual
 * `requiredPermission` values). Items the current user lacks are hidden from
 * the sidebar entirely — no "forbidden" fallback is shown.
 */
export type NavItem = {
    title: string
    url: string
    icon?: Icon
    items?: {
        title: string
        url: string
        /** Permission required to see this sub-item. Omit to make it public. */
        requiredPermission?: string
    }[]
    /** Permission required to see this item. Omit to make it public. */
    requiredPermission?: string
}

export const navMain: NavItem[] = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: House,
        requiredPermission: "loans.view",
    },
    {
        title: "Loan Monitoring",
        url: "/loans/monitoring",
        icon: ListChecks,
        requiredPermission: "loans.view",
    },
    {
        title: "Loan Creation",
        url: "/loans/create",
        icon: ChartBar,
        requiredPermission: "loans.create",
    },
    {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
    },
    {
        title: "Administration",
        url: "#",
        icon: Users,
        items: [
            {
                title: "Users",
                url: "/admin/users",
                requiredPermission: "user.view",
            },
            {
                title: "Loan Products",
                url: "/admin/loan-products",
                requiredPermission: "loan_product.view",
            },
            {
                title: "Audit Logs",
                url: "/admin/audit-logs",
                requiredPermission: "auditLogs.view",
            },
        ],
    },
]

/**
 * Resolves the display title for a pathname by walking the nav tree
 * (top-level links first, then their sub-items). Returns null when the
 * route has no nav entry — callers decide how to render that case.
 */
export function getActiveNavTitle(pathname: string): string | null {
    for (const item of navMain) {
        if (item.url === pathname) return item.title
        for (const sub of item.items ?? []) {
            if (sub.url === pathname) return sub.title
        }
    }
    return null
}
