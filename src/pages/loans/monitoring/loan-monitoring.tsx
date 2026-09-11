import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MonitoringToolbar } from "./components/monitoring-toolbar";
import { MonitoringTable } from "./components/monitoring-table";
import { LoanDetailsDrawer } from "./components/loan-details-drawer";
import { Card } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Textarea } from "@/src/components/ui/textarea";
import { Label } from "@/src/components/ui/label";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/src/components/ui/alert-dialog";
import type { MonitoringFilters } from "./types";
import type { LoanMonitoringRecord } from "./types";
import { useSlaPolicy, useQueueDefault } from "@/src/lib/api/loan-review";
import { cancelLoanApplication } from "@/src/lib/api/loan-review";
import { useAuthStore } from "@/src/store/authStore";
import { queueDefaultForRole, sameStatusSet } from "@/src/lib/role-queues";
import { queryKeys } from "@/src/lib/queryKeys";
import type { LoanStatus } from "@/src/lib/loan-status";
import { LOAN_STATUS_META } from "@/src/lib/loan-status";

export function LoanMonitoringPage() {
    const role = useAuthStore((s) => s.user?.role);
    const user = useAuthStore((s) => s.user);
    const qc = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const slaPolicy = useSlaPolicy();
    const queueDefault = useQueueDefault();

    // ── Initial filter: explicit URL wins, then the role's queue ─────────
    // `?status=ForChecking,ForApproval` deep-links (dashboard, notifications,
    // shared "my queue" links) must never be overwritten by the role default.
    const urlStatus = useMemo(() => {
        const raw = searchParams.get("status");
        if (!raw) return null;
        return raw
            .split(",")
            .filter((s): s is LoanStatus => s in LOAN_STATUS_META);
    }, []); // first load only

    const [filters, setFilters] = useState<MonitoringFilters>(() => ({
        search: "",
        dateRange: { from: undefined, to: undefined },
        branchCode: "all",
        status: urlStatus ?? queueDefaultForRole(role),
    }));

    // Once the user touches filters (or arrived via an explicit URL), the
    // server policy must not yank the view out from under them.
    const touchedRef = useRef(urlStatus !== null);
    const handleFiltersChange = (next: MonitoringFilters) => {
        touchedRef.current = true;
        setFilters(next);
    };

    // ── Server policy reconciliation (backend owns the role→queue map) ───
    useEffect(() => {
        const policy = queueDefault.data;
        if (!policy || touchedRef.current || urlStatus !== null) return;
        setFilters((f) =>
            sameStatusSet(f.status, policy) ? f : { ...f, status: policy },
        );
    }, [queueDefault.data, urlStatus]);

    // ── URL sync: refresh / share / back-button preserve the view ────────
    useEffect(() => {
        const next = new URLSearchParams(searchParams);
        if (filters.status.length > 0)
            next.set("status", filters.status.join(","));
        else next.delete("status");
        setSearchParams(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.status]);

    // Deep-linking: MyApplicationsTab navigates here with `?id=<numericId>`
    // so the drawer opens immediately on arrival. `Number(...)` coerces the
    // query param; `Number.isFinite` excludes NaN (e.g. when the param is
    // missing or non-numeric). The id is the loan's `LoanApplication.Id`,
    // NOT its form-number / LamId — see architecture doc §B.4.
    const initialId = Number(searchParams.get("id"));
    const [selectedLoanId, setSelectedLoanId] = useState<number | null>(
        Number.isFinite(initialId) && initialId > 0 ? initialId : null,
    );

    // ── Cancel dialog state ────────────────────────────────────────────────
    const [cancelDialog, setCancelDialog] = useState<{
        open: boolean;
        record: LoanMonitoringRecord | null;
        reason: string;
        pending: boolean;
    }>({ open: false, record: null, reason: "", pending: false });

    return (
        <div className="flex flex-col h-full">
            <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none rounded-none">
                <MonitoringToolbar
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    roleQueue={queueDefault.data ?? queueDefaultForRole(role)}
                />
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
                    currentUser={user ? { id: Number(user.userId), role: user.role } : null}
                    onCancel={(r) => setCancelDialog({ open: true, record: r, reason: "", pending: false })}
                />
            </Card>

            <LoanDetailsDrawer
                applicationId={selectedLoanId}
                onClose={() => setSelectedLoanId(null)}
            />

            {/* ── Cancel confirmation dialog ──────────────────────────────── */}
            <AlertDialog
                open={cancelDialog.open}
                onOpenChange={(o) => setCancelDialog((d) => ({ ...d, open: o }))}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The client has withdrawn their application for{" "}
                            <strong>{cancelDialog.record?.customerName}</strong>{" "}
                            (<code>{cancelDialog.record?.formNumber}</code>). The application will be
                            closed and the reviewer currently handling it will be notified.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="cancel-reason">Reason for cancellation *</Label>
                        <Textarea
                            id="cancel-reason"
                            rows={3}
                            placeholder="e.g. Client found financing elsewhere…"
                            value={cancelDialog.reason}
                            onChange={(e) => setCancelDialog((d) => ({ ...d, reason: e.target.value }))}
                            maxLength={2000}
                        />
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                            {cancelDialog.reason.trim().length}/2000 — minimum 10
                        </p>
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setCancelDialog((d) => ({ ...d, open: false }))}
                        >
                            Keep application
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={cancelDialog.pending || cancelDialog.reason.trim().length < 10}
                            onClick={async () => {
                                if (!cancelDialog.record?.id) return;
                                setCancelDialog((d) => ({ ...d, pending: true }));
                                try {
                                    await cancelLoanApplication(cancelDialog.record.id, cancelDialog.reason.trim());
                                    toast.success("Application cancelled.");
                                    setCancelDialog({ open: false, record: null, reason: "", pending: false });
                                    qc.invalidateQueries({ queryKey: queryKeys.loans.all });
                                } catch (e) {
                                    toast.error(e instanceof Error ? e.message : "Could not cancel.");
                                    setCancelDialog((d) => ({ ...d, pending: false }));
                                }
                            }}
                        >
                            {cancelDialog.pending ? "Cancelling…" : "Cancel application"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
