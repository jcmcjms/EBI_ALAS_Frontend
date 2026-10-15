import { type ReactNode, type RefObject } from 'react'
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
import type { SectionId } from '@/src/features/loans/constants/sections'

interface LoanFormSectionsProps {
  isClientLoaded: boolean
  isSubmitting: boolean
  branchTypeCode: CreationTypeCode | null
  methods: UseFormReturn<LoanApplicationFormData>
  sectionRefs: RefObject<Record<string, HTMLElement | null>>
  approvalFormRef: RefObject<HTMLDivElement | null>
  onPreLoanChange: (id: string, payload: PreLoanItem | null) => void
  /** When provided, sections that return false render read-only. */
  isSectionEditable?: (id: SectionId) => boolean
}

function SectionShell({
  id,
  editable,
  sectionRefs,
  children,
}: {
  id: SectionId
  editable: boolean
  sectionRefs: RefObject<Record<string, HTMLElement | null>>
  children: ReactNode
}) {
  return (
    <section
      id={id}
      ref={(el) => {
        sectionRefs.current[id] = el
      }}
    >
      <fieldset disabled={!editable} className="contents">
        {children}
      </fieldset>
    </section>
  )
}

export function LoanFormSections({
  isClientLoaded,
  isSubmitting,
  branchTypeCode,
  methods,
  sectionRefs,
  approvalFormRef,
  onPreLoanChange,
  isSectionEditable,
}: LoanFormSectionsProps) {
  const hideOutstandingSection = HidesOutstandingLoans(branchTypeCode)
  const canEdit = (id: SectionId) =>
    isSectionEditable ? isSectionEditable(id) : true

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8">
      <SectionShell
        id="cis-lookup"
        editable={canEdit('cis-lookup') && !isSubmitting}
        sectionRefs={sectionRefs}
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
      </SectionShell>

      {isClientLoaded ? (
        <div className="contents space-y-8">
          <SectionShell
            id="personal-info"
            editable={canEdit('personal-info') && !isSubmitting}
            sectionRefs={sectionRefs}
          >
            <PersonalInfoSection />
          </SectionShell>

          <SectionShell
            id="loan-params"
            editable={canEdit('loan-params') && !isSubmitting}
            sectionRefs={sectionRefs}
          >
            <LoanParametersTabsSection />
          </SectionShell>

          {!hideOutstandingSection && (
            <SectionShell
              id="obligations"
              editable={canEdit('obligations') && !isSubmitting}
              sectionRefs={sectionRefs}
            >
              <ObligationsSection />
            </SectionShell>
          )}
          <SectionShell
            id="other-obligations"
            editable={canEdit('other-obligations') && !isSubmitting}
            sectionRefs={sectionRefs}
          >
            <OtherObligationsSection />
          </SectionShell>
          <SectionShell
            id="verification"
            editable={canEdit('verification') && !isSubmitting}
            sectionRefs={sectionRefs}
          >
            <VerificationSection />
          </SectionShell>
          <SectionShell
            id="deviations"
            editable={canEdit('deviations') && !isSubmitting}
            sectionRefs={sectionRefs}
          >
            <DeviationsSection />
          </SectionShell>

          <SectionShell
            id="approval-form"
            editable={false}
            sectionRefs={sectionRefs}
          >
            <ApprovalFormPreview ref={approvalFormRef} />
          </SectionShell>
        </div>
      ) : (
        <WorkflowOverview />
      )}

      <div className="h-24" />
    </main>
  )
}