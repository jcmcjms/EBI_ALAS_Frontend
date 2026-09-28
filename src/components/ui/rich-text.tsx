import { useMemo, type ReactNode } from "react";

import { cn } from "@/src/shared/lib/utils";
import { isRichTextEmpty, toRichText } from "@/src/shared/lib/rich-text";

interface RichTextProps {
    /** Persisted findings HTML (sanitized on write) or legacy plain text. */
    value?: string | null;
    className?: string;
    emptyFallback?: ReactNode;
}

/**
 * Read-only renderer for persisted rich text.
 *
 * Re-sanitizes on render as defense in depth: this content can arrive from
 * the database (written by older clients or another channel), so the render
 * path never trusts storage even though the editor sanitizes on write.
 */
export function RichText({ value, className, emptyFallback = "-" }: RichTextProps) {
    const html = useMemo(() => toRichText(value ?? ""), [value]);

    if (isRichTextEmpty(html)) return <>{emptyFallback}</>;

    return (
        <div
            className={cn("rich-text", className)}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
