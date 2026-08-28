import { useNavigate } from "react-router-dom";
import { ArrowArcLeft } from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { formatRelativeTime } from "@/src/lib/notifications";
import type { PushBackItem } from "../types";

interface PushBackProps {
    data: PushBackItem[];
}

export function PushBack({ data }: PushBackProps) {
    const navigate = useNavigate();

    return (
        <Card id="push-back" className="scroll-mt-24">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <ArrowArcLeft size={20} weight="bold" className="text-red-500" />
                    Push Back
                    <Badge variant="secondary" className="bg-red-500/10 text-red-600 tabular-nums">
                        {data.length}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">#</TableHead>
                            <TableHead>LAM ID / Reason</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead className="text-right">When</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                    No push backs today.
                                </TableCell>
                            </TableRow>
                        )}
                        {data.map((item) => (
                            <TableRow
                                key={item.lamId}
                                onClick={() => navigate("/loans/monitoring")}
                                className="cursor-pointer"
                            >
                                <TableCell className="font-medium tabular-nums">#{item.number}</TableCell>
                                <TableCell>
                                    <p className="font-mono text-xs font-medium">{item.lamId}</p>
                                    <p className="text-xs text-red-600">{item.reason}</p>
                                </TableCell>
                                <TableCell>{item.branch}</TableCell>
                                <TableCell
                                    className="text-right text-xs text-muted-foreground"
                                    title={new Date(item.date).toLocaleString("en-PH")}
                                >
                                    {formatRelativeTime(item.date)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}