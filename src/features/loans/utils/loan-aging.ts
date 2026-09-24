/**
 * SLA-driven urgency tiers for the "Time Lapsed" pill.
 *
 * Urgency = elapsed-since-last-action vs the stage's handling SLA.
 *   ok      < 60% of SLA consumed   → green
 *   warning 60–99%                  → amber (act soon)
 *   breach  ≥ 100%                  → red   (SLA missed)
 *   none    terminal / no-SLA stage → neutral
 *
 * 60% gives the handler a visible heads-up before the breach, not after.
 *
 * The SLA policy is fetched once per session from GET /api/loans/sla-policy
 * (ops-tunable in appsettings). This module ships sane built-in defaults
 * (from LOAN_STATUS_META) so the UI degrades gracefully when the endpoint
 * is unreachable.
 */

import { LOAN_STATUS_META, type LoanStatus } from "./loan-status";

export type AgingTier = "none" | "ok" | "warning" | "breach";

export interface AgingAssessment {
    tier: AgingTier;
    slaHours: number | null;
    /** 0–∞ percent of the SLA consumed; null when the stage has no SLA. */
    pctOfSla: number | null;
    label: string;
}

/**
 * Assess the urgency of a loan in its current workflow stage.
 *
 * @param status    - Current workflow status (raw backend value).
 * @param lastActionIso - ISO-8601 timestamp of the last workflow action.
 * @param now       - Current timestamp (injectable for testing / SSR).
 * @param slaPolicy - Server-fetched SLA hours per stage (optional; falls
 *                    back to built-in defaults from LOAN_STATUS_META).
 */
export function assessAging(
    status: LoanStatus,
    lastActionIso: string,
    now: number = Date.now(),
    slaPolicy?: Record<string, number> | null,
): AgingAssessment {
    const meta = LOAN_STATUS_META[status];
    const sla = slaPolicy?.[status] ?? meta?.defaultSlaHours ?? null;

    if (sla === null || sla <= 0) {
        return { tier: "none", slaHours: null, pctOfSla: null, label: "No handling SLA" };
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
                ? `SLA breached (${sla}h)`
                : tier === "warning"
                  ? `Approaching SLA (${sla}h)`
                  : `Within SLA (${sla}h)`,
    };
}

/** Badge classes per aging tier (light + dark). */
export const AGING_BADGE_CLASS: Record<AgingTier, string> = {
    none: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    warning:
        "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    breach: "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
};
