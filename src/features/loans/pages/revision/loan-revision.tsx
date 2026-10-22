import { useCallback, useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, WarningCircle } from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/primitives/button'
import {
  Card,
  CardContent,
} from '@/src/shared/ui/data-display/card'
import { Spinner } from '@/src/shared/ui/feedback/spinner'
import {
  toastError,
  toastSuccess,
} from '@/src/shared/ui/feedback/toast'
import { getErrorMessage } from '@/src/shared/lib/apiClient'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useBranches, findBranchName } from '@/src/shared/lib/api/branches'

import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { getLoanDetail, getRevisionRequests } from '@/src/features/loans/api/loan-review'
import { reviseLoan } from '@/src/features/loans/api/loan-revise'
import {
  loanApplicationSchema,
  type LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import { mapLoanDetailToFormData } from '@/src/features/loans/model/map-detail-to-form'
import { mapFormToReviseCommand } from '@/src/features/loans/model/map-form-to-revise'
import {
  SECTIONS,
  type SectionId,
} from '@/src/features/loans/constants/sections'
import { LOAN_STATUS_META, type LoanStatus } from '@/src/features/loans/model/loan-status'
import { ActiveLoanProvider } from '../create/active-loan-context'
import { LoanTransfersProvider } from '../create/loan-transfers-provider'
import { LoanFormSections } from '../create/loan-form-sections'
import {
  buildEditableSectionIds,
  isSectionEditable,
} from './section-lock'
import { RevisionSidebar } from './revision-sidebar'
import { cn } from '@/src/shared/lib/utils'

function statusLabel(status?: string): string {
  if (!status) return 'Draft'
  return LOAN_STATUS_META[status as LoanStatus]?.label ?? status
}

export function LoanRevisionPage() {
  const params = useParams({ strict: false }) as { loanId?: string }
  const loanId = params.loanId ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const loanQuery = useQuery({
    queryKey: loanKeys.review.detail(loanId),
    queryFn: () => getLoanDetail(loanId),
    enabled: loanId.length > 0,
  })

  const revisionQuery = useQuery({
    queryKey: loanKeys.revisionRequests(loanId),
    queryFn: () => getRevisionRequests(loanId),
    enabled: loanId.length > 0,
  })

  const userBranchId = useAuthStore((s) => s.user?.branchId ?? '')
  const { data: branches } = useBranches()
  const userBranchName = findBranchName(branches, userBranchId) || userBranchId

  const methods = useForm<LoanApplicationFormData>({
    resolver: zodResolver(
      loanApplicationSchema,
    ) as Resolver<LoanApplicationFormData>,
    mode: 'onBlur',
    defaultValues: {
      branchType: {
        creationTypeCode: null,
        creationTypeLabel: '',
        branch: '',
        requestingOfficer: '',
        lai: '',
      },
      client: {
        cisId: '',
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        birthdate: '',
        address: '',
        agency: '',
        position: '',
        employeeId: '',
        netTakeHomePay: 0,
        lengthOfService: '',
        region: '',
        divisionCode: '',
        stationCode: '',
        misAgency: '',
        school: '',
        referrer: '',
      },
      loans: [],
      outstandingLoans: [],
      preLoan: undefined,
      loanType: 'New',
    },
  })

  const [notes, setNotes] = useState('')
  const [notesError, setNotesError] = useState<string | undefined>()
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const registerSectionRef = useCallback(
    (id: SectionId, el: HTMLElement | null) => {
      sectionRefs.current[id] = el
    },
    [],
  )
  const approvalFormRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (loanQuery.data) {
      methods.reset(mapLoanDetailToFormData(loanQuery.data))
    }
  }, [loanQuery.data, methods])

  const cisId = useWatch({ control: methods.control, name: 'client.cisId' }) ?? ''
  const isClientLoaded = cisId.length > 0
  const loans = useWatch({ control: methods.control, name: 'loans' }) ?? []
  const branchTypeCode = useWatch({
    control: methods.control,
    name: 'branchType.creationTypeCode',
  })

  const editableIds = buildEditableSectionIds(revisionQuery.data ?? [])
  const canRevise = loanQuery.data?.status === 'ForRevision'
  const isEditable = useCallback(
    (id: SectionId) => canRevise && isSectionEditable(id, editableIds),
    [canRevise, editableIds],
  )
  // Focused revision: only render sections that need correction (e.g. Deviations).
  const onlySectionIds =
    editableIds.size > 0 ? ([...editableIds] as SectionId[]) : undefined

  const reviseMutation = useMutation({
    mutationFn: (command: ReturnType<typeof mapFormToReviseCommand>) =>
      reviseLoan(loanId, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: loanKeys.all })
      toastSuccess('Corrections submitted. Application returned to the workflow.')
      navigate({ to: '/loans/monitoring' })
    },
    onError: (error) => {
      const message = getErrorMessage(error)
      if (/modified by another user|row version|conflict/i.test(message)) {
        toastError('This application was modified by another user. Please reload.')
        queryClient.invalidateQueries({ queryKey: loanKeys.review.detail(loanId) })
        queryClient.invalidateQueries({ queryKey: loanKeys.revisionRequests(loanId) })
        return
      }
      toastError(message)
    },
  })

  const onSubmit = methods.handleSubmit((data) => {
    const trimmed = notes.trim()
    if (trimmed.length < 10) {
      setNotesError('Revision notes are required (min 10 characters).')
      return
    }
    setNotesError(undefined)
    if (!canRevise || reviseMutation.isPending) return
    reviseMutation.mutate(
      mapFormToReviseCommand(data, trimmed, loanQuery.data?.rowVersion ?? null),
    )
  })

  if (loanQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!loanQuery.data) {
    return (
      <div className="container mx-auto p-6 text-center text-destructive">
        Application not found.
      </div>
    )
  }

  const loan = loanQuery.data
  const statusMeta = LOAN_STATUS_META[loan.status as LoanStatus]

  return (
    <FormProvider {...methods}>
      <ActiveLoanProvider loans={loans}>
        <LoanTransfersProvider>
          <div className="min-h-[calc(100vh-var(--header-height))] bg-muted/40">
            <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
              <div className="container mx-auto flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate({ to: '/loans/monitoring' })}
                  >
                    <ArrowLeft size={20} weight="bold" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-semibold">
                      Revise Application: {loan.lamId}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Address evaluator feedback to resubmit
                      {userBranchName ? ` · ${userBranchName}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs',
                      statusMeta?.className,
                    )}
                  >
                    {statusLabel(loan.status)}
                  </span>
                </div>
                <Button
                  type="submit"
                  form="revision-form"
                  disabled={!canRevise || reviseMutation.isPending}
                >
                  {reviseMutation.isPending ? 'Submitting…' : 'Submit Corrections'}
                </Button>
              </div>
            </header>

            <div className="container mx-auto grid grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-3">
              <form
                id="revision-form"
                onSubmit={onSubmit}
                className="space-y-8 lg:col-span-2"
              >
                {!canRevise && (
                  <Card className="border-destructive bg-destructive/5">
                    <CardContent className="flex items-center gap-3 p-4 text-destructive">
                      <WarningCircle size={24} weight="fill" />
                      <p>
                        This application is currently{' '}
                        <strong>{statusLabel(loan.status)}</strong> and cannot be
                        edited.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {editableIds.size > 0 && (
                  <Card className="border-amber-300 bg-amber-50/60">
                    <CardContent className="p-4 text-sm text-amber-900">
                      Open correction targets:{' '}
                      {[...editableIds]
                        .map((id) => SECTIONS.find((s) => s.id === id)?.label ?? id)
                        .join(', ')}
                      . All other sections are locked.
                    </CardContent>
                  </Card>
                )}

                <LoanFormSections
                  isClientLoaded={isClientLoaded}
                  isSubmitting={reviseMutation.isPending}
                  branchTypeCode={branchTypeCode}
                  methods={methods}
                  registerSectionRef={registerSectionRef}
                  approvalFormRef={approvalFormRef}
                  onPreLoanChange={() => undefined}
                  clientConfirmed={isClientLoaded}
                  onConfirmClient={() => undefined}
                  onClientCleared={() => undefined}
                  isSectionEditable={isEditable}
                  onlySectionIds={onlySectionIds}
                />
              </form>

              <RevisionSidebar
                requests={revisionQuery.data ?? []}
                notes={notes}
                onNotesChange={(value) => {
                  setNotes(value)
                  if (notesError) setNotesError(undefined)
                }}
                notesError={notesError}
                disabled={!canRevise || reviseMutation.isPending}
              />
            </div>
          </div>
        </LoanTransfersProvider>
      </ActiveLoanProvider>
    </FormProvider>
  )
}

export default LoanRevisionPage
