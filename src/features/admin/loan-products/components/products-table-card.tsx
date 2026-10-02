import { FlexRender } from '@tanstack/react-table'
import { Database } from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/card'
import { Spinner } from '@/src/shared/ui/spinner'
import { EmptyState, ErrorState } from '@/src/shared/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/table'
import { cn } from '@/src/shared/lib/utils'
import { TablePagination } from '@/src/shared/ui/table-pagination'
import { ProductsToolbar, type ProductsToolbarProps } from './products-toolbar'

interface ProductsTableCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any
  columnCount: number
  isLoading: boolean
  isError: boolean
  errorMessage: string
  isFetching: boolean
  totalRows: number
  firstRow: number
  lastRow: number
  totalPages: number
  pagination: { pageIndex: number; pageSize: number }
  globalFilter: string
  setPagination: React.Dispatch<
    React.SetStateAction<{ pageIndex: number; pageSize: number }>
  >
  setGlobalFilter: (value: string) => void
  onRetry: () => void
  toolbarProps: ProductsToolbarProps
}

export function ProductsTableCard({
  table,
  columnCount,
  isLoading,
  isError,
  errorMessage,
  isFetching,
  totalRows,
  firstRow,
  lastRow,
  totalPages,
  pagination,
  globalFilter,
  setPagination,
  setGlobalFilter,
  onRetry,
  toolbarProps,
}: ProductsTableCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database
              size={18}
              weight="bold"
              className="text-muted-foreground"
            />
            Loan Product Catalog
            <Badge variant="outline" className="ml-1 font-normal">
              {totalRows} {totalRows === 1 ? 'product' : 'products'}
            </Badge>
            {isFetching && !isLoading && (
              <Spinner className="ml-1 size-3 text-muted-foreground" />
            )}
          </CardTitle>

          <ProductsToolbar {...toolbarProps} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow
                key={headerGroup.id}
                className="border-b hover:bg-transparent"
              >
                {headerGroup.headers.map((header: any) => (
                  <TableHead
                    key={header.id}
                    className="h-9 px-4 text-xs font-semibold text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : (
                      <FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    <span>Loading loan products…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <ErrorState message={errorMessage} onRetry={onRetry} />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row: any) => (
                <TableRow
                  key={row.id}
                  onClick={() =>
                    table.options.meta?.onEditProduct?.(row.original)
                  }
                  className={cn(
                    'cursor-pointer transition-colors hover:bg-muted/30',
                    row.original.isRetired && 'opacity-70',
                  )}
                >
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell
                      key={cell.id}
                      className="h-14 px-4 py-2 align-middle"
                    >
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <EmptyState
                    icon={Database}
                    title="No loan products found"
                    hint={
                      globalFilter
                        ? 'No products match your search query. Try searching with a different term.'
                        : 'No active loan products. Enable "Include retired" to view inactive products, or run a manual sync.'
                    }
                    action={
                      globalFilter ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGlobalFilter('')}
                        >
                          Clear search
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <TablePagination
        firstRow={firstRow}
        lastRow={lastRow}
        totalRows={totalRows}
        currentPage={pagination.pageIndex + 1}
        totalPages={totalPages}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onPreviousPage={() =>
          setPagination((p) => ({
            ...p,
            pageIndex: Math.max(0, p.pageIndex - 1),
          }))
        }
        onNextPage={() =>
          setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
        }
      />
    </Card>
  )
}