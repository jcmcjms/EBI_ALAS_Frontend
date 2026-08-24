import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loanApplicationSchema, type LoanApplicationFormData } from "./schema";
import { CISLookup } from "./components/cis-lookup";
import { PersonalInfoSection } from "./components/personal-info-section";
import { LoanParametersSection } from "./components/loan-parameters-section";
import { ObligationsSection } from "./components/obligations-section";
import { DeviationsSection } from "./components/deviations-section";
import { Button } from "@/components/ui/button";
import { FloppyDisk, PaperPlaneTilt, FilePdf } from "@phosphor-icons/react";

const sections = [
    { id: "cis-lookup", label: "1. Client Lookup" },
    { id: "personal-info", label: "2. Personal & Agency" },
    { id: "loan-params", label: "3. Loan Parameters" },
    { id: "obligations", label: "4. Obligations & Payoffs" },
    { id: "deviations", label: "5. Remarks & Deviations" },
];

export function LoanCreationPage() {
    const methods = useForm<LoanApplicationFormData>({
        resolver: zodResolver(loanApplicationSchema),
        defaultValues: {
            client: {
                cisId: "",
                firstName: "",
                lastName: "",
                agency: "",
                position: "",
                employeeId: "",
                netTakeHomePay: 0,
            },
            loan: {
                product: "",
                purpose: "",
                proposedAmount: 0,
                term: 0,
                interestRate: 0,
                modeOfPayment: "",
                dateOfFirstRelease: "",
                coMaker: "",
            },
            outstandingLoans: [],
            buyOuts: [],
            deviations: {
                hasDeviations: false,
                deviationDetails: "",
                aoRecommendation: "",
                remarks: "",
            },
        },
    });

    const { handleSubmit, watch } = methods;
    const cisId = watch("client.cisId");
    const isClientLoaded = !!cisId && cisId.length > 0;

    const onSubmit = (data: LoanApplicationFormData) => {
        console.log("Submit to .NET API", data);
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="min-h-svh bg-background">
                <div className="container mx-auto flex gap-8 p-6">

                    {/* Sticky Sidebar Navigation */}
                    <aside className="w-64 shrink-0 hidden lg:block">
                        <div className="sticky top-6 space-y-6">
                            <div>
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                    Application Sections
                                </h2>
                                <nav className="space-y-1">
                                    {sections.map((section) => (
                                        <a
                                            key={section.id}
                                            href={`#${section.id}`}
                                            className="block px-3 py-2 text-sm font-medium text-muted-foreground rounded-md hover:bg-muted hover:text-foreground transition-colors"
                                        >
                                            {section.label}
                                        </a>
                                    ))}
                                </nav>
                            </div>

                            <div className="pt-4 border-t space-y-2">
                                <Button type="button" variant="outline" className="w-full justify-start h-9 gap-2">
                                    <FloppyDisk size={16} weight="bold" /> Save Draft
                                </Button>
                                <Button type="button" variant="outline" className="w-full justify-start h-9 gap-2" disabled={!isClientLoaded}>
                                    <FilePdf size={16} weight="bold" /> Generate PDF
                                </Button>
                                <Button type="submit" className="w-full h-9 gap-2" disabled={!isClientLoaded}>
                                    <PaperPlaneTilt size={16} weight="bold" /> Submit for Recommendation
                                </Button>
                            </div>
                        </div>
                    </aside>

                    {/* Main Form Content */}
                    <main className="flex-1 space-y-8 max-w-4xl">
                        <section id="cis-lookup"><CISLookup /></section>

                        {isClientLoaded && (
                            <>
                                <section id="personal-info"><PersonalInfoSection /></section>
                                <section id="loan-params"><LoanParametersSection /></section>
                                <section id="obligations"><ObligationsSection /></section>
                                <section id="deviations"><DeviationsSection /></section>
                            </>
                        )}
                    </main>
                </div>
            </form>
        </FormProvider>
    );
}
