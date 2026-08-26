import { useLocation } from "react-router-dom"

import { Separator } from "@/src/components/ui/separator"
import { SidebarTrigger } from "@/src/components/ui/sidebar"
import { getActiveNavTitle } from "@/src/lib/navigation"

export function SiteHeader() {
    const { pathname } = useLocation()
    const activeTitle = getActiveNavTitle(pathname)

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                {activeTitle && (
                    <h1 className="text-base font-medium">{activeTitle}</h1>
                )}
            </div>
        </header>
    )
}
