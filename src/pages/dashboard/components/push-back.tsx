import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowArcLeft } from "@phosphor-icons/react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { formatRelativeTime } from "@/src/lib/notifications";
import type { PushBackItem } from "../types";

interface PushBackProps { data: PushBackItem[]; }

export function PushBack({ data }: PushBackProps) {
    const navigate = useNavigate();
    const displayData = useMemo(() => data.slice(0, 5), [data]);

    return (
        <Card id="push-back" className="scroll-mt-24 flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <ArrowArcLeft size={20} weight="bold" className="text-red-500 dark:text-red-400" />
                    Push Back
                    {data.length > 0 && <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 tabular-nums">{data.length}</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                {data.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">No push backs today.</p>
                ) : (
                    <ul className="divide-y">
                        {displayData.map((item) => (
                            <li
                                key={item.lamId}
                                onClick={() => navigate("/loans/monitoring")}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate("/loans/monitoring"); } }}
                                tabIndex={0}
                                role="link"
                                className="flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            >
                                <div className="w-8 h-8 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                                    <ArrowArcLeft size={16} weight="bold" className="text-red-500 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.lamId}</p>
                                    <p className="text-xs text-red-600 dark:text-red-400 truncate">{item.reason}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs text-muted-foreground">{item.branch}</span>
                                    <p className="text-xs text-muted-foreground" title={new Date(item.date).toLocaleString("en-PH")}>{formatRelativeTime(item.date)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
            {data.length > 5 && (
                <CardFooter className="border-t p-3 justify-center">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/loans/monitoring")} className="w-full text-sm">View all push backs</Button>
                </CardFooter>
            )}
        </Card>
    );
}
