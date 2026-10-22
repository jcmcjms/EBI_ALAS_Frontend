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
import type { UseFormReturn } from 'react-hook-form'
import type { SectionId } from '@/src/features/loans/constants/sections'

interface LoanFormSectionsProps {
  isClientLoaded: boolean
  isSubmitting: boolean
  branchTypeCode: CreationTypeCode | null
  methods: UseFormReturn<LoanApplicationFormData>
  registerSectionRef: (id: SectionId, el: HTMLElement | null) => void
  approvalFormRef: RefObject<HTMLDivElement | null>
  onPreLoanChange: (id: string, payload: PreLoanItem | null) => void
  clientConfirmed: boolean
  onConfirmClient: () => void
  onClientCleared: () => void
  
  isSectionEditable?: (id: SectionId) => boolean
  /**
   * When set, render only these sections (e.g. revision focused on Deviations).
   * Sections not listed are omitted entirely, not just disabled.
   */
  onlySectionIds?: SectionId[]
}

export function LoanFormSections({
  isClientLoaded,
  isSubmitting,
  branchTypeCode,
  methods,
  registerSectionRef,
  approvalFormRef,
  onPreLoanChange,
  clientConfirmed,
  onConfirmClient,
  onClientCleared,
  isSectionEditable,
  onlySectionIds,
}: LoanFormSectionsProps) {
  const hideOutstandingSection = HidesOutstandingLoans(branchTypeCode)
  const canEdit = (id: SectionId) =>
    (isSectionEditable ? isSectionEditable(id) : true) && !isSubmitting
  const show = (id: SectionId) =>
    !onlySectionIds || onlySectionIds.includes(id)

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8">
      {show('cis-lookup') && (
        <section
          id="cis-lookup"
          ref={(el) => registerSectionRef('cis-lookup', el)}
        >
          <fieldset disabled={!canEdit('cis-lookup')} className="contents">
            <CISLookup
              clientConfirmed={clientConfirmed}
              onConfirmClient={onConfirmClient}
              onClientCleared={onClientCleared}
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
          </fieldset>
        </section>
      )}

      {isClientLoaded || onlySectionIds ? (
        <div className="contents space-y-8">
          {show('personal-info') && (
            <section
              id="personal-info"
              ref={(el) => registerSectionRef('personal-info', el)}
            >
              <fieldset disabled={!canEdit('personal-info')} className="contents">
                <PersonalInfoSection />
              </fieldset>
            </section>
          )}

          {show('loan-params') && (
            <section
              id="loan-params"
              ref={(el) => registerSectionRef('loan-params', el)}
            >
              <fieldset disabled={!canEdit('loan-params')} className="contents">
                <LoanParametersTabsSection />
              </fieldset>
            </section>
          )}

          {show('obligations') && !hideOutstandingSection && (
            <section
              id="obligations"
              ref={(el) => registerSectionRef('obligations', el)}
            >
              <fieldset disabled={!canEdit('obligations')} className="contents">
                <ObligationsSection />
              </fieldset>
            </section>
          )}
          {show('other-obligations') && (
            <section
              id="other-obligations"
              ref={(el) => registerSectionRef('other-obligations', el)}
            >
              <fieldset disabled={!canEdit('other-obligations')} className="contents">
                <OtherObligationsSection />
              </fieldset>
            </section>
          )}
          {show('verification') && (
            <section
              id="verification"
              ref={(el) => registerSectionRef('verification', el)}
            >
              <fieldset disabled={!canEdit('verification')} className="contents">
                <VerificationSection />
              </fieldset>
            </section>
          )}
          {show('deviations') && (
            <section
              id="deviations"
              ref={(el) => registerSectionRef('deviations', el)}
            >
              <fieldset disabled={!canEdit('deviations')} className="contents">
                <DeviationsSection />
              </fieldset>
            </section>
          )}

          {show('approval-form') && (
            <section
              id="approval-form"
              ref={(el) => registerSectionRef('approval-form', el)}
            >
              <ApprovalFormPreview ref={approvalFormRef} />
            </section>
          )}
        </div>
      ) : null}

      <div className="h-24" />
    </main>
  )
}