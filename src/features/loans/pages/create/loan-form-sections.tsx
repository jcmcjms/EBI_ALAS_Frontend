import { type RefObject } from 'react'
import type { PreLoanItem } from '../../api/loan-types'
import type { LoanApplicationFormData, CreationTypeCode } from '@/src/features/loans/schemas/schema'
import { HidesOutstandingLoans } from '@/src/features/loans/schemas/schema'
import { CISLookup } from './components/cis-lookup'
import { PersonalInfoSection } from './components/personal-info-section'
import { LoanParametersTabsSection } from './components/loan-parameters-tabs-section'
import { ObligationsSection } from './components/obligations-section'
import { OtherObligationsSection } from './components/other-obligations'
import { VerificationSection } from './components/verification-section'
import { DeviationsSection } from './components/deviations-section'
import { ApprovalFormPreview } from './components/approval-form-preview'
import { WorkflowOverview } from '@/src/features/loans/components/workflow-overview'
import type { UseFormReturn } from 'react-hook-form'

interface LoanFormSectionsProps {
  isClientLoaded: boolean
  isSubmitting: boolean
  branchTypeCode: CreationTypeCode | null
  methods: UseFormReturn<LoanApplicationFormData>
  sectionRefs: RefObject<Record<string, HTMLElement | null>>
  approvalFormRef: RefObject<HTMLDivElement | null>
  onPreLoanChange: (id: string, payload: PreLoanItem | null) => void
}

export function LoanFormSections({
  isClientLoaded,
  isSubmitting,
  branchTypeCode,
  methods,
  sectionRefs,
  approvalFormRef,
  onPreLoanChange,
}: LoanFormSectionsProps) {
  const hideOutstandingSection = HidesOutstandingLoans(branchTypeCode)

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8">
      <section
        id="cis-lookup"
        ref={(el) => {
          sectionRefs.current['cis-lookup'] = el
        }}
      >
        <CISLookup
          onPreLoanChange={(id, payload) => {
            onPreLoanChange(id, payload)
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

      <div className="h-24" />
    </main>
  )
}