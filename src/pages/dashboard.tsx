import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { DashboardSummary } from "@/pages/dashboard/components/dashboard-summary";
import { PendingQueue } from "@/pages/dashboard/components/pending-queue";
import { NowServing } from "@/pages/dashboard/components/now-serving";
import { PushBack } from "@/pages/dashboard/components/push-back";
import { ApprovedLoans } from "@/pages/dashboard/components/approved-loans";

export function Dashboard() {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="inset" />
            <SidebarInset>
                <SiteHeader />
                <main className="flex flex-1 flex-col gap-6 p-6">
                    {/* Summary Stats */}
                    <DashboardSummary />

                    {/* Operational Tables Grid */}
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
                        <PendingQueue />
                        <NowServing />
                        <PushBack />
                        <ApprovedLoans />
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
