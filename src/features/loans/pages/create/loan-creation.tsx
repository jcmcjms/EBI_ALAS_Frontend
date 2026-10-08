import { useCallback, useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import type { FieldErrors, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { ArrowUp } from '@phosphor-icons/react'
import { toastError } from '@/src/shared/ui/feedback/toast'

import { Button } from '@/src/shared/ui/primitives/button'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { WEBLOAN_BRANCHES } from '../../api/loan-types'
import type { PreLoanItem } from '../../api/loan-types'
import { loanKeys } from '@/src/features/loans/api/loan-queries'
import { getRevisionRequests, getLoanDetail } from '@/src/features/loans/api/loan-review'
import { RevisionFeedbackBanner } from '@/src/features/loans/components/revision-feedback-banner'
import { LoanCreationHeader } from './loan-creation-header'
import { FormFooter } from './form-footer'

import {
  loanApplicationSchema,
  HidesOutstandingLoans,
  type LoanApplicationFormData,
} from '@/src/features/loans/schemas/schema'
import { ActiveLoanProvider } from './active-loan-context'
import { LoanTransfersProvider } from './loan-transfers-provider'
import { useCreateLoan } from '@/src/features/loans/hooks/use-create-loan'
import { mapFormToSubmissionPayload } from '@/src/features/loans/model/map-form-to-request'
import { mapLoanDetailToFormData } from '@/src/features/loans/model/map-detail-to-form'

import {
  SECTIONS,
  type SectionId,
} from '@/src/features/loans/constants/sections'

import { sectionErrorCount } from './section-stepper-utils'
import { DesktopStepper, MobileSectionNav, type StepperProps } from './section-nav'
import { LoanFormSections } from './loan-form-sections'

const SCROLL_OFFSET_PX = 96

export function LoanCreationPage() {
  const search = useSearch({ strict: false }) as { loanId?: string }
  const editLoanIdRaw = Number(search.loanId)
  const editLoanId =
    Number.isFinite(editLoanIdRaw) && editLoanIdRaw > 0 ? editLoanIdRaw : null

  const revisionRequests = useQuery({
    queryKey: loanKeys.revisionRequests(editLoanId ?? 0),
    queryFn: () => getRevisionRequests(editLoanId ?? 0),
    enabled: editLoanId != null,
  })

  const existingLoan = useQuery({
    queryKey: loanKeys.review.detail(editLoanId ?? 0),
    queryFn: () => getLoanDetail(editLoanId!),
    enabled: editLoanId != null,
    staleTime: 30_000,
  })

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

  // Populate form when editing an existing loan (must be after methods is declared)
  useEffect(() => {
    if (existingLoan.data) {
      methods.reset(mapLoanDetailToFormData(existingLoan.data))
    }
  }, [existingLoan.data, methods])

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
            <LoanCreationHeader
              userBranchId={userBranchId}
              userBranchName={userBranchName}
              selectedPreLoan={selectedPreLoan}
              isDirty={isDirty}
              editLamId={existingLoan.data?.lamId}
              editStatus={existingLoan.data?.status}
            />

            <MobileSectionNav {...stepperProps} />

            {revisionRequests.data && revisionRequests.data.length > 0 && (
              <div className="container mx-auto px-6 pt-6">
                <RevisionFeedbackBanner
                  requests={revisionRequests.data}
                  onNavigateToSection={scrollToSection}
                />
              </div>
            )}

            <div className="container mx-auto flex flex-1 gap-8 px-6 py-8">
              <DesktopStepper {...stepperProps} />

              <LoanFormSections
                isClientLoaded={isClientLoaded}
                isSubmitting={isSubmitting}
                branchTypeCode={branchTypeCode}
                methods={methods}
                sectionRefs={sectionRefs}
                approvalFormRef={approvalFormRef}
                onPreLoanChange={(id, payload) => setSelectedPreLoan({ id, payload })}
              />
            </div>

            <FormFooter
              totalErrors={totalErrors}
              isClientLoaded={isClientLoaded}
              preLoanSelected={preLoanSelected}
              loanCount={loans.length}
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              firstErrorSection={firstErrorSection?.id}
              onNavigateToError={(id) => scrollToSection(id)}
            />

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