import * as React from "react"
import {
    House,
    ListChecks,
    ChartBar,
    Folder,
    Users,
} from "@phosphor-icons/react"

import { NavMain } from "@/src/components/nav-main"
import { NavUser } from "@/src/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/src/components/ui/sidebar"
import { useAuthStore } from "@/src/store/authStore"

const navMain = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: House
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
        title: "Reports",
        url: "#",
        icon: Folder,
        isActive: true,
        items: [
            {
                title: "Dashboard Summary",
                url: "#"
            },
            {
                title: "Transaction Summary",
                url: "#"
            },
            {
                title: "Summary of Transaction Graphical",
                url: "#"
            },
            {
                title: "AO Performance",
                url: "#"
            },
            {
                title: "Realtime Transaction History Graphical",
                url: "#"
            }
        ]
    },
    {
        title: "Administration",
        url: "#",
        icon: Users,
        items: [
            {
                title: "Loan Products",
                url: "#"
            },
            {
                title: "Users",
                url: "/admin/users"
            },
            {
                title: "Roles & Permissions",
                url: "/admin/roles"
            }
        ]
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const user = useAuthStore((state) => state.user)

    const userData = {
        name: user ? `${user.firstName} ${user.lastName}` : "Guest",
        role: user?.role ?? "Unknown",
        avatar: "/avatars/shadcn.jpg",
    }

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            render={<a href="#" />}
                            className="data-[slot=sidebar-menu-button]:p-1.5!"
                        >
                                <img src="/enterprise_bank-logo.png" alt="Enterprise Bank" className="h-8 object-contain" />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={userData} />
            </SidebarFooter>
        </Sidebar>
    )
}
