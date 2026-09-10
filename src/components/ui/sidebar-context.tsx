"use client"

import * as React from "react"

/**
 * Sidebar context — extracted from `sidebar.tsx` so the component file
 * can export only the `Sidebar*` components (required by
 * `react-refresh/only-export-components`). The `useSidebar` hook
 * shares the same module as the React context object, which is a
 * canonical "context + consumer hook" pair: both must move together.
 */

type SidebarContextProps = {
    state: "expanded" | "collapsed"
    open: boolean
    setOpen: (open: boolean) => void
    openMobile: boolean
    setOpenMobile: (open: boolean) => void
    isMobile: boolean
    toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)

function useSidebar() {
    const context = React.useContext(SidebarContext)
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.")
    }
    return context
}

export { SidebarContext, useSidebar }
export type { SidebarContextProps }