import { useMemo, useState } from "react";
import {
	createColumnHelper,
	tableFeatures,
	useTable,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	filterFn_includesString,
	FlexRender,
	type SortingState,
	type PaginationState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/src/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
	MagnifyingGlass,
	Pencil,
	Trash,
	DotsThreeVertical,
	CaretLeft,
	CaretRight,
	CaretDoubleLeft,
	CaretDoubleRight,
} from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils";
import type { LoanProduct } from "../types";

const features = tableFeatures({
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: { includesString: filterFn_includesString },
});

const columnHelper = createColumnHelper<typeof features, LoanProduct>();

interface ProductsTableProps {
	data: LoanProduct[];
	onEdit: (product: LoanProduct) => void;
}

export function ProductsTable({ data, onEdit }: ProductsTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("productId", {
					header: "Product ID",
					cell: (info) => <span className="font-medium text-foreground text-sm">{info.getValue()}</span>,
				}),
				columnHelper.accessor("description", {
					header: "Description",
					cell: (info) => <span className="text-sm">{info.getValue()}</span>,
				}),
				columnHelper.accessor(
					(row) => `\u20B1${row.minLoanableAmount.toLocaleString()} - \u20B1${row.maxLoanableAmount.toLocaleString()}`,
					{
						id: "amountRange",
						header: "Loan Amount Range",
						cell: (info) => <span className="text-sm whitespace-nowrap">{info.getValue()}</span>,
					},
				),
				columnHelper.accessor(
					(row) => `${row.minLoanTerm} - ${row.maxLoanTerm} mos`,
					{
						id: "termRange",
						header: "Term Range",
						cell: (info) => <span className="text-sm">{info.getValue()}</span>,
					},
				),
				columnHelper.accessor("status", {
					header: "Status",
					cell: (info) => {
						const status = info.getValue();
						const isActive = status === "Active";
						const isDraft = status === "Draft";
						return (
							<Badge
								variant="outline"
								className={cn(
									"font-normal text-xs",
									isActive
										? "border-emerald-600/25 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400"
										: isDraft
											? "border-amber-600/25 bg-amber-500/10 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400"
											: "border-red-600/25 bg-red-500/10 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400"
								)}
							>
								{status}
							</Badge>
						);
					},
				}),
				columnHelper.display({
					id: "actions",
					header: "",
					cell: (info) => {
						const product = info.row.original;
						return (
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${product.productId}`} />
									}
								>
									<DotsThreeVertical size={16} weight="bold" />
									<span className="sr-only">Open menu</span>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-[200px]">
									<DropdownMenuItem onClick={() => onEdit(product)}>
										<Pencil size={14} /> Edit Configuration
									</DropdownMenuItem>
									<DropdownMenuItem variant="destructive">
										<Trash size={14} /> Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						);
					},
				}),
			]),
		[onEdit],
	);

	const table = useTable({
		features,
		data,
		columns,
		getRowId: (row) => row.productId,
		state: {
			sorting,
			globalFilter,
			pagination,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: setPagination,
		globalFilterFn: "includesString",
	});

	const totalRows = table.getFilteredRowModel().rows.length;
	const firstRowIndex = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
	const lastRowIndex = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows);

	return (
		<div className="space-y-4">
			<Card className="border shadow-sm">
				<CardHeader className="border-b bg-muted/30 pb-3">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<CardTitle className="flex items-center gap-2 text-lg">
							Loan Products
							<Badge variant="outline" className="font-normal">{totalRows} records</Badge>
						</CardTitle>

						<div className="flex items-center gap-2">
							<div className="relative">
								<MagnifyingGlass size={16} weight="bold" className="absolute top-2.5 left-2.5 text-muted-foreground" />
								<Input
									placeholder="Search product ID or description..."
									value={globalFilter ?? ""}
									onChange={(e) => setGlobalFilter(e.target.value)}
									className="h-9 w-full bg-background pl-8 sm:w-[280px]"
								/>
							</div>
						</div>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<Table>
						<TableHeader className="bg-muted/40">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id} className="border-b hover:bg-transparent">
									{headerGroup.headers.map((header) => (
										<TableHead key={header.id} className="h-9 px-4 text-xs font-semibold text-muted-foreground">
											{header.isPlaceholder ? null : <FlexRender header={header} />}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows?.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id} className="transition-colors hover:bg-muted/30">
										{row.getAllCells().map((cell) => (
											<TableCell key={cell.id} className="h-12 px-4 py-2">
												<FlexRender cell={cell} />
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
										No loan products found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>

				{/* Pagination */}
				<div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
					<div>
						Showing {firstRowIndex} to {lastRowIndex} of {totalRows} entries
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="xs"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							<CaretDoubleLeft size={12} />
						</Button>
						<Button
							variant="outline"
							size="xs"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<CaretLeft size={12} />
						</Button>
						<span>Page {table.state.pagination.pageIndex + 1} of {table.getPageCount()}</span>
						<Button
							variant="outline"
							size="xs"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<CaretRight size={12} />
						</Button>
						<Button
							variant="outline"
							size="xs"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							<CaretDoubleRight size={12} />
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
}
