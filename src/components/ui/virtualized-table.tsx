import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/src/components/ui/table";

/**
 * Props for the VirtualizedTable component.
 *
 * @template T - The type of data in each row
 */
interface VirtualizedTableProps<T> {
    /** Array of data items to display */
    data: T[];
    /** Column definitions */
    columns: ColumnDef<T>[];
    /** Estimated row height in pixels (default: 50) */
    estimateSize?: number;
    /** Number of rows to render outside the visible area (default: 20) */
    overscan?: number;
    /** Key extractor for stable React keys */
    getRowId: (item: T, index: number) => string | number;
    /** Optional callback when a row is clicked */
    onRowClick?: (item: T, index: number) => void;
    /** Optional className for the container */
    className?: string;
    /** Loading state */
    isLoading?: boolean;
    /** Empty state message */
    emptyMessage?: string;
}

/**
 * Column definition for VirtualizedTable.
 */
export interface ColumnDef<T> {
    /** Unique column identifier */
    id: string;
    /** Header label */
    header: string;
    /** Render function for cell content */
    cell: (item: T, index: number) => React.ReactNode;
    /** Optional column width (CSS value) */
    width?: string;
    /** Optional className for the column */
    className?: string;
    /** Optional header className */
    headerClassName?: string;
}

/**
 * Virtualized table component for rendering large datasets efficiently.
 *
 * Uses @tanstack/react-virtual to only render visible rows + overscan,
 * preventing performance degradation with 1000+ rows.
 *
 * @example
 * ```tsx
 * const columns: ColumnDef<Loan>[] = [
 *   { id: "id", header: "ID", cell: (loan) => loan.id },
 *   { id: "name", header: "Name", cell: (loan) => loan.name },
 *   { id: "amount", header: "Amount", cell: (loan) => formatCurrency(loan.amount) },
 * ];
 *
 * <VirtualizedTable
 *   data={loans}
 *   columns={columns}
 *   getRowId={(loan) => loan.id}
 *   estimateSize={60}
 *   onRowClick={(loan) => navigate(`/loans/${loan.id}`)}
 * />
 * ```
 */
export function VirtualizedTable<T>({
    data,
    columns,
    estimateSize = 50,
    overscan = 20,
    getRowId,
    onRowClick,
    className,
    isLoading = false,
    emptyMessage = "No results found.",
}: VirtualizedTableProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
    });

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead
                                    key={col.id}
                                    style={col.width ? { width: col.width } : undefined}
                                    className={col.headerClassName}
                                >
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                {columns.map((col) => (
                                    <TableCell key={col.id}>
                                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead
                                    key={col.id}
                                    style={col.width ? { width: col.width } : undefined}
                                    className={col.headerClassName}
                                >
                                    {col.header}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((col) => (
                            <TableHead
                                key={col.id}
                                style={col.width ? { width: col.width } : undefined}
                                className={col.headerClassName}
                            >
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
            </Table>
            <div
                ref={parentRef}
                className={`overflow-auto ${className ?? ""}`}
                style={{ maxHeight: "calc(100vh - 300px)" }}
                role="table"
                aria-label="Data table"
                aria-rowcount={data.length}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    <Table>
                        <TableBody>
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const item = data[virtualRow.index];
                                const rowId = getRowId(item, virtualRow.index);

                                return (
                                    <TableRow
                                        key={rowId}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        onClick={() => onRowClick?.(item, virtualRow.index)}
                                        className={onRowClick ? "cursor-pointer" : undefined}
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                        aria-rowindex={virtualRow.index + 1}
                                    >
                                        {columns.map((col) => (
                                            <TableCell key={col.id} className={col.className}>
                                                {col.cell(item, virtualRow.index)}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
