import { CaretDown } from "@phosphor-icons/react"
import { Collapsible } from "@base-ui/react/collapsible"
import { Link, useLocation } from "react-router-dom"

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton
} from "@/src/components/ui/sidebar"
import type { NavItem } from "@/src/lib/navigation"
import { useAuthStore } from "@/src/store/authStore"

export function NavMain({
                            items,
                        }: {
    items: NavItem[]
}) {
    const location = useLocation()
    const hasPermission = useAuthStore((state) => state.hasPermission)

    // Filter nav items based on user permissions
    const filteredItems = items.filter((item) => {
        // If item has a required permission, check it
        if (item.requiredPermission && !hasPermission(item.requiredPermission)) {
            return false
        }
        return true
    }).map((item) => {
        // If item has sub-items, filter those too
        if (item.items && item.items.length > 0) {
            const filteredSubItems = item.items.filter((subItem) => {
                // If sub-item has a required permission, check it
                if (subItem.requiredPermission && !hasPermission(subItem.requiredPermission)) {
                    return false
                }
                return true
            })
            // Only include the parent item if it has at least one visible sub-item
            if (filteredSubItems.length === 0) {
                return null
            }
            return { ...item, items: filteredSubItems }
        }
        return item
    }).filter((item): item is NavItem => item !== null)

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {filteredItems.map((item) =>
                        item.items && item.items.length > 0 ? (
                            <Collapsible.Root key={item.title} defaultOpen className="group">
                                <SidebarMenuItem>
                                    <Collapsible.Trigger
                                        render={
                                            <SidebarMenuButton tooltip={item.title} />
                                        }
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        <CaretDown className="ml-auto transition-transform group-data-[open]:rotate-180" />
                                    </Collapsible.Trigger>
                                    <Collapsible.Panel>
                                        <SidebarMenuSub>
                                            {item.items.map((subItem) => (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton
                                                        render={<Link to={subItem.url} />}
                                                        isActive={location.pathname === subItem.url}
                                                    >
                                                        <span>{subItem.title}</span>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            ))}
                                        </SidebarMenuSub>
                                    </Collapsible.Panel>
                                </SidebarMenuItem>
                            </Collapsible.Root>
                        ) : (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    tooltip={item.title}
                                    render={<Link to={item.url} />}
                                    isActive={location.pathname === item.url}
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
