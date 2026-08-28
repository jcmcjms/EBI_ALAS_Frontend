import {
    Bell,
    ChartBar,
    Folder,
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
 */
export type NavItem = {
    title: string
    url: string
    icon?: Icon
    items?: {
        title: string
        url: string
    }[]
}

export const navMain: NavItem[] = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: House,
    },
    {
        title: "Loan Monitoring",
        url: "/loans/monitoring",
        icon: ListChecks,
    },
    {
        title: "Loan Creation",
        url: "/loans/create",
        icon: ChartBar,
    },
    {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
    },
    {
        title: "Reports",
        url: "#",
        icon: Folder,
        items: [
            {
                title: "Dashboard Summary",
                url: "#",
            },
            {
                title: "Transaction Summary",
                url: "#",
            },
            {
                title: "Summary of Transaction Graphical",
                url: "#",
            },
            {
                title: "AO Performance",
                url: "#",
            },
            {
                title: "Realtime Transaction History Graphical",
                url: "#",
            },
        ],
    },
    {
        title: "Administration",
        url: "#",
        icon: Users,
        items: [
            {
                title: "Loan Products",
                url: "/admin/loan-products",
            },
            {
                title: "Users",
                url: "/admin/users",
            },
            {
                title: "Roles & Permissions",
                url: "/admin/roles",
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
