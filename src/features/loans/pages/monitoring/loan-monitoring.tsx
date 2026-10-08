import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearch, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { MonitoringToolbar } from './components/monitoring-toolbar'
import { MonitoringTable } from './components/monitoring-table'
import { LoanDetailsDrawer } from './components/loan-details-drawer'
import { Card } from '@/src/shared/ui/data-display/card'
import { Textarea } from '@/src/shared/ui/primitives/textarea'
import { Label } from '@/src/shared/ui/primitives/label'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/src/shared/ui/feedback/alert-dialog'
import type { MonitoringFilters } from '@/src/features/loans/types/monitoring'
import type { LoanMonitoringRecord } from '@/src/features/loans/types/monitoring'
import {
  useSlaPolicy,
  useQueueDefault,
} from '@/src/features/loans/api/loan-review'
import { cancelLoanApplication } from '@/src/features/loans/api/loan-review'
import { useAuthStore } from '@/src/shared/store/auth-store'
import {
  queueDefaultForRole,
  sameStatusSet,
} from '@/src/features/loans/constants/role-queues'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import type { LoanStatus } from '@/src/features/loans/model/loan-status'
import { LOAN_STATUS_META } from '@/src/features/loans/model/loan-status'

export function LoanMonitoringPage() {
  const role = useAuthStore((s) => s.user?.role)
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as {
    status?: string
    id?: string
    flagged?: string
  }
  const slaPolicy = useSlaPolicy()
  const queueDefault = useQueueDefault()

  const urlStatus = useMemo(() => {
    const raw = search.status
    if (!raw) return null
    return raw.split(',').filter((s): s is LoanStatus => s in LOAN_STATUS_META)
    // Intentionally read once from the initial URL, matching prior behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [filters, setFilters] = useState<MonitoringFilters>(() => ({
    search: '',
    dateRange: { from: undefined, to: undefined },
    branchCode: 'all',
    status: urlStatus ?? [],
    myTurn: false,
  }))

  const touchedRef = useRef(urlStatus !== null)
  const handleFiltersChange = (next: MonitoringFilters) => {
    touchedRef.current = true
    setFilters(next)
  }

  useEffect(() => {
    const policy = queueDefault.data
    if (!policy || touchedRef.current || urlStatus !== null) return
    setFilters((f: MonitoringFilters) =>
      sameStatusSet(f.status, policy) ? f : { ...f, status: policy },
    )
  }, [queueDefault.data, urlStatus])

  useEffect(() => {
    navigate({
      search: ((prev: Record<string, unknown>) => {
        const next = { ...prev }
        if (filters.status.length > 0) next.status = filters.status.join(',')
        else delete next.status
        return next
      }) as never,
      replace: true,
    })
  }, [filters.status])

  const initialId = Number(search.id)
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(
    Number.isFinite(initialId) && initialId > 0 ? initialId : null,
  )
  const [selectedRecord, setSelectedRecord] =
    useState<LoanMonitoringRecord | null>(null)

  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean
    record: LoanMonitoringRecord | null
    reason: string
    pending: boolean
  }>({ open: false, record: null, reason: '', pending: false })

  return (
    <div className="flex min-w-0 flex-1 min-h-0 flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-none rounded-none">
        <MonitoringToolbar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          roleQueue={queueDefaultForRole(role)}
        />
        <MonitoringTable
          filters={filters}
          onRowClick={(r) => {
            if (r.id !== undefined) {
              setSelectedLoanId(r.id)
              setSelectedRecord(r)
            }
          }}
          slaPolicy={slaPolicy.data ?? null}
          currentUser={
            user
              ? {
                  id: Number(user.userId),
                  role: user.role,
                  name:
                    [user.firstName, user.middleName, user.lastName]
                      .filter(Boolean)
                      .join(' ') || undefined,
                }
              : null
          }
          onCancel={(r) =>
            setCancelDialog({
              open: true,
              record: r,
              reason: '',
              pending: false,
            })
          }
        />
      </Card>

      <LoanDetailsDrawer
        applicationId={selectedLoanId}
        record={selectedRecord}
        onClose={() => {
          setSelectedLoanId(null)
          setSelectedRecord(null)
        }}
      />

      {}
      <AlertDialog
        open={cancelDialog.open}
        onOpenChange={(o) => setCancelDialog((d) => ({ ...d, open: o }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this application?</AlertDialogTitle>
            <AlertDialogDescription>
              The client has withdrawn their application for{' '}
              <strong>{cancelDialog.record?.customerName}</strong> (
              <code>{cancelDialog.record?.formNumber}</code>). The application
              will be closed and the reviewer currently handling it will be
              notified. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Reason for cancellation *</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              placeholder="e.g. Client found financing elsewhere…"
              value={cancelDialog.reason}
              onChange={(e) =>
                setCancelDialog((d) => ({ ...d, reason: e.target.value }))
              }
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {cancelDialog.reason.trim().length}/2000 — minimum 10
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setCancelDialog((d) => ({ ...d, open: false }))}
            >
              Keep application
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                cancelDialog.pending || cancelDialog.reason.trim().length < 10
              }
              onClick={async () => {
                if (!cancelDialog.record?.id) return
                setCancelDialog((d) => ({ ...d, pending: true }))
                try {
                  await cancelLoanApplication(
                    cancelDialog.record.id,
                    cancelDialog.reason.trim(),
                  )
                  toastSuccess('Application cancelled.')
                  setCancelDialog({
                    open: false,
                    record: null,
                    reason: '',
                    pending: false,
                  })
                  qc.invalidateQueries({ queryKey: loanKeys.all })
                } catch (e) {
                  toastError(
                    e instanceof Error ? e.message : 'Could not cancel.',
                  )
                  setCancelDialog((d) => ({ ...d, pending: false }))
                }
              }}
            >
              {cancelDialog.pending ? 'Cancelling…' : 'Cancel application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
