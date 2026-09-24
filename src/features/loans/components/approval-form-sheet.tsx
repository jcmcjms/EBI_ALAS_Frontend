import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils";

/**
 * Print geometry of the LOAN APPROVAL FORM sheet. Both the create-page
 * preview and the Review & Approval page MUST render through this frame so
 * the two surfaces can never drift apart again (the approval page previously
 * stretched its tables to the full card width).
 */
export const APPROVAL_FORM_SHEET_WIDTH_PX = 800;

export function ApprovalFormSheet({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <div
            className={cn(
                "mx-auto w-[800px] max-w-full",
                "text-[9px] leading-[1.35] [font-family:Arial,Helvetica,sans-serif]",
                className,
            )}
        >
            {children}
        </div>
    );
}

/**
 * Scroll viewport for the review page: keeps the sheet at its true 800px on
 * narrow panes (horizontal scroll) instead of squishing the tables, and
 * supports the zoom toolbar via the CSS `zoom` property.
 */
export function ApprovalFormViewport({ children, zoom = 1 }: { children: ReactNode; zoom?: number }) {
    return (
        <div className="overflow-x-auto bg-white">
            <div className="mx-auto w-max min-w-full" style={{ zoom }}>
                {children}
            </div>
        </div>
    );
}
