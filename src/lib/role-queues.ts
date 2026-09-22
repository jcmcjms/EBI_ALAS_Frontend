import type { LoanStatus } from "./loan-status";

/**
 * Mirror of backend Common/Constants/RoleQueues.cs (same pattern as
 * PERMISSIONS ↔ Permissions.cs). Used for the synchronous first paint;
 * the server policy reconciles it once /queue-default resolves.
 */
export const ROLE_QUEUE_DEFAULTS: Record<string, LoanStatus[]> = {
    Recommender: ["ForRecommendation", "ForIncompleteDocuments"],
    Evaluator: ["ForChecking", "ForIncompleteDocuments"],
    Approver: ["ForApproval", "ForIncompleteDocuments"],
};

export function queueDefaultForRole(role: string | undefined | null): LoanStatus[] {
    if (!role) return [];
    return ROLE_QUEUE_DEFAULTS[role] ?? [];
}

export const sameStatusSet = (a: LoanStatus[], b: LoanStatus[]) =>
    a.length === b.length && a.every((s) => b.includes(s));
