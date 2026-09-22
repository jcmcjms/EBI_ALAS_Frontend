import { formatDistanceToNowStrict } from "date-fns";
import type { TimelineEvent } from "@/src/lib/api/loan-review";
import { LOAN_STATUS_META, type LoanStatus } from "@/src/lib/loan-status";

const statusLabel = (s: string | null) =>
    s && s in LOAN_STATUS_META ? LOAN_STATUS_META[s as LoanStatus].label : (s ?? "");

export interface TimelineSentence {
    headline: string;
    subject?: string;
}

export function describeEvent(e: TimelineEvent): TimelineSentence {
    if (e.type === "deviation")
        return { headline: "Declared a policy deviation", subject: e.subject ?? undefined };
    if (e.type === "deviationRemark")
        return { headline: "Commented on a deviation", subject: e.subject ?? undefined };
    if (e.type === "documentRemark")
        return { headline: "Left a note on a requirement", subject: e.subject ?? undefined };
    if (e.type === "remark")
        return { headline: e.subject ?? "Added remarks" };

    // workflow
    const { action, fromStatus, toStatus } = e;
    if (action === "Created")
        return { headline: "Created the loan application" };
    if (toStatus === "ForIncompleteDocuments")
        return { headline: "Placed the file on hold — missing requirements" };
    if (fromStatus === "ForIncompleteDocuments")
        return { headline: `Requirements completed — returned to ${statusLabel(toStatus)}` };
    if (action === "PushedBack" || toStatus === "ForRevision")
        return { headline: "Returned the application to the encoder for revision" };
    if (action === "EvaluatedRecommended")
        return { headline: "Evaluation complete — recommended for approval" };
    if (action === "EvaluatedNotRecommended")
        return { headline: "Evaluation complete — forwarded as NOT recommended" };
    if (fromStatus === "Draft")
        return { headline: `Submitted the application for ${statusLabel(toStatus).toLowerCase()}` };
    if (toStatus === "ForChecking")
        return { headline: "Recommended — sent for credit checking" };
    if (toStatus === "ForApproval")
        return { headline: "Sent to the approving officer" };
    if (toStatus === "Approved") return { headline: "Approved the application" };
    if (toStatus === "Rejected") return { headline: "Rejected the application" };
    if (toStatus === "Cancelled") return { headline: "Cancelled the application (client withdrawal)" };
    if (toStatus === "ForDisbursement") return { headline: "Released for disbursement setup" };
    if (toStatus === "Disbursed") return { headline: "Proceeds released" };
    if (toStatus === "OnGoing") return { headline: "Loan is now ongoing" };
    return { headline: `Moved the application to ${statusLabel(toStatus)}` };
}

export const relativeTime = (iso: string) =>
    formatDistanceToNowStrict(new Date(iso), { addSuffix: true });

// ── Desk vocabulary ──────────────────────────────────────────────────────

/**
 * Human names for WorkflowQueueService stages.
 *
 * Raw enum values like "DocumentCompletion" or "documentcompletion desk"
 * are meaningless to branch staff. These sentences describe what the file
 * is actually waiting for, in the language a branch manager uses.
 */
const QUEUE_DESK_SENTENCE: Record<string, (owner: string | null) => string> = {
    Recommendation: (o) =>
        `Waiting at the Recommendation desk${o ? ` — next up: ${o}` : ""}.`,
    Evaluation: (o) =>
        `Waiting at the Credit Checking desk${o ? ` — reviewing: ${o}` : ""}.`,
    Approval: (o) =>
        `Waiting at the Approval desk${o ? ` — reviewing: ${o}` : ""}.`,
    DocumentCompletion: (o) =>
        `On hold for missing documents${o ? ` — ${o} is uploading the requirements` : ""}.`,
};

/**
 * Translate a raw queue stage + optional owner into a sentence a branch
 * manager reads once and understands.
 *
 * Returns `null` when the stage is empty or unrecognized — the caller
 * should skip the desk-status banner in that case.
 */
export function queueDeskSentence(
    stage: string | null | undefined,
    owner: string | null | undefined,
): string | null {
    if (!stage) return null;
    const build = QUEUE_DESK_SENTENCE[stage];
    return build ? build(owner ?? null) : null;
}
