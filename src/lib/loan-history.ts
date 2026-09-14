import { LOAN_STATUS_META, type LoanStatus } from "@/src/lib/loan-status";
import type { LoanHistoryEntry } from "@/src/lib/api/loans";

export type HistoryCategory = "workflow" | "file" | "remark";
export type HistoryTone =
    | "neutral"
    | "info"
    | "success"
    | "warning"
    | "danger"
    | "violet"
    | "teal";

export interface HistoryEntryMeta {
    title: string;
    category: HistoryCategory;
    tone: HistoryTone;
}

/** Workflow transitions phrased the way officers say them out loud. */
const STATUS_PAIR_TITLES: Record<
    string,
    { title: string; tone: HistoryTone }
> = {
    "Draft>ForRecommendation": {
        title: "Submitted for recommendation",
        tone: "info",
    },
    "ForRecommendation>ForChecking": {
        title: "Recommended for checking",
        tone: "info",
    },
    "ForRecommendation>ForRevision": {
        title: "Pushed back to encoder",
        tone: "warning",
    },
    "ForChecking>ForApproval": {
        title: "Endorsed for approval",
        tone: "info",
    },
    "ForChecking>ForRevision": {
        title: "Pushed back to encoder",
        tone: "warning",
    },
    "ForApproval>Approved": { title: "Approved", tone: "success" },
    "ForApproval>Rejected": { title: "Rejected", tone: "danger" },
    "ForApproval>ForRevision": {
        title: "Returned for revision",
        tone: "warning",
    },
    "ForRevision>ForRecommendation": {
        title: "Resubmitted for recommendation",
        tone: "info",
    },
    // Skip-path pairs: when recommender step is bypassed (flag off).
    "Draft>ForChecking": {
        title: "Submitted for evaluation",
        tone: "info",
    },
    "ForRevision>ForChecking": {
        title: "Resubmitted for evaluation",
        tone: "info",
    },
    "Approved>ForDisbursement": {
        title: "Released for disbursement",
        tone: "info",
    },
    "ForDisbursement>Disbursed": { title: "Disbursed", tone: "success" },
    "Disbursed>OnGoing": {
        title: "Receiving loan on-going",
        tone: "neutral",
    },
};

export function describeHistoryEntry(entry: LoanHistoryEntry): HistoryEntryMeta {
    switch (entry.action) {
        case "Created":
            return {
                title: "Application created",
                category: "workflow",
                tone: "neutral",
            };
        case "StatusChanged": {
            const key = `${entry.fromStatus ?? ""}>${entry.toStatus ?? ""}`;
            const hit = STATUS_PAIR_TITLES[key];
            if (hit) return { ...hit, category: "workflow" };
            const label = entry.toStatus
                ? LOAN_STATUS_META[entry.toStatus as LoanStatus]?.label ??
                  entry.toStatus
                : "";
            return {
                title: label ? `Status changed to ${label}` : "Status changed",
                category: "workflow",
                tone: "info",
            };
        }
        case "PushedBack":
            return {
                title: "Pushed back to encoder",
                category: "workflow",
                tone: "warning",
            };
        case "EvaluatedRecommended":
            return {
                title: "Evaluated — recommended",
                category: "workflow",
                tone: "success",
            };
        case "EvaluatedNotRecommended":
            return {
                title: "Evaluated — not recommended",
                category: "workflow",
                tone: "warning",
            };
        case "ApplicationCancelled":
            return {
                title: "Application cancelled",
                category: "workflow",
                tone: "danger",
            };
        case "AttachmentAdded":
            return { title: "File attached", category: "file", tone: "violet" };
        case "AttachmentRemoved":
            return { title: "File removed", category: "file", tone: "violet" };
        case "DocumentRemarkAdded":
            return {
                title: "Remark on document",
                category: "remark",
                tone: "teal",
            };
        case "DeviationRemarkAdded":
            return {
                title: "Remark on deviation",
                category: "remark",
                tone: "teal",
            };
        default:
            // Future verbs degrade gracefully instead of showing camelCase.
            return {
                title: humanize(entry.action),
                category: "workflow",
                tone: "neutral",
            };
    }
}

export function humanize(verb: string): string {
    const words = verb.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Marker chip colors — same palette family as the status/aging badges. */
export const TONE_MARKER_CLASS: Record<HistoryTone, string> = {
    neutral:
        "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-400",
    info: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-400",
    success:
        "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400",
    warning:
        "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400",
    danger: "border-red-200 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400",
    violet: "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-400",
    teal: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-400",
};

export function formatRelativeTime(
    iso: string,
    now: number = Date.now()
): string {
    const mins = Math.floor((now - new Date(iso).getTime()) / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
}

export function dayLabel(iso: string): string {
    const startOf = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round(
        (startOf(new Date()) - startOf(new Date(iso))) / 86_400_000
    );
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
