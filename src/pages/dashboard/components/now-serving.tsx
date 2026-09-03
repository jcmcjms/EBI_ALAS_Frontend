import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { initialsOf } from "@/src/lib/notifications";
import type { NowServingItem } from "../types";

interface NowServingProps { data: NowServingItem[]; }

export function NowServing({ data }: NowServingProps) {
    return (
        <Card id="now-serving" className="scroll-mt-24 flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    Now Serving
                    {data.length > 0 && <Badge variant="secondary" className="tabular-nums">{data.length}</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                {data.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">No checkers are serving right now.</p>
                ) : (
                    <ul className="divide-y">
                        {data.map((item) => (
                            <li key={item.lamId} className="flex items-center gap-3 px-4 py-3">
                                <span className="w-7 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">#{item.number}</span>
                                <Avatar size="sm" className="border"><AvatarFallback>{initialsOf(item.checker)}</AvatarFallback></Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{item.checker}</p>
                                    <p className="truncate text-xs text-muted-foreground">{item.lamId}</p>
                                </div>
                                {item.number === 1 && (
                                    <Badge variant="outline" className="gap-1.5 border-emerald-300 bg-emerald-50 font-normal text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden />
                                        Serving
                                    </Badge>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
