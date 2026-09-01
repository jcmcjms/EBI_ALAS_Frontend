import {
    DotsThreeVertical,
    SignOut,
    Bell,
    UserCircle,
} from "@phosphor-icons/react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/src/components/ui/avatar"
import { initialsOf } from "@/src/lib/notifications"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/src/components/ui/sidebar"
import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "@/src/store/authStore"
import { apiClient } from "@/src/lib/apiClient"

export function NavUser({
                            user,
                        }: {
    user: {
        name: string
        role: string
        avatar: string
    }
}) {
    const { isMobile } = useSidebar()
    const navigate = useNavigate()
    const clearSession = useAuthStore((state) => state.clearSession)
    const accessToken = useAuthStore((state) => state.accessToken)

    const handleLogout = async () => {
        try {
            // Notify backend so it can blacklist the token
            if (accessToken) {
                await apiClient.post("/api/auth/logout").catch(() => {
                    // If backend call fails, still log out locally
                });
            }
        } finally {
            // Always clear local session regardless of backend response
            clearSession()
            navigate("/login", { replace: true })
        }
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                size="lg"
                                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                            />
                        }
                    >
                        <Avatar className="h-8 w-8 rounded-lg grayscale">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-lg">{initialsOf(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">{user.name}</span>
                            <span className="truncate text-xs text-muted-foreground">
                                {user.role}
                            </span>
                        </div>
                        <DotsThreeVertical className="ml-auto size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback className="rounded-lg">{initialsOf(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                render={<Link to="/account" />}
                                onSelect={(e) => e.preventDefault()}
                            >
                                <UserCircle />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                render={<Link to="/notifications" />}
                                onSelect={(e) => e.preventDefault()}
                            >
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 cursor-pointer">
                            <SignOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
