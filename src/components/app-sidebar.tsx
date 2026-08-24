import * as React from "react"
import {
    House,
    ListChecks,
    ChartBar,
    Folder,
    Users,
} from "@phosphor-icons/react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
    user: {
        name: "Admin Super",
        role: "Super Administrator",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: House
        },
        {
            title: "Loan Monitoring",
            url: "#",
            icon: ListChecks,
        },
        {
            title: "Loan Creation",
            url: "#",
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
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
