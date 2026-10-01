import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FormProvider,
  useForm,
  useWatch,
  useFormContext,
} from 'react-hook-form'
import type { FieldErrors, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowUp,
  CheckCircle,
  CloudCheck,
  IdentificationBadge,
  LockSimple,
  PaperPlaneTilt,
  WarningCircle,
} from '@phosphor-icons/react'
import { toastError } from '@/src/components/ui/toast'

import { Badge } from '@/src/components/ui/badge'
import { Button } from '@/src/components/ui/button'
import { cn } from '@/src/shared/lib/utils'
import { useAuthStore } from '@/src/store/authStore'
import { WEBLOAN_BRANCHES } from '@/src/lib/api/types'
import type { PreLoanItem } from '@/src/lib/api/types'

import {
  loanApplicationSchema,
  HidesOutstandingLoans,
  type LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import { ActiveLoanProvider } from './active-loan-context'
import { LoanTransfersProvider } from './loan-transfers-provider'
import { CISLookup } from './components/cis-lookup'
import { PersonalInfoSection } from './components/personal-info-section'
import { LoanParametersTabsSection } from './components/loan-parameters-tabs-section'
import { ObligationsSection } from './components/obligations-section'
import { OtherObligationsSection } from './components/other-obligations'
import { VerificationSection } from './components/verification-section'
import { DeviationsSection } from './components/deviations-section'
import { ApprovalFormPreview } from './components/approval-form-preview'
import { WorkflowOverview } from '@/src/features/loans/components/workflow-overview'
import { useCreateLoan } from '@/src/features/loans/hooks/use-create-loan'
import { mapFormToSubmissionPayload } from '@/src/features/loans/utils/map-form-to-request'

import {
  SECTIONS,
  type SectionId,
  type SectionDef,
} from '@/src/features/loans/constants/sections'

const SCROLL_OFFSET_PX = 96

type SectionStatus =
  'active' | 'complete' | 'auto' | 'error' | 'locked' | 'upcoming'

function countFieldErrors(node: unknown): number {
  if (!node || typeof node !== 'object') return 0
  const record = node as Record<string, unknown>
  if (typeof record.message === 'string') return 1
  return Object.values(record).reduce<number>(
    (sum, child) => sum + countFieldErrors(child),
    0,
  )
}

const LOAN_SCOPED_KEYS: Partial<Record<SectionId, string[]>> = {
  'loan-params': ['parameters'],
  'other-obligations': ['ebiReloans', 'buyOuts', 'incomingLoans'],
  verification: ['verification'],
  deviations: ['deviations'],
}

function sectionErrorCount(
  errors: FieldErrors<LoanApplicationFormData>,
  id: SectionId,
): number {
  const keys = LOAN_SCOPED_KEYS[id]
  if (keys) {
    const loanErrors = errors.loans
    if (!Array.isArray(loanErrors)) return 0
    return loanErrors.reduce<number>(
      (n, le) =>
        n +
        (le
          ? keys.reduce(
              (m, k) => m + countFieldErrors(le[k as keyof typeof le]),
              0,
            )
          : 0),
      0,
    )
  }
  switch (id) {
    case 'cis-lookup':
      return (
        countFieldErrors(errors.branchType) + countFieldErrors(errors.client)
      )
    case 'personal-info':
      return 0
    case 'obligations':
      return countFieldErrors(errors.outstandingLoans)
    case 'approval-form':
      return 0
    default:
      return 0
  }
}

function useSectionProgress(
  isClientLoaded: boolean,
  preLoanSelected: boolean,
  submitAttempted: boolean,
  activeSection: SectionId,
) {
  const { control, formState } = useFormContext<LoanApplicationFormData>()
  const branchType = useWatch({ control, name: 'branchType' })
  const loans = useWatch({ control, name: 'loans' })

  const isComplete = (id: SectionId): boolean => {
    switch (id) {
      case 'cis-lookup':
        return (
          isClientLoaded && !!branchType.requestingOfficer && preLoanSelected
        )
      case 'personal-info':
      case 'obligations':
      case 'other-obligations':
        return isClientLoaded
      case 'loan-params':
        if (!Array.isArray(loans) || loans.length === 0) return false
        return true
      case 'verification':
        if (!Array.isArray(loans) || loans.length === 0) return false
        return loans.every((l) => !!l?.verification?.findings?.trim())
      case 'deviations':
        if (!Array.isArray(loans) || loans.length === 0) return false
        return loans.every((l) => {
          const d = l?.deviations
          if (!d?.otherRemarks?.trim()) return false
          if (d.hasDeviations) {
            const details = d.deviationDetails ?? []
            if (details.length === 0) return false
            const justifications = d.deviationJustifications ?? {}
            return details.every(
              (reason) => (justifications[reason] ?? '').trim().length >= 5,
            )
          }
          return true
        })
      case 'approval-form':
        return isClientLoaded
    }
  }

  const getStatus = (section: SectionDef, index: number): SectionStatus => {
    if (submitAttempted && sectionErrorCount(formState.errors, section.id) > 0)
      return 'error'
    if (activeSection === section.id) return 'active'

    if (section.systemSourced) return isClientLoaded ? 'auto' : 'upcoming'
    if (isComplete(section.id)) return 'complete'
    if (!isClientLoaded && index > 0) return 'locked'
    return 'upcoming'
  }

  const errorCount = (id: SectionId) =>
    submitAttempted ? sectionErrorCount(formState.errors, id) : 0

  return { getStatus, errorCount, isComplete }
}

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === 'complete')
    return <CheckCircle size={20} weight="fill" className="text-primary" />
  if (status === 'error')
    return (
      <WarningCircle size={20} weight="fill" className="text-destructive" />
    )

  if (status === 'auto')
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <CloudCheck size={12} weight="bold" className="text-primary" />
        <span className="sr-only">Auto-populated</span>
      </div>
    )
  if (status === 'locked')
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/20">
        <LockSimple
          size={11}
          weight="bold"
          className="text-muted-foreground/50"
        />
      </div>
    )
  if (status === 'active')
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary">
        <div className="h-2 w-2 rounded-full bg-background" />
      </div>
    )
  return (
    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
  )
}

interface StepperProps {
  activeSection: SectionId
  isClientLoaded: boolean
  preLoanSelected: boolean
  submitAttempted: boolean
  onNavigate: (id: SectionId) => void

  visibleSections: readonly SectionDef[]
}

function DesktopStepper({
  activeSection,
  isClientLoaded,
  preLoanSelected,
  submitAttempted,
  onNavigate,
  visibleSections,
}: StepperProps) {
  const { getStatus, errorCount, isComplete } = useSectionProgress(
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    activeSection,
  )

  const readyCount = visibleSections.filter(
    (s) => isComplete(s.id) || (s.systemSourced && isClientLoaded),
  ).length

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-[calc(var(--header-height)+1rem)] space-y-6">
        {}
        <div className="space-y-2 px-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground">
              Application progress
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {readyCount} of {visibleSections.length} ready
            </span>
          </div>
          <div
            className="h-1 rounded-full bg-muted"
            role="progressbar"
            aria-label="Sections ready"
            aria-valuemin={0}
            aria-valuemax={visibleSections.length}
            aria-valuenow={readyCount}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${(readyCount / visibleSections.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {}
        <nav aria-label="Application sections" className="space-y-1">
          {visibleSections.map((section, index) => {
            const status = getStatus(section, index)
            const errors = errorCount(section.id)
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                disabled={status === 'locked'}
                aria-current={status === 'active' ? 'step' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all',
                  status === 'active'
                    ? 'border-l-4 border-primary bg-primary/5 pl-2 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  status === 'locked' &&
                    'cursor-not-allowed opacity-50 hover:bg-transparent',
                )}
              >
                <div className="flex w-6 shrink-0 items-center justify-center">
                  <StatusIcon status={status} />
                </div>
                <span className="min-w-0 flex-1 truncate">
                  {section.step}. {section.label}
                </span>
                {errors > 0 ? (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1 tabular-nums text-[10px]"
                  >
                    {errors}
                  </Badge>
                ) : status === 'auto' ? (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Auto
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

function MobileSectionNav({
  activeSection,
  isClientLoaded,
  preLoanSelected,
  submitAttempted,
  onNavigate,
  visibleSections,
}: StepperProps) {
  const { getStatus, errorCount } = useSectionProgress(
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    activeSection,
  )

  return (
    <div className="sticky top-[var(--header-height)] z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <nav aria-label="Application sections">
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
          {visibleSections.map((section, index) => {
            const status = getStatus(section, index)
            const errors = errorCount(section.id)
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                disabled={status === 'locked'}
                aria-current={status === 'active' ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  status === 'active'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : status === 'error'
                      ? 'border-destructive/40 bg-destructive/5 text-destructive'
                      : status === 'complete' || status === 'auto'
                        ? 'border-primary/30 bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground',
                  status === 'locked' && 'opacity-50',
                )}
              >
                {section.step}. {section.label}
                {errors > 0 && (
                  <span className="tabular-nums font-bold">({errors})</span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export function LoanCreationPage() {
  const userBranchId = useAuthStore((s) => s.user?.branchId ?? '')
  const userBranchName =
    WEBLOAN_BRANCHES.find((b) => b.code === userBranchId)?.name ?? userBranchId

  const [selectedPreLoan, setSelectedPreLoan] = useState<{
    id: string
    payload: PreLoanItem | null
  }>({ id: '', payload: null })

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

  const { handleSubmit, formState } = methods
  const { isDirty, errors } = formState
  const { control } = methods

  const cisId = useWatch({ control, name: 'client.cisId' }) ?? ''
  const isClientLoaded = cisId.length > 0

  const [activeSection, setActiveSection] = useState<SectionId>('cis-lookup')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const approvalFormRef = useRef<HTMLDivElement | null>(null)

  const { mutate: createLoan, isPending: isSubmitting } = useCreateLoan()

  useEffect(() => {
    if (!isClientLoaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActiveSection(entry.target.id as SectionId)
        })
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [isClientLoaded])

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.classList.add('print-form-only')
    return () => document.body.classList.remove('print-form-only')
  }, [])

  const scrollToSection = useCallback((id: SectionId) => {
    const element = sectionRefs.current[id]
    if (!element) return
    setActiveSection(id)
    const top = Math.max(
      0,
      element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX,
    )
    window.scrollTo({ top, behavior: 'smooth' })

    element
      .querySelector<HTMLElement>('[data-section-heading]')
      ?.focus({ preventScroll: true })
  }, [])

  const scrollToTop = useCallback(
    () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    [],
  )

  const onSubmit = useCallback(
    (data: LoanApplicationFormData) => {
      if (isSubmitting) return
      setSubmitAttempted(true)

      const userBranchId = useAuthStore.getState().user?.branchId ?? ''
      const mismatched = data.loans.filter(
        (l) => l.branchCode && l.branchCode !== userBranchId,
      )
      if (mismatched.length > 0) {
        toastError(
          `Loan branch (${mismatched[0].branchCode}) does not match your assigned branch (${userBranchId}). Only loans from your branch can be submitted.`,
        )
        return
      }

      createLoan(mapFormToSubmissionPayload(data))
    },
    [createLoan, isSubmitting],
  )

  const onInvalid = useCallback(
    (fieldErrors: FieldErrors<LoanApplicationFormData>) => {
      setSubmitAttempted(true)
      const total = SECTIONS.reduce(
        (n, s) => n + sectionErrorCount(fieldErrors, s.id),
        0,
      )
      const first = SECTIONS.find(
        (s) => sectionErrorCount(fieldErrors, s.id) > 0,
      )
      toastError(
        `${total} field${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} attention before submission.`,
      )
      if (first) scrollToSection(first.id)
    },
    [scrollToSection],
  )

  const handleFormSubmit = useCallback(
    (e?: React.BaseSyntheticEvent) => handleSubmit(onSubmit, onInvalid)(e),
    [handleSubmit, onSubmit, onInvalid],
  )

  const totalErrors = submitAttempted
    ? SECTIONS.reduce((n, s) => n + sectionErrorCount(errors, s.id), 0)
    : 0

  const branchTypeCode = useWatch({
    control,
    name: 'branchType.creationTypeCode',
  })

  const loans = useWatch({ control, name: 'loans' }) ?? []
  const preLoanSelected = loans.length > 0

  const hideOutstandingSection = HidesOutstandingLoans(branchTypeCode)

  const visibleSections = hideOutstandingSection
    ? SECTIONS.filter((s) => s.id !== 'obligations')
    : SECTIONS

  const stepperProps: StepperProps = {
    activeSection,
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    onNavigate: scrollToSection,
    visibleSections,
  }

  const canSubmit = isClientLoaded && preLoanSelected
  const firstErrorSection = submitAttempted
    ? SECTIONS.find((s) => sectionErrorCount(errors, s.id) > 0)
    : undefined

  return (
    <FormProvider {...methods}>
      <ActiveLoanProvider loans={loans}>
        {}
        <LoanTransfersProvider>
          <form
            onSubmit={handleFormSubmit}
            className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40"
          >
            {}
            <header className="border-b bg-background">
              <div className="container mx-auto flex h-16 items-center justify-between px-6">
                <div className="flex flex-wrap items-center gap-4">
                  <h1 className="text-xl font-semibold tracking-tight">
                    New Loan Application
                  </h1>
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-amber-200 bg-amber-50 py-1 text-amber-800"
                  >
                    <span
                      className="h-2 w-2 rounded-full bg-amber-500"
                      aria-hidden
                    />
                    Draft
                  </Badge>
                  {userBranchId && (
                    <Badge
                      variant="outline"
                      className="gap-1.5 border-primary/30 bg-primary/5 py-1 text-primary"
                      title="Preloans are filtered to this branch"
                    >
                      <IdentificationBadge size={12} weight="bold" />
                      <span>Branch</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{userBranchName}</span>
                    </Badge>
                  )}
                  {selectedPreLoan.payload && (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 py-1"
                      title="Attached preloan"
                    >
                      <LockSimple size={12} weight="bold" />
                      Preloan #{selectedPreLoan.payload.id}
                      {selectedPreLoan.payload.formNumber && (
                        <span className="text-[10px] text-muted-foreground">
                          · {selectedPreLoan.payload.formNumber}
                        </span>
                      )}
                    </Badge>
                  )}
                  {isDirty && (
                    <span className="animate-in fade-in text-xs text-muted-foreground">
                      Unsaved changes
                    </span>
                  )}
                </div>
              </div>
            </header>

            {}
            <MobileSectionNav {...stepperProps} />

            <div className="container mx-auto flex flex-1 gap-8 px-6 py-8">
              {}
              <DesktopStepper {...stepperProps} />

              {}
              <main className="mx-auto w-full max-w-4xl flex-1 space-y-8">
                <section
                  id="cis-lookup"
                  ref={(el) => {
                    sectionRefs.current['cis-lookup'] = el
                  }}
                >
                  <CISLookup
                    onPreLoanChange={(id, payload) => {
                      setSelectedPreLoan({ id, payload })
                      if (payload) {
                        methods.setValue('preLoan', {
                          id: payload.id,
                          accountNo: payload.accountNo,
                          bch: payload.bch,
                          formNumber: payload.formNumber ?? undefined,
                          productDescription:
                            payload.productDescription ?? undefined,
                        })
                      } else {
                        methods.setValue('preLoan', undefined)
                      }
                    }}
                  />
                </section>

                {isClientLoaded ? (
                  <fieldset
                    disabled={isSubmitting}
                    className="contents space-y-8"
                  >
                    <section
                      id="personal-info"
                      ref={(el) => {
                        sectionRefs.current['personal-info'] = el
                      }}
                    >
                      <PersonalInfoSection />
                    </section>

                    {}
                    <section
                      id="loan-params"
                      ref={(el) => {
                        sectionRefs.current['loan-params'] = el
                      }}
                    >
                      <LoanParametersTabsSection />
                    </section>

                    {!hideOutstandingSection && (
                      <section
                        id="obligations"
                        ref={(el) => {
                          sectionRefs.current['obligations'] = el
                        }}
                      >
                        <ObligationsSection />
                      </section>
                    )}
                    <section
                      id="other-obligations"
                      ref={(el) => {
                        sectionRefs.current['other-obligations'] = el
                      }}
                    >
                      <OtherObligationsSection />
                    </section>
                    <section
                      id="verification"
                      ref={(el) => {
                        sectionRefs.current['verification'] = el
                      }}
                    >
                      <VerificationSection />
                    </section>
                    <section
                      id="deviations"
                      ref={(el) => {
                        sectionRefs.current['deviations'] = el
                      }}
                    >
                      <DeviationsSection />
                    </section>

                    {}
                    <section
                      id="approval-form"
                      ref={(el) => {
                        sectionRefs.current['approval-form'] = el
                      }}
                    >
                      <ApprovalFormPreview ref={approvalFormRef} />
                    </section>
                  </fieldset>
                ) : (
                  <WorkflowOverview />
                )}

                {}
                <div className="h-24" />
              </main>
            </div>

            {}
            <footer className="sticky bottom-0 z-20 border-t bg-background/95 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto flex h-16 items-center justify-between px-6">
                {totalErrors > 0 ? (
                  <div
                    className="hidden items-center gap-1.5 text-sm text-destructive md:flex"
                    role="alert"
                  >
                    <WarningCircle size={16} weight="fill" />
                    <button
                      type="button"
                      onClick={() =>
                        firstErrorSection &&
                        scrollToSection(firstErrorSection.id)
                      }
                      className="underline-offset-4 hover:underline"
                    >
                      {totalErrors} field{totalErrors === 1 ? '' : 's'} need
                      {totalErrors === 1 ? 's' : ''} attention — jump to first
                    </button>
                  </div>
                ) : (
                  <p
                    id="submit-hint"
                    className="hidden text-sm text-muted-foreground md:block"
                  >
                    {!isClientLoaded
                      ? 'Search for a CIS number to begin.'
                      : !preLoanSelected
                        ? 'Select at least one loan to continue.'
                        : `${loans.length} loan${loans.length === 1 ? '' : 's'} selected. Ready for processing.`}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    size="lg"
                    className="gap-2 px-6"
                    disabled={!canSubmit || isSubmitting}
                    aria-describedby={canSubmit ? undefined : 'submit-hint'}
                  >
                    <PaperPlaneTilt size={16} weight="bold" />
                    {isSubmitting ? 'Submitting…' : 'Submit for Recommendation'}
                  </Button>
                </div>
              </div>
            </footer>

            {}
            {showScrollTop && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="fixed bottom-24 right-6 z-30 h-10 w-10 rounded-full shadow-lg"
                onClick={scrollToTop}
                aria-label="Scroll to top"
              >
                <ArrowUp size={18} weight="bold" />
              </Button>
            )}
          </form>
        </LoanTransfersProvider>
      </ActiveLoanProvider>
    </FormProvider>
  )
}
