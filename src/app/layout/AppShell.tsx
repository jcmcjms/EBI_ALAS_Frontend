import * as React from 'react'

import { AppSidebar } from '@/src/app/layout/app-sidebar'
import { SiteHeader } from '@/src/app/layout/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/src/shared/components/layout/sidebar'
import { useApprovalRealtime } from '@/src/features/loans/hooks/use-approval-realtime'
import { useDashboardRealtime } from '@/src/features/dashboard/hooks/use-dashboard-realtime'
import { useNotifications } from '@/src/features/notifications/hooks/use-notifications'
import { usePresenceSync } from '@/src/shared/lib/signalr/use-presence'
import { useSignalR } from '@/src/shared/lib/signalr/use-signalr'
import { useAuthStore } from '@/src/store/authStore'

const APP_SHELL_STYLE = {
  '--sidebar-width': 'calc(var(--spacing) * 72)',
  '--header-height': 'calc(var(--spacing) * 12)',
} as React.CSSProperties

export function AppShell({ children }: { children: React.ReactNode }) {
  const { connection, isConnected } = useSignalR()

  usePresenceSync()

  const user = useAuthStore((s) => s.user)
  useNotifications(Boolean(user), isConnected)

  useApprovalRealtime(() => connection)

  useDashboardRealtime(() => connection)

  return (
    <SidebarProvider style={APP_SHELL_STYLE}>
      <AppSidebar variant="inset" />
      <SidebarInset className="min-w-0">
        <SiteHeader />
        <main className="flex min-w-0 flex-1 min-h-0 flex-col overflow-x-clip">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
