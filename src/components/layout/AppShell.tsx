import * as React from "react";

import { AppSidebar } from "@/src/components/layout/app-sidebar";
import { SiteHeader } from "@/src/components/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import { useApprovalRealtime } from "@/src/hooks/useApprovalRealtime";
import { useDashboardRealtime } from "@/src/hooks/useDashboardRealtime";
import { useNotifications } from "@/src/hooks/useNotifications";
import { usePresenceSync } from "@/src/hooks/use-presence";
import { useSignalR } from "@/src/hooks/useSignalR";
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
    // Real-time WebSocket connection — receives instant notification
    // pushes from the server. Returns { connection, isConnected } so
    // other hooks can gate polling on connection state.
    const { connection, isConnected } = useSignalR();

    // Org-wide presence — hydrates the presence store on mount and
    // keeps it in sync via PresenceSnapshot / PresenceChanged events.
    usePresenceSync();

    // Bell: when SignalR is connected, polling is DISABLED — the
    // WebSocket pushes new notifications into the Zustand store
    // instantly. When disconnected, falls back to 30s polling.
    //
    // Gated on `user` being set — the /login page never reaches
    // AppShell, but AuthInitProvider's loading screen does, so we
    // must still defer polling until the bootstrap completes.
    const user = useAuthStore((s) => s.user);
    useNotifications(Boolean(user), isConnected);

    // Real-time approval queue + presence updates (approver-specific)
    useApprovalRealtime(() => connection);

    // Real-time dashboard refresh — when a loan status changes, the
    // server pushes a DashboardUpdated event that invalidates the
    // TanStack Query cache, replacing the 30s dashboard poll.
    useDashboardRealtime(() => connection);

    return (
        <SidebarProvider style={APP_SHELL_STYLE}>
            <AppSidebar variant="inset" />
            <SidebarInset className="min-w-0">
                <SiteHeader />
                <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
