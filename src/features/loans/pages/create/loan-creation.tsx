import { useCallback, useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import type { FieldErrors, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowUp,
  IdentificationBadge,
  LockSimple,
  PaperPlaneTilt,
  WarningCircle,
} from '@phosphor-icons/react'
import { toastError } from '@/src/shared/ui/toast'

import { Badge } from '@/src/shared/ui/badge'
import { Button } from '@/src/shared/ui/button'
import { useAuthStore } from '@/src/features/auth/store/authStore'
import { WEBLOAN_BRANCHES } from '@/src/shared/lib/api/types'
import type { PreLoanItem } from '@/src/shared/lib/api/types'

import {
  loanApplicationSchema,
  HidesOutstandingLoans,
  type LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import { ActiveLoanProvider } from './active-loan-context'
import { LoanTransfersProvider } from './loan-transfers-provider'
import { useCreateLoan } from '@/src/features/loans/hooks/use-create-loan'
import { mapFormToSubmissionPayload } from '@/src/features/loans/utils/map-form-to-request'

import {
  SECTIONS,
  type SectionId,
} from '@/src/features/loans/constants/sections'

import { sectionErrorCount } from './section-stepper-utils'
import { DesktopStepper, MobileSectionNav, type StepperProps } from './section-nav'
import { LoanFormSections } from './loan-form-sections'

const SCROLL_OFFSET_PX = 96

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
        <LoanTransfersProvider>
          <form
            onSubmit={handleFormSubmit}
            className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40"
          >
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

            <MobileSectionNav {...stepperProps} />

            <div className="container mx-auto flex flex-1 gap-8 px-6 py-8">
              <DesktopStepper {...stepperProps} />

              <LoanFormSections
                isClientLoaded={isClientLoaded}
                isSubmitting={isSubmitting}
                branchTypeCode={branchTypeCode}
                selectedPreLoan={selectedPreLoan}
                methods={methods}
                sectionRefs={sectionRefs}
                approvalFormRef={approvalFormRef}
                onPreLoanChange={setSelectedPreLoan}
              />
            </div>

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