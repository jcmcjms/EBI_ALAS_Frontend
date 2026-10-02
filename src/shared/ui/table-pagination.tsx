import { Button } from '@/src/shared/ui/button'

interface TablePaginationProps {
  firstRow: number
  lastRow: number
  totalRows: number
  currentPage: number
  totalPages: number
  canPreviousPage: boolean
  canNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  isFetching?: boolean
  entityLabel?: string
}

export function TablePagination({
  firstRow,
  lastRow,
  totalRows,
  currentPage,
  totalPages,
  canPreviousPage,
  canNextPage,
  onPreviousPage,
  onNextPage,
  isFetching = false,
  entityLabel = 'entries',
}: TablePaginationProps) {
  return (
    <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
      <div>
        Showing {firstRow}–{lastRow} of {totalRows}{' '}
        {totalRows === 1 ? entityLabel.replace(/s$/, '') : entityLabel}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={onPreviousPage}
          disabled={!canPreviousPage || isFetching}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="xs"
          onClick={onNextPage}
          disabled={!canNextPage || isFetching}
        >
          Next
        </Button>
      </div>
    </div>
  )
}