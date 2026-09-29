import type { QueuedLoanDto } from "../hooks/use-desk-queue";
import { assessAging } from "./loan-aging";
import type { LoanStatus } from "./loan-status";

const phpFormatter = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
});

export function formatPhp(amount: number): string {
    return phpFormatter.format(amount);
}

export function minutesSince(iso: string, now: number): number {
    return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
}

export interface DeskQueueStats {
    fileCount: number;
    longestWaitMinutes: number;
    slaBreachCount: number;
    totalExposure: number;
}

/** KPI strip inputs: depth, worst aging, SLA breaches, pipeline value. */
export function summarizeDeskQueue(
    items: readonly QueuedLoanDto[],
    now: number = Date.now(),
): DeskQueueStats {
    let longestWaitMinutes = 0;
    let slaBreachCount = 0;
    let totalExposure = 0;

    for (const item of items) {
        longestWaitMinutes = Math.max(longestWaitMinutes, minutesSince(item.enqueuedAt, now));
        if (assessAging(item.status as LoanStatus, item.enqueuedAt, now).tier === "breach") {
            slaBreachCount += 1;
        }
        totalExposure += item.proposedAmount;
    }

    return { fileCount: items.length, longestWaitMinutes, slaBreachCount, totalExposure };
}
