import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSimple, Plus } from '@phosphor-icons/react'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/src/shared/ui/data-display/card'
import { Badge } from '@/src/shared/ui/primitives/badge'
import { Button } from '@/src/shared/ui/primitives/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/shared/ui/data-display/table'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import { EmptyState, ErrorState } from '@/src/shared/ui/feedback/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/shared/ui/navigation/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/shared/ui/feedback/alert-dialog'
import {
  approvalAuthorityKeys,
  createApprovalAuthority,
  deactivateApprovalAuthority,
  getApprovalAuthorities,
  listApproverUsers,
  SCOPE_LABELS,
  SEVERITY_LABELS,
  setApprovalAuthorityUsers,
  updateApprovalAuthority,
  type ApprovalAuthorityDto,
  type AuthorityLimitsPayload,
} from '../api/approval-authorities'
import { AuthorityCreateSheet } from './authority-create-sheet'
import { AuthorityEditSheet } from './authority-edit-sheet'
import { ApproverAssignmentSheet } from './approver-assignment-sheet'

export function ApprovalAuthoritiesTable() {
  const qc = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ApprovalAuthorityDto | null>(null)
  const [assigning, setAssigning] = useState<ApprovalAuthorityDto | null>(null)
  const [deactivating, setDeactivating] = useState<ApprovalAuthorityDto | null>(
    null,
  )

  const authorities = useQuery({
    queryKey: approvalAuthorityKeys.list(),
    queryFn: getApprovalAuthorities,
    staleTime: 30_000,
  })

  const approverUsers = useQuery({
    queryKey: approvalAuthorityKeys.approverUsers(),
    queryFn: listApproverUsers,
    staleTime: 60_000,
    enabled: assigning !== null,
  })

  const createMutation = useMutation({
    mutationFn: createApprovalAuthority,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      key,
      payload,
    }: {
      key: string
      payload: AuthorityLimitsPayload
    }) => updateApprovalAuthority(key, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateApprovalAuthority,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const assignUsersMutation = useMutation({
    mutationFn: ({ key, userIds }: { key: string; userIds: string[] }) =>
      setApprovalAuthorityUsers(key, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: approvalAuthorityKeys.list() })
    },
  })

  const handleCreate = async (payload: AuthorityLimitsPayload) => {
    try {
      await createMutation.mutateAsync(payload)
      toastSuccess('Approval authority created')
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  const handleUpdate = async (key: string, payload: AuthorityLimitsPayload) => {
    try {
      await updateMutation.mutateAsync({ key, payload })
      toastSuccess('Approval authority updated')
      return true
    } catch (e) {
      toastError(getErrorMessage(e))
      return false
    }
  }

  const handleDeactivate = async () => {
    if (!deactivating) return
    try {
      await deactivateMutation.mutateAsync(deactivating.key)
      toastSuccess('Approval authority deactivated')
      setDeactivating(null)
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  const handleAssign = async (userIds: string[]) => {
    if (!assigning) return
    try {
      await assignUsersMutation.mutateAsync({ key: assigning.key, userIds })
      toastSuccess('Approvers updated')
      setAssigning(null)
    } catch (e) {
      toastError(getErrorMessage(e))
    }
  }

  const rows = authorities.data ?? []

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              Approval Authorities
              <Badge variant="outline" className="ml-1 font-normal">
                {rows.length} {rows.length === 1 ? 'authority' : 'authorities'}
              </Badge>
            </CardTitle>
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={14} weight="bold" data-icon="inline-start" />
              New authority
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b hover:bg-transparent">
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                  Authority
                </TableHead>
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                  Tier
                </TableHead>
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                  Scope
                </TableHead>
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                  Max exposure
                </TableHead>
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                  Max severity
                </TableHead>
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                  Allows
                </TableHead>
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground">
                  Approvers
                </TableHead>
                <TableHead className="h-9 px-4 text-xs font-semibold text-muted-foreground" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {authorities.isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-4" /> Loading authorities…
                    </div>
                  </TableCell>
                </TableRow>
              ) : authorities.isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <ErrorState
                      message={getErrorMessage(authorities.error)}
                      onRetry={() => authorities.refetch()}
                    />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      title="No approval authorities"
                      hint="Create one to start routing approvals."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.key}>
                    <TableCell className="px-4 py-2 font-medium">
                      {a.displayName}
                    </TableCell>
                    <TableCell className="px-4 py-2 tabular-nums">
                      Tier {a.tier}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {SCOPE_LABELS[a.scopeType]}
                    </TableCell>
                    <TableCell className="px-4 py-2 tabular-nums">
                      ₱{a.maxTotalExposure.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      {SEVERITY_LABELS[a.maxSeverity]}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-xs text-muted-foreground">
                      {[a.allowNew && 'New', a.allowRenewal && 'Renewal']
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {a.assignedUsers.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            None
                          </span>
                        ) : (
                          a.assignedUsers.map((u) => (
                            <Badge
                              key={u.userId}
                              variant="outline"
                              className="font-normal"
                            >
                              {u.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-2">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${a.displayName}`}
                              />
                            }
                          >
                            <PencilSimple size={16} />
                            <span className="sr-only">Open menu</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(a)}>
                              Edit limits
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAssigning(a)}>
                              Manage approvers
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeactivating(a)}
                            >
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AuthorityCreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
      <AuthorityEditSheet
        authority={editing}
        onClose={() => setEditing(null)}
        onUpdate={handleUpdate}
      />
      <ApproverAssignmentSheet
        authority={assigning}
        users={approverUsers.data ?? []}
        isLoading={approverUsers.isLoading || approverUsers.isFetching}
        isPending={assignUsersMutation.isPending}
        onClose={() => setAssigning(null)}
        onSave={handleAssign}
      />
      <AlertDialog
        open={deactivating !== null}
        onOpenChange={(o) => !o && setDeactivating(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {deactivating?.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deactivation is blocked while open loans still reference this
              tier. Existing history is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deactivateMutation.isPending}
              onClick={handleDeactivate}
            >
              {deactivateMutation.isPending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
