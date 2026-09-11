import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MonitoringToolbar } from "./components/monitoring-toolbar";
import { MonitoringTable } from "./components/monitoring-table";
import { LoanDetailsDrawer } from "./components/loan-details-drawer";
import { Card } from "@/src/components/ui/card";
import type { MonitoringFilters } from "./types";
import { useSlaPolicy } from "@/src/lib/api/loan-review";

export function LoanMonitoringPage() {
    const [filters, setFilters] = useState<MonitoringFilters>({
        search: "",
        dateRange: { from: undefined, to: undefined },
        status: [],
        branchCode: "all",
    });

    // SLA policy — fetched once per session (staleTime: Infinity).
    // Falls back to built-in defaults from LOAN_STATUS_META when the
    // endpoint is unreachable.
    const slaPolicy = useSlaPolicy();

    // Deep-linking: MyApplicationsTab navigates here with `?id=<numericId>`
    // so the drawer opens immediately on arrival. `Number(...)` coerces the
    // query param; `Number.isFinite` excludes NaN (e.g. when the param is
    // missing or non-numeric). The id is the loan's `LoanApplication.Id`,
    // NOT its form-number / LamId — see architecture doc §B.4.
    const [searchParams] = useSearchParams();
    const initialId = Number(searchParams.get("id"));
    const [selectedLoanId, setSelectedLoanId] = useState<number | null>(
        Number.isFinite(initialId) && initialId > 0 ? initialId : null
    );

    return (
        <div className="flex flex-col h-full">
            <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none rounded-none">
                <MonitoringToolbar filters={filters} onFiltersChange={setFilters} />
                <MonitoringTable
                    filters={filters}
                    onRowClick={(r) => {
                        // Rows are server-backed now — every `LoanMonitoringRecord`
                        // carries a numeric `id` from `LoanApplication.Id`. The
                        // narrow `undefined` check is a defensive guard against
                        // any future record shape that might omit it.
                        if (r.id !== undefined) {
                            setSelectedLoanId(r.id);
                        }
                    }}
                    slaPolicy={slaPolicy.data ?? null}
                />
            </Card>

            <LoanDetailsDrawer
                applicationId={selectedLoanId}
                onClose={() => setSelectedLoanId(null)}
            />
        </div>
    );
}
