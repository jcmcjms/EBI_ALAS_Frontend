import { cn } from "@/src/lib/utils";
import { useUserPresence } from "@/src/hooks/use-presence";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/src/components/ui/tooltip";

/**
 * Green/grey presence indicator dot.
 *
 * Reads from the presence store (zero network requests) and shows:
 * - Pulsing green dot when online.
 * - Grey dot when offline.
 * - Tooltip with session count when online.
 *
 * Usage:
 * - Users admin table: `<PresenceDot userId={row.id} />`
 * - Monitoring "Assigned To": `<PresenceDot userId={row.assignedApproverId} />`
 * - Any user reference in the UI.
 */
export function PresenceDot({
    userId,
    className,
}: {
    userId?: number | null;
    className?: string;
}) {
    const p = useUserPresence(userId);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    aria-label={p ? "Online" : "Offline"}
                    className={cn("relative inline-flex size-2", className)}
                >
                    {p && (
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                    )}
                    <span
                        className={cn(
                            "relative inline-flex size-2 rounded-full",
                            p
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40",
                        )}
                    />
                </span>
            </TooltipTrigger>
            <TooltipContent>
                {p
                    ? `Online${p.connections > 1 ? ` \u2014 ${p.connections} sessions` : ""}`
                    : "Offline"}
            </TooltipContent>
        </Tooltip>
    );
}
