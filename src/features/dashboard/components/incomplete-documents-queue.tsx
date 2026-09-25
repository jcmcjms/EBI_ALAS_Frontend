import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { cn } from "@/src/lib/utils";
import { initialsOf } from "@/src/lib/name-utils";
import { formatWaiting, waitingMinutes } from "./pending-queue";
import type { IncompleteDocsQueueItem } from "../types";

interface Props {
    data: IncompleteDocsQueueItem[];
}

/**
 * "Flagged Documents" — files flagged by reviewers while requirements are
 * completed. The flag is a data fact, not a routing status. Flagged files
 * stay at their real desk; this widget surfaces them for encoder attention.
 */
export const IncompleteDocumentsQueue = memo(function IncompleteDocumentsQueue({ data }: Props) {
    const navigate = useNavigate();
    const display = useMemo(() => data.slice(0, 5), [data]);

    return (
        <Card id="incomplete-docs-queue" className="scroll-mt-24 flex flex-col">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <WarningCircle className="size-5 text-amber-600 dark:text-amber-400" aria-hidden />
                    Flagged Documents
                    {data.length > 0 && (
                        <Badge variant="secondary" className="tabular-nums">
                            {data.length}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                {data.length === 0 ? (
                    <div className="py-10 text-center space-y-1">
                        <p className="text-sm text-muted-foreground">
                            No applications flagged for missing documents.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Reviewers flag files from the Review &amp; Approval page.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y">
                        {display.map((item) => {
                            const mins = waitingMinutes(item.waitingSinceUtc);
                            return (
                                <li key={item.lamId}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(
                                                `/loans/approval/${item.id}`
                                            )
                                        }
                                        className={cn(
                                            "flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50",
                                            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                                            item.position === 1 && "bg-primary/[0.04]"
                                        )}
                                    >
                                        <span className="w-8 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                                            #{item.position}
                                        </span>
                                        <Avatar size="sm" className="border">
                                            <AvatarFallback>{initialsOf(item.clientName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-medium truncate">{item.lamId}</p>
                                                <Badge
                                                    variant="outline"
                                                    className="h-4 px-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400"
                                                >
                                                    {item.missingCount} doc(s) missing
                                                </Badge>
                                            </div>
                                            <p
                                                className="text-xs truncate"
                                                title={`${item.clientName} · encoded by ${item.encoderName} · ${item.flaggedByName ? `flagged by ${item.flaggedByName}` : ""} · ${item.branch}`}
                                            >
                                                <span className="font-medium text-foreground/90">{item.clientName}</span>
                                                <span className="text-muted-foreground"> · by {item.encoderName}</span>
                                                {item.flaggedByName && (
                                                    <span className="text-muted-foreground"> · flagged by {item.flaggedByName}</span>
                                                )}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                                            {formatWaiting(mins)}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
            {data.length > 5 && (
                <CardFooter className="justify-center border-t p-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-sm"
                        onClick={() =>
                            navigate("/loans/monitoring?flagged=true")
                        }
                    >
                        View all {data.length} flagged files
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
});
