import { CurrencyDollar } from "@phosphor-icons/react";
import { SectionCard } from "./section-card";
import { getSection } from "../sections";
import { LoanParametersFields } from "./loan-parameters-fields";

interface LoanParametersSectionProps {
    /**
     * Field prefix for the parameters within a selected loan.
     * Example: "loans.0.parameters" for the first loan in the array.
     * This allows the component to be reused for each loan in the
     * multi-loan application workflow.
     */
    fieldPrefix: string;
    /** Index of the loan in the loans array (for display purposes). */
    loanIndex: number;
}

/**
 * Loan Parameters Section — thin wrapper around LoanParametersFields
 * that adds the SectionCard shell. Kept for backwards compatibility
 * and potential single-loan use cases. The multi-loan workflow now
 * uses LoanParametersTabsSection which owns the selector and composes
 * LoanParametersFields internally.
 */
export function LoanParametersSection({ fieldPrefix, loanIndex }: LoanParametersSectionProps) {
    const section = getSection("loan-params");

    return (
        <SectionCard
            step={section.step}
            title={`Loan Parameters ${loanIndex > 0 ? `(Loan ${loanIndex + 1})` : ""}`}
            description={section.description}
            icon={<CurrencyDollar size={20} weight="bold" className="text-primary" />}
        >
            <LoanParametersFields fieldPrefix={fieldPrefix} />
        </SectionCard>
    );
}