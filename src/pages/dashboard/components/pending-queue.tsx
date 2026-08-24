import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pendingQueueData } from "../data/dummy-data";

const statusVariant: Record<string, "default" | "warning" | "destructive" | "secondary"> = {
    "Pending": "secondary", "Under Review": "warning", "Awaiting Documents": "default", "Escalated": "destructive"
};

export function PendingQueue() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                    Pending Queue
                    <Badge variant="secondary">{pendingQueueData.length}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Position</TableHead>
                            <TableHead>LAM ID</TableHead>
                            <TableHead>Branch</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pendingQueueData.map((item) => (
                            <TableRow key={item.lamId}>
                                <TableCell className="font-medium">#{item.position}</TableCell>
                                <TableCell>{item.lamId}</TableCell>
                                <TableCell>{item.branch}</TableCell>
                                <TableCell><Badge variant={statusVariant[item.status] || "default"}>{item.status}</Badge></TableCell>
                                <TableCell className="text-right text-muted-foreground text-xs">{item.date}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}