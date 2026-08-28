import { Link, useLocation } from "react-router-dom"
import { Bell } from "@phosphor-icons/react"
import { Separator } from "@/src/components/ui/separator"
import { SidebarTrigger } from "@/src/components/ui/sidebar"
import { getActiveNavTitle } from "@/src/lib/navigation"
import { useNotificationStore } from "@/src/store/notificationStore"

export function SiteHeader() {
    const { pathname } = useLocation()
    const activeTitle = getActiveNavTitle(pathname)
    const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length)

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                {activeTitle && <h1 className="text-base font-medium">{activeTitle}</h1>}

                <Link
                    to="/notifications"
                    aria-label={`Notifications (${unreadCount} unread)`}
                    className="relative ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <Bell size={18} weight="bold" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
                            {unreadCount}
                        </span>
                    )}
                </Link>
            </div>
        </header>
    )
}