import * as React from "react"

import { NavMain } from "@/src/components/layout/nav-main"
import { NavUser } from "@/src/components/layout/nav-user"
import { navMain } from "@/src/lib/navigation"
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
