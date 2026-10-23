import { FlexRender, type ReactTable } from '@tanstack/react-table'
import type { ApprovalAuthorityDto } from '../api/approval-authorities'
import { features, type ApprovalAuthoritiesTableMeta } from './approval-authority-columns'
import { ShieldCheck } from '@phosphor-icons/react'

import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { EmptyState, ErrorState } from '@/src/shared/ui/feedback/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/data-display/table'
import { TablePagination } from '@/src/shared/ui/data-display/table-pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/shared/ui/navigation/dropdown-menu'
import { PencilSimple, Users, Trash } from '@phosphor-icons/react'
import { ApprovalAuthorityToolbar, type ApprovalAuthorityToolbarProps } from './approval-authority-toolbar'

interface ApprovalAuthoritiesTableCardProps {
  table: ReactTable<typeof features, ApprovalAuthorityDto>
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
  toolbarProps: ApprovalAuthorityToolbarProps
}

export function ApprovalAuthoritiesTableCard({
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
}: ApprovalAuthoritiesTableCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck
              size={18}
              weight="bold"
              className="text-muted-foreground"
            />
            Approval Authorities
            <Badge variant="outline" className="ml-1 font-normal">
              {totalRows} {totalRows === 1 ? 'authority' : 'authorities'}
            </Badge>
            {isFetching && !isLoading && (
              <Spinner className="ml-1 size-3 text-muted-foreground" />
            )}
          </CardTitle>

          <ApprovalAuthorityToolbar {...toolbarProps} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b hover:bg-transparent"
              >
                {headerGroup.headers.map((header) => (
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
                    <span>Loading approval authorities…</span>
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer transition-colors hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="h-14 px-4 py-2 align-middle"
                    >
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                  <TableCell className="px-4 py-2">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${row.original.displayName}`}
                            />
                          }
                        >
                          <PencilSimple size={16} />
                          <span className="sr-only">Open menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              (table.options.meta as ApprovalAuthoritiesTableMeta | undefined)?.onEdit?.(row.original)
                            }
                          >
                            <PencilSimple size={14} /> Edit limits
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              (table.options.meta as ApprovalAuthoritiesTableMeta | undefined)?.onAssign?.(row.original)
                            }
                          >
                            <Users size={14} /> Manage approvers
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              (table.options.meta as ApprovalAuthoritiesTableMeta | undefined)?.onDeactivate?.(row.original)
                            }
                          >
                            <Trash size={14} /> Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <EmptyState
                    icon={ShieldCheck}
                    title="No approval authorities"
                    hint={
                      globalFilter
                        ? 'No authorities match your search query.'
                        : 'Create one to start routing approvals.'
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
        isFetching={isFetching}
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
