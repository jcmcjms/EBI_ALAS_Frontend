


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
    
    className: string;
    
    defaultSlaHours: number | null;
    
    hint: string;
}


const C = {
    blue:   "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    green:  "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
    red:    "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
    grey:   "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400",
} as const;

export const LOAN_STATUS_META: Record<LoanStatus, LoanStatusMeta> = {
    Draft: {
        label: "Draft",
        defaultSlaHours: null,
        hint: "Encoded, not yet submitted",
        className: C.grey,
    },
    ForRecommendation: {
        label: "For Recommendation",
        defaultSlaHours: 4,
        hint: "With the Branch Head (Recommender)",
        className: C.blue,
    },
    ForChecking: {
        label: "For Checking",
        defaultSlaHours: 8,
        hint: "With the Credit Checker (Evaluator)",
        className: C.blue,
    },
    ForApproval: {
        label: "For Approval",
        defaultSlaHours: 8,
        hint: "With the Area Head (Approver)",
        className: C.blue,
    },
    ForRevision: {
        label: "For Revision",
        defaultSlaHours: 24,
        hint: "Returned to the Encoder for fixes",
        className: C.blue,
    },
    Approved: {
        label: "Approved",
        defaultSlaHours: null,
        hint: "Approved — awaiting disbursement setup",
        className: C.green,
    },
    ForDisbursement: {
        label: "For Disbursement",
        defaultSlaHours: 24,
        hint: "Release of proceeds in progress",
        className: C.blue,
    },
    Disbursed: {
        label: "Disbursed",
        defaultSlaHours: null,
        hint: "Proceeds released",
        className: C.green,
    },
    OnGoing: {
        label: "On Going",
        defaultSlaHours: null,
        hint: "Active receiving loan",
        className: C.green,
    },
    Rejected: {
        label: "Rejected",
        defaultSlaHours: null,
        hint: "Declined — terminal",
        className: C.red,
    },
    Cancelled: {
        label: "Cancelled",
        defaultSlaHours: null,
        hint: "Client withdrew — terminal",
        className: C.grey + " line-through",
    },
};


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
