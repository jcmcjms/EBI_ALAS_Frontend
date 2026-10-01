

import { LOAN_STATUS_META, type LoanStatus } from "./loan-status";

export type AgingTier = "none" | "ok" | "warning" | "breach";

export interface AgingAssessment {
    tier: AgingTier;
    slaHours: number | null;
    
    pctOfSla: number | null;
    label: string;
}


export function assessAging(
    status: LoanStatus,
    lastActionIso: string,
    now: number = Date.now(),
    slaPolicy?: Record<string, number> | null,
): AgingAssessment {
    const meta = LOAN_STATUS_META[status];
    const sla = slaPolicy?.[status] ?? meta?.defaultSlaHours ?? null;

    if (sla === null || sla <= 0) {
        return { tier: "none", slaHours: null, pctOfSla: null, label: "No deadline set" };
    }

    const elapsedH = (now - new Date(lastActionIso).getTime()) / 3_600_000;
    const pct = (elapsedH / sla) * 100;

    const tier: AgingTier = pct >= 100 ? "breach" : pct >= 60 ? "warning" : "ok";

    return {
        tier,
        slaHours: sla,
        pctOfSla: pct,
        label:
            tier === "breach"
                ? `Past deadline (${sla}h)`
                : tier === "warning"
                  ? `Approaching deadline (${sla}h)`
                  : `On track (${sla}h)`,
    };
}


export const AGING_BADGE_CLASS: Record<AgingTier, string> = {
    none: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    warning:
        "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    breach: "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
};
