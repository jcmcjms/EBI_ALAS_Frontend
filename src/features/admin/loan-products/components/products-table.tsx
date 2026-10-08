import { useMemo, useState } from 'react'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { useTable } from '@tanstack/react-table'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import {
  Card,
  CardContent,
} from '@/src/shared/ui/data-display/card'
import { PERMISSIONS } from '@/src/shared/lib/api/types'
import type { UpdateLoanProductPayload } from '../api/loan-product-types'
import { useAuthStore } from '@/src/shared/store/auth-store'
import {
  useLoanProducts,
  useSyncLoanProducts,
  useUpdateLoanProduct,
} from '../hooks/use-loan-products'
import { features, columns } from './product-columns'
import { ProductsTableCard } from './products-table-card'
import { ProductEditSheet } from './product-edit-sheet'
import { ImportProductsSheet } from './import-products-sheet'
import { ConfirmActionSheet } from '../../users/components/confirm-action-sheet'

interface ConfirmActionState {
  title: string
  description: string
  actionLabel: string
  destructive?: boolean
  onConfirm: () => void
}

export function ProductsTable() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canManageProducts = hasPermission(PERMISSIONS.loanProductManage)
  const canViewProducts = hasPermission(PERMISSIONS.loanProductView)

  const [showRetired, setShowRetired] = useState(false)
  const { data, isLoading, isError, error, isFetching, refetch } = useLoanProducts()
  const products = useMemo(
    () =>
      showRetired ? (data ?? []) : (data ?? []).filter((p) => !p.isRetired),
    [data, showRetired],
  )

  const updateMutation = useUpdateLoanProduct()
  const syncMutation = useSyncLoanProducts()

  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [editingCode, setEditingCode] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(
    null,
  )
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false)

  const editingProduct = useMemo(
    () =>
      editingCode !== null
        ? (products.find((p) => p.code === editingCode) ?? null)
        : null,
    [editingCode, products],
  )

  const table = useTable({
    features,
    data: products,
    columns,
    state: { globalFilter, pagination },
    globalFilterFn: 'includesString',
    meta: {
      onEditProduct: (product) => setEditingCode(product.code),
      onSyncNow: () => {
        if (!canManageProducts) {
          toastError('You need the loan_product.manage permission to sync.')
          return
        }
        setConfirmAction({
          title: 'Sync from webloan',
          description:
            'Pull the latest loan-product catalog from webloan. The sync will add new products, mark retired ones, and preserve your policy edits on existing rows.',
          actionLabel: 'Run Sync',
          onConfirm: () => {
            syncMutation.mutate(undefined, {
              onSuccess: (result) => {
                toastSuccess(
                  `Synced ${result.added + result.updated + result.preserved} products — ` +
                    `${result.added} added, ${result.updated} updated, ${result.preserved} preserved.`,
                )
              },
              onError: (e) => toastError(getErrorMessage(e)),
            })
            setConfirmAction(null)
          },
        })
      },
    },
  })

  const handleSave = async (
    productCode: string,
    values: UpdateLoanProductPayload,
  ): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ code: productCode, payload: values })
      toastSuccess(`Updated policy for "${productCode}".`)
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  if (!canViewProducts) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
          You do not have permission to view loan products.
        </CardContent>
      </Card>
    )
  }

  const totalRows = products.length
  const firstRow =
    totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const lastRow = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    totalRows,
  )
  const totalPages = table.getPageCount() || 1

  return (
    <>
      <div className="space-y-4">
        <ProductsTableCard
          table={table}
          columnCount={columns.length}
          isLoading={isLoading}
          isError={isError}
          errorMessage={getErrorMessage(error)}
          isFetching={isFetching}
          totalRows={totalRows}
          firstRow={firstRow}
          lastRow={lastRow}
          totalPages={totalPages}
          pagination={pagination}
          globalFilter={globalFilter}
          setPagination={setPagination}
          setGlobalFilter={setGlobalFilter}
          onRetry={() => refetch()}
          toolbarProps={{
            globalFilter,
            onGlobalFilterChange: (value) => {
              setGlobalFilter(value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            },
            showRetired,
            onShowRetiredChange: (value) => {
              setShowRetired(value)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            },
            canManageProducts,
            isSyncing: syncMutation.isPending,
            onSyncNow: () => table.options.meta?.onSyncNow?.(),
            onImport: () => setIsImportSheetOpen(true),
          }}
        />
      </div>

      <ProductEditSheet
        product={editingProduct}
        canEdit={canManageProducts}
        onClose={() => setEditingCode(null)}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
      <ConfirmActionSheet
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        actionLabel={confirmAction?.actionLabel ?? ''}
        destructive={confirmAction?.destructive}
        onConfirm={confirmAction?.onConfirm ?? (() => {})}
      />
      <ImportProductsSheet
        open={isImportSheetOpen}
        onClose={() => setIsImportSheetOpen(false)}
      />
    </>
  )
}