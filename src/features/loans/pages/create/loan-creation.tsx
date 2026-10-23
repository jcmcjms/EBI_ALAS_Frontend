import { useCallback, useEffect, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import type { FieldErrors, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowUp } from '@phosphor-icons/react'
import { toastError } from '@/src/shared/ui/feedback/toast'

import { Button } from '@/src/shared/ui/primitives/button'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { useBranches, findBranchName } from '@/src/shared/lib/api/branches'
import type { PreLoanItem } from '../../api/loan-types'
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
import { mapFormToSubmitLoanRequest } from '@/src/features/loans/model/map-form-to-request'
import {
  findMaxLoanableSubmitBlock,
  findNegativeNetProceedsSubmitBlock,
  type MaxLoanableSubmitBlock,
  type NegativeNetProceedsSubmitBlock,
} from '@/src/features/loans/model/loan-approval-utils'

import {
  SECTIONS,
  type SectionId,
} from '@/src/features/loans/constants/sections'

import { sectionErrorCount } from './section-stepper-utils'
import {
  collectErrorMessages,
  formatErrorSummary,
} from './form-footer-utils'
import { DesktopStepper, MobileSectionNav, type StepperProps } from './section-nav'
import { LoanFormSections } from './loan-form-sections'
import { isCreateFormUnlocked } from './client-confirm-utils'
import { useLoanCreationDraft } from './use-loan-creation-draft'

const SCROLL_OFFSET_PX = 96

export function LoanCreationPage() {
  const userBranchId = useAuthStore((s) => s.user?.branchId ?? '')
  const { data: branches } = useBranches()
  const userBranchName = findBranchName(branches, userBranchId) || userBranchId

  const [selectedPreLoan, setSelectedPreLoan] = useState<{
    id: string
    payload: PreLoanItem | null
  }>({ id: '', payload: null })
  const [clientConfirmed, setClientConfirmed] = useState(false)

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

  const userId = useAuthStore((s) => s.user?.userId ?? 'anon')
  const draft = useLoanCreationDraft({ methods, userId })

  const cisId = useWatch({ control, name: 'client.cisId' }) ?? ''
  const isClientLoaded = isCreateFormUnlocked(cisId, clientConfirmed)

  const [activeSection, setActiveSection] = useState<SectionId>('cis-lookup')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const registerSectionRef = useCallback(
    (id: SectionId, el: HTMLElement | null) => {
      sectionRefs.current[id] = el
    },
    [],
  )
  const approvalFormRef = useRef<HTMLDivElement | null>(null)

  const { mutate: createLoan, isPending: isSubmitting } = useCreateLoan({
    onSuccess: () => draft.discardDraft(),
  })

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
      const maxLoanableBlock = findMaxLoanableSubmitBlock(data)
      if (maxLoanableBlock) {
        toastError(
          `Cannot submit ${maxLoanableBlock.loanLabel}: Maximum Loanable Amount does not cover the proposed loan. Adjust the proposed amount or client capacity first.`,
        )
        return
      }
      const negativeNetProceedsBlock = findNegativeNetProceedsSubmitBlock(data)
      if (negativeNetProceedsBlock) {
        toastError(
          `Cannot submit ${negativeNetProceedsBlock.loanLabel}: Net Proceeds to Client is negative. Adjust the proposed amount or obligations first.`,
        )
        return
      }
      createLoan(mapFormToSubmitLoanRequest(data))
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
      const messages = collectErrorMessages(fieldErrors)
      const summary = formatErrorSummary(messages)
      toastError(
        summary
          ? `${summary} — fix before submission.`
          : `${total} field${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} attention before submission.`,
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
  const errorMessages = submitAttempted ? collectErrorMessages(errors) : []

  const branchTypeCode = useWatch({
    control,
    name: 'branchType.creationTypeCode',
  })

  const loans = useWatch({ control, name: 'loans' }) ?? []
  const preLoanSelected = loans.length > 0
  const client = useWatch({ control, name: 'client' })
  const outstandingLoans = useWatch({ control, name: 'outstandingLoans' }) ?? []
  const maxLoanableBlock: MaxLoanableSubmitBlock | null =
    isClientLoaded && preLoanSelected
      ? findMaxLoanableSubmitBlock({
          client,
          loans,
          outstandingLoans,
        })
      : null
  const negativeNetProceedsBlock: NegativeNetProceedsSubmitBlock | null =
    isClientLoaded && preLoanSelected
      ? findNegativeNetProceedsSubmitBlock({
          client,
          loans,
          outstandingLoans,
        })
      : null

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

  const canSubmit =
    isClientLoaded &&
    preLoanSelected &&
    !maxLoanableBlock &&
    !negativeNetProceedsBlock
  const firstErrorSection = submitAttempted
    ? SECTIONS.find((s) => sectionErrorCount(errors, s.id) > 0)
    : undefined

  const visibleSectionIds = visibleSections.map((s) => s.id)
  const activeIndex = Math.max(0, visibleSectionIds.indexOf(activeSection))

  const onBack = useCallback(() => {
    const prev = visibleSectionIds[activeIndex - 1]
    if (prev) scrollToSection(prev)
  }, [activeIndex, scrollToSection, visibleSectionIds])

  const onNext = useCallback(() => {
    const next = visibleSectionIds[activeIndex + 1]
    if (next) scrollToSection(next)
  }, [activeIndex, scrollToSection, visibleSectionIds])

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
              draftStatus={draft.status}
              draftSavedAt={draft.savedAt}
              draftError={draft.errorMessage}
              onRetryDraftSave={draft.retry}
              onClearForm={draft.clearDraft}
            />

            <MobileSectionNav {...stepperProps} />

            <div className="container mx-auto flex flex-1 gap-8 px-6 py-8">
              <DesktopStepper {...stepperProps} />

              <LoanFormSections
                isClientLoaded={isClientLoaded}
                isSubmitting={isSubmitting}
                branchTypeCode={branchTypeCode}
                methods={methods}
                registerSectionRef={registerSectionRef}
                approvalFormRef={approvalFormRef}
                onPreLoanChange={(id, payload) => setSelectedPreLoan({ id, payload })}
                clientConfirmed={clientConfirmed}
                onConfirmClient={() => setClientConfirmed(true)}
                onClientCleared={() => setClientConfirmed(false)}
              />
            </div>

            <FormFooter
              totalErrors={totalErrors}
              errorMessages={errorMessages}
              activeSection={activeSection}
              visibleSectionIds={visibleSectionIds}
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              firstErrorSection={firstErrorSection?.id}
              onNavigateToError={(id) => scrollToSection(id)}
              maxLoanableBlock={maxLoanableBlock}
              negativeNetProceedsBlock={negativeNetProceedsBlock}
              onNext={onNext}
              onBack={onBack}
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