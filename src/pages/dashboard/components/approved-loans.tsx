import { useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { formatRelativeTime, initialsOf } from "@/src/lib/notifications";
import type { ApprovedLoanItem } from "../types";

interface ApprovedLoansProps {
    data: ApprovedLoanItem[];
}

export function ApprovedLoans({ data }: ApprovedLoansProps) {
    const navigate = useNavigate();

    return (
        <Card id="approved-loans" className="scroll-mt-24">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                    Approved Loans
                    <Badge variant="secondary" className="tabular-nums">{data.length}</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/loans/monitoring")}>
                    View all
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Borrower</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead className="text-right">When</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                                    No approvals yet today.
                                </TableCell>
                            </TableRow>
                        )}
                        {data.map((item) => (
                            <TableRow key={item.lamId} onClick={() => navigate("/loans/monitoring")} className="cursor-pointer">
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <Avatar size="sm">
                                            <AvatarFallback>{initialsOf(item.fullName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{item.fullName}</p>
                                            <p className="truncate font-mono text-xs text-muted-foreground">{item.lamId}</p>
                                        </div>
                                    </div>
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