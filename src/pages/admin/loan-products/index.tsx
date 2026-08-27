import React from "react";
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar";
import { AppSidebar } from "@/src/components/app-sidebar";
import { SiteHeader } from "@/src/components/site-header";
import { LoanProductsPage } from "./loan-products-page";

export function LoanProductsIndex() {
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
				<main className="flex flex-1 flex-col">
					<LoanProductsPage />
				</main>
			</SidebarInset>
		</SidebarProvider>
	);
}

export default LoanProductsIndex;
