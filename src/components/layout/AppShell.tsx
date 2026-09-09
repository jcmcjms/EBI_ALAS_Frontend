import * as React from "react";

import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SiteHeader } from "@/src/components/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import { useNotifications } from "@/src/hooks/useNotifications";
import { useAuthStore } from "@/src/store/authStore";

/**
 * Shared page chrome — sidebar + header + main scroll container.
 * Every authenticated page renders through this so the layout
 * stays consistent and the CSS-variable style block is defined
 * in exactly one place.
 */
const APP_SHELL_STYLE = {
    "--sidebar-width": "calc(var(--spacing) * 72)",
    "--header-height": "calc(var(--spacing) * 12)",
} as React.CSSProperties;

export function AppShell({ children }: { children: React.ReactNode }) {
    // Bell polling lives at the shell layer (not SiteHeader) so the
    // query mounts exactly once per session, regardless of how many
    // components render the bell. The hook pipes results into the
    // Zustand store, which the header bell reads.
    //
    // Gated on `user` being set — the /login page never reaches
    // AppShell, but AuthInitProvider's loading screen does, so we
    // must still defer polling until the bootstrap completes.
    const user = useAuthStore((s) => s.user);
    useNotifications(Boolean(user));

    return (
        <SidebarProvider style={APP_SHELL_STYLE}>
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <main className="flex flex-1 flex-col">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
