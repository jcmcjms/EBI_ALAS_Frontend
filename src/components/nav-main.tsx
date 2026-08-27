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

export function NavMain({
                            items,
                        }: {
    items: NavItem[]
}) {
    const location = useLocation()

    return (
        <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-2">
                <SidebarMenu>
                    {items.map((item) =>
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
