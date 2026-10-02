import { FlexRender } from '@tanstack/react-table'
import { Users } from '@phosphor-icons/react'

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
import { TablePagination } from '@/src/shared/ui/table-pagination'
import { UsersToolbar, type UsersToolbarProps } from './users-toolbar'

interface UsersTableCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any
  columnCount: number
  isLoading: boolean
  isError: boolean
  errorMessage: string
  isFetching: boolean
  totalRows: number
  firstRowIndex: number
  lastRowIndex: number
  currentPage: number
  totalPages: number
  canPreviousPage: boolean
  canNextPage: boolean
  search: string
  roleFilter: string
  branchFilter: string
  canCreateUsers: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onRetry: () => void
  onClearFilters: () => void
  onCreateUser: () => void
  toolbarProps: UsersToolbarProps
}

export function UsersTableCard({
  table,
  columnCount,
  isLoading,
  isError,
  errorMessage,
  isFetching,
  totalRows,
  firstRowIndex,
  lastRowIndex,
  currentPage,
  totalPages,
  canPreviousPage,
  canNextPage,
  search,
  roleFilter,
  branchFilter,
  canCreateUsers,
  onPreviousPage,
  onNextPage,
  onRetry,
  onClearFilters,
  onCreateUser,
  toolbarProps,
}: UsersTableCardProps) {
  const hasFilters = search.trim() || roleFilter !== 'all' || branchFilter !== 'all'

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            User Directory
            <Badge variant="outline" className="font-normal">
              {totalRows} records
            </Badge>
          </CardTitle>

          <UsersToolbar {...toolbarProps} />
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
                <TableCell
                  colSpan={columnCount}
                  className="py-12 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-4" />
                    <span>Loading user accounts…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <ErrorState message={errorMessage} onRetry={onRetry} />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="h-12 px-4 py-2">
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <EmptyState
                    icon={Users}
                    title="No users found"
                    hint={
                      hasFilters
                        ? 'No user accounts match your search or filter criteria. Try adjusting or clearing your filters.'
                        : 'There are currently no registered users in this directory.'
                    }
                    action={
                      hasFilters ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onClearFilters}
                        >
                          Clear filters
                        </Button>
                      ) : canCreateUsers ? (
                        <Button
                          size="sm"
                          onClick={onCreateUser}
                          className="gap-2"
                        >
                          Create User
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
        firstRow={firstRowIndex}
        lastRow={lastRowIndex}
        totalRows={totalRows}
        currentPage={currentPage}
        totalPages={totalPages}
        canPreviousPage={canPreviousPage}
        canNextPage={canNextPage}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
        isFetching={isFetching}
      />
    </Card>
  )
}