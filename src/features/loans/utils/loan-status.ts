/**
 * Single source of truth for loan workflow statuses.
 *
 * Wire statuses emitted by LoanWorkflowService — rendered verbatim, never
 * collapsed into generic buckets. The old `UI_STATUS_BY_BACKEND_STATUS` map
 * (in `use-loan-monitoring.ts`) collapsed ForRecommendation, ForChecking,
 * ForApproval, and ForRevision into "Pending" / "Under Review", hiding
 * operationally critical distinctions (a returned file looked like progress).
 *
 * Every consumer — monitoring table, dashboard pending queue, filter toolbar,
 * detail drawer — imports from here so badge semantics, labels, and SLA
 * defaults stay in lock-step.
 */

/** Wire statuses emitted by LoanWorkflowService. */
export type LoanStatus =
    | "Draft"
    | "ForRecommendation"
    | "ForChecking"
    | "ForApproval"
    | "ForRevision"
    | "Approved"
    | "ForDisbursement"
    | "Disbursed"
    | "OnGoing"
    | "Rejected"
    | "Cancelled";

export interface LoanStatusMeta {
    label: string;
    /** Badge classes (light + dark), consistent with existing badge palette. */
    className: string;
    /** Fallback handling SLA in hours when the /sla-policy endpoint is unreachable. */
    defaultSlaHours: number | null;
    /** Tooltip: who currently owns the file. */
    hint: string;
}

export const LOAN_STATUS_META: Record<LoanStatus, LoanStatusMeta> = {
    Draft: {
        label: "Draft",
        defaultSlaHours: null,
        hint: "Encoded, not yet submitted",
        className:
            "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400",
    },
    ForRecommendation: {
        label: "For Recommendation",
        defaultSlaHours: 4,
        hint: "With the Branch Head (Recommender)",
        className:
            "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    },
    ForChecking: {
        label: "For Checking",
        defaultSlaHours: 8,
        hint: "With the Credit Checker (Evaluator)",
        className:
            "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-400",
    },
    ForApproval: {
        label: "For Approval",
        defaultSlaHours: 8,
        hint: "With the Area Head (Approver)",
        className:
            "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    },
    ForRevision: {
        label: "For Revision",
        defaultSlaHours: 24,
        hint: "Returned to the Encoder for fixes",
        className:
            "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400",
    },
    Approved: {
        label: "Approved",
        defaultSlaHours: null,
        hint: "Approved — awaiting disbursement setup",
        className:
            "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    },
    ForDisbursement: {
        label: "For Disbursement",
        defaultSlaHours: 24,
        hint: "Release of proceeds in progress",
        className:
            "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-400",
    },
    Disbursed: {
        label: "Disbursed",
        defaultSlaHours: null,
        hint: "Proceeds released",
        className:
            "border-teal-300 bg-teal-100 text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-400",
    },
    OnGoing: {
        label: "On Going",
        defaultSlaHours: null,
        hint: "Active receiving loan",
        className:
            "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400",
    },
    Rejected: {
        label: "Rejected",
        defaultSlaHours: null,
        hint: "Declined — terminal",
        className:
            "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
    },
    Cancelled: {
        label: "Cancelled",
        defaultSlaHours: null,
        hint: "Client withdrew — terminal",
        className:
            "border-slate-400 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400 line-through",
    },
};

/** Filter dropdown order: active stages first, then terminal. */
export const STATUS_FILTER_ORDER: LoanStatus[] = [
    "ForRecommendation",
    "ForChecking",
    "ForApproval",
    "ForRevision",
    "ForDisbursement",
    "Draft",
    "OnGoing",
    "Approved",
    "Disbursed",
    "Rejected",
    "Cancelled",
];
