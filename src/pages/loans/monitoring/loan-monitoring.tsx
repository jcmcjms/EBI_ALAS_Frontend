import { useState } from "react";
import { MonitoringToolbar } from "./components/monitoring-toolbar";
import { MonitoringTable } from "./components/monitoring-table";
import { LoanDetailsDrawer } from "./components/loan-details-drawer";
import { Card } from "@/components/ui/card";
import type { LoanMonitoringRecord, MonitoringFilters } from "./types";

export function LoanMonitoringPage() {
    const [filters, setFilters] = useState<MonitoringFilters>({
        search: "",
        dateRange: { from: undefined, to: undefined },
        status: [],
        branchCode: "all",
    });

    const [selectedLoan, setSelectedLoan] = useState<LoanMonitoringRecord | null>(null);

    return (
        <div className="flex flex-col h-full">
            <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none rounded-none">
                <MonitoringToolbar filters={filters} onFiltersChange={setFilters} />
                <MonitoringTable filters={filters} onRowClick={setSelectedLoan} />
            </Card>

            <LoanDetailsDrawer loan={selectedLoan} onClose={() => setSelectedLoan(null)} />
        </div>
    );
}
