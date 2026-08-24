import * as React from "react"
import {
    Camera,
    ChartBar,
    House,
    Database,
    FileCode,
    FileText,
    FileDoc,
    Folder,
    Question,
    ListChecks,
    File,
    MagnifyingGlass,
    Gear,
    Users,
} from "@phosphor-icons/react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
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
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "#",
            icon: House,
        },
        {
            title: "Lifecycle",
            url: "#",
            icon: ListChecks,
        },
        {
            title: "Analytics",
            url: "#",
            icon: ChartBar,
        },
        {
            title: "Projects",
            url: "#",
            icon: Folder,
        },
        {
            title: "Team",
            url: "#",
            icon: Users,
        },
    ],
    navClouds: [
        {
            title: "Capture",
            icon: Camera,
            isActive: true,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Proposal",
            icon: FileText,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Prompts",
            icon: FileCode,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "Settings",
            url: "#",
            icon: Gear,
        },
        {
            title: "Get Help",
            url: "#",
            icon: Question,
        },
        {
            title: "Search",
            url: "#",
            icon: MagnifyingGlass,
        },
    ],
    documents: [
        {
            name: "Data Library",
            url: "#",
            icon: Database,
        },
        {
            name: "Reports",
            url: "#",
            icon: File,
        },
        {
            name: "Word Assistant",
            url: "#",
            icon: FileDoc,
        },
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:p-1.5!"
                        >
                            <a href="#">
                                <img src="/enterprise_bank-logo.png" alt="Enterprise Bank" className="size-5!" />
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavDocuments items={data.documents} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
