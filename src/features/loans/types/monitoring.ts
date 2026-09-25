import type { LoanStatus } from "@/src/features/loans/utils/loan-status";

export type { LoanStatus };

export type QueueStage = "Recommendation" | "Evaluation" | "Approval";

export interface LoanMonitoringRecord {
    /**
     * Numeric primary key from `LoanApplication.Id`. Server-backed rows
     * always carry this — the row-click handler uses it to open the
     * details drawer for the matching loan. Kept `id?: number` (rather
     * than required) as a defensive guard so a future partial record
     * (e.g. an optimistic insert) doesn't crash the click handler.
     */
    id?: number;
    formNumber: string;
    branchCode: string;
    customerName: string;
    loanType: string;
    product: string;
    loanAmount: number;
    applicationDate: string; // ISO Date
    status: LoanStatus;
    lastActionDate: string;  // ISO Date
    timeLapsedHours: number; // Calculated by backend or frontend
    /** Officer the application last flowed through: Encoder → Recommender →
     *  Evaluator → Approver. Resolved server-side from the audit trail. */
    lastActionBy: string;
    /** Verb of the last workflow action (Created, PushedBack,
     *  EvaluatedRecommended, …). Rendered as muted subtext. */
    lastActionVerb: string | null;
    /** User ID of the encoder who created this application.
     *  Used for ownership gating (cancel button). */
    createdById?: number | null;
    // ── Delegation-of-authority routing fields ──────────────────────
    /** Whether all required checklist documents are uploaded.
     *  null = not yet verified (distinct from false = verified missing). */
    documentsComplete: boolean | null;
    /** ISO-8601 datetime when document completeness was last verified. */
    documentsCompleteAt: string | null;
    /** Display name of the assigned approver, or null if unassigned. */
    assignedApproverName: string | null;
    /** Required approval tier (1-5), or null if not yet routed. */
    requiredApprovalTier: number | null;
    // ── Workflow queue fields ──────────────────────────────────────────
    /** Current queue stage (Recommendation / Evaluation / Approval), or null if not queued. */
    queueStage: QueueStage | null;
    /** Position in the queue (1 = on the desk right now), or null if not queued. */
    queuePosition: number | null;
    /** Total number of items in the current queue stage, or null if not queued. */
    queueLength: number | null;
    /** Display name of the officer currently reviewing this file, or null. */
    queueOwnerName: string | null;
    /** True when this file is at position 1 — the "head" of the queue. */
    isQueueHead: boolean;
    /** Document flag state. Null when no active flag. */
    documentFlag: {
        flaggedAt: string;
        flaggedById: number | null;
        reason: string | null;
        missingCount: number;
    } | null;
}

export interface MonitoringFilters {
    search: string;
    dateRange: { from: Date | undefined; to: Date | undefined };
    status: LoanStatus[];
    branchCode: string;
    /** When true, filters to only loans where the current user is the head owner. */
    myTurn: boolean;
}
