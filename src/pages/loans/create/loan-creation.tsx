import { useEffect, useState, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle, Circle, ArrowUp, FloppyDisk, PaperPlaneTilt, FilePdf
} from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";

import { loanApplicationSchema, type LoanApplicationFormData } from "./schema";
import { CISLookup } from "./components/cis-lookup";
import { PersonalInfoSection } from "./components/personal-info-section";
import { LoanParametersSection } from "./components/loan-parameters-section";
import { ObligationsSection } from "./components/obligations-section";
import { OtherObligationsSection } from "./components/other-obligations";
import { VerificationSection } from "./components/verification-section";
import { DeviationsSection } from "./components/deviations-section";

const sections = [
  { id: "cis-lookup", label: "Client Lookup" },
  { id: "branch-type", label: "Branch & Type" },
  { id: "personal-info", label: "Personal & Agency" },
  { id: "loan-params", label: "Loan Parameters" },
  { id: "obligations", label: "Outstanding Loans" },
  { id: "other-obligations", label: "EBI, Buy-Outs & Incoming" },
  { id: "verification", label: "Verification Conducted" },
  { id: "deviations", label: "Remarks & Deviations" },
];

export function LoanCreationPage() {
  const methods = useForm<LoanApplicationFormData>({
    resolver: zodResolver(loanApplicationSchema),
    mode: "onBlur",
    defaultValues: {
      branchType: {
        loanType: "", branch: "", requestingOfficer: "", lai: "",
      },
      client: {
        cisId: "", firstName: "", middleName: "", lastName: "", suffix: "",
        birthdate: "", address: "", agency: "", position: "", employeeId: "",
        netTakeHomePay: 0, lengthOfService: "", region: "", divisionCode: "",
        stationCode: "", misAgency: "",
      },
      loan: {
        product: "", purpose: "", proposedAmount: 0, term: 0,
        interestRate: 0, modeOfPayment: "", dateOfFirstRelease: "",
        nthpDate: "", coMaker: "",
      },
      outstandingLoans: [],
      ebiReloans: [],
      buyOuts: [],
      incomingLoans: [],
      verification: { conductedBy: "", verificationDate: "", findings: "" },
      deviations: {
        hasDeviations: false, deviationDetails: "", aoRecommendation: "",
        otherRemarks: "", remarks: "",
      },
    },
  });

  const { handleSubmit, watch, formState: { isDirty } } = methods;
  const cisId = watch("client.cisId");
  const isClientLoaded = !!cisId && cisId.length > 0;

  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Intersection Observer to track active section on scroll
  useEffect(() => {
    if (!isClientLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [isClientLoaded]);

  // Track scroll position for "Scroll to Top" button
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const onSubmit = (data: LoanApplicationFormData) => {
    // TODO: Send to .NET 8 API with Idempotency Key
    console.log("Submit to .NET API", data);
  };

  // Logic to determine if a step is "completed"
  const isStepCompleted = (index: number) => isClientLoaded && index === 0;

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-[calc(100vh-var(--header-height))] bg-muted/40">

        {/* Sticky Top Header for Context & Status */}
        <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold tracking-tight">New Loan Application</h1>
              <Badge variant="outline" className="gap-1.5 py-1 border-amber-200 bg-amber-50 text-amber-800">
                <Circle size={8} weight="fill" className="text-amber-500" />
                Draft
              </Badge>
              {isDirty && (
                <span className="text-xs text-muted-foreground animate-in fade-in">
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
               <Button type="button" variant="ghost" size="sm" disabled={!isClientLoaded} className="gap-2">
                 <FilePdf size={16} weight="bold" />
                 <span className="hidden sm:inline">Export PDF</span>
               </Button>
            </div>
          </div>
        </header>

        <div className="container mx-auto flex gap-8 px-6 py-8 flex-1">

          {/* Sticky Sidebar Navigation (Vertical Stepper) */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-[calc(var(--header-height)+5rem)]">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6 px-2">
                Application Progress
              </h2>
              <nav className="space-y-1">
                {sections.map((section, index) => {
                  const isActive = activeSection === section.id;
                  const isCompleted = isStepCompleted(index);

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      disabled={!isClientLoaded && index > 0}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all text-left",
                        isActive
                          ? "bg-primary/5 text-primary border-l-4 border-primary pl-2"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        (!isClientLoaded && index > 0) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-center w-6 h-6 shrink-0">
                        {isCompleted && !isActive ? (
                          <CheckCircle size={20} weight="fill" className="text-primary" />
                        ) : (
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                            isActive ? "border-primary bg-primary" : "border-muted-foreground/30"
                          )}>
                            {isActive && <div className="w-2 h-2 rounded-full bg-background" />}
                          </div>
                        )}
                      </div>
                      <span className="truncate">
                        {index + 1}. {section.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Form Content */}
          <main className="flex-1 space-y-8 max-w-4xl mx-auto w-full">
            {/* 1. Client Lookup */}
            <section id="cis-lookup" ref={(el) => { sectionRefs.current["cis-lookup"] = el; }}>
              <CISLookup />
            </section>

            {isClientLoaded && (
              <>
                {/* 2. Personal & Agency */}
                <section id="personal-info" ref={(el) => { sectionRefs.current["personal-info"] = el; }}>
                  <PersonalInfoSection />
                </section>

                {/* 3. Loan Parameters */}
                <section id="loan-params" ref={(el) => { sectionRefs.current["loan-params"] = el; }}>
                  <LoanParametersSection />
                </section>

                {/* 4. Outstanding Loans */}
                <section id="obligations" ref={(el) => { sectionRefs.current["obligations"] = el; }}>
                  <ObligationsSection />
                </section>

                {/* 5. EBI, Buy-Outs & Incoming Loans */}
                <section id="other-obligations" ref={(el) => { sectionRefs.current["other-obligations"] = el; }}>
                  <OtherObligationsSection />
                </section>

                {/* 6. Verification Conducted */}
                <section id="verification" ref={(el) => { sectionRefs.current["verification"] = el; }}>
                  <VerificationSection />
                </section>

                {/* 7. Remarks & Deviations */}
                <section id="deviations" ref={(el) => { sectionRefs.current["deviations"] = el; }}>
                  <DeviationsSection />
                </section>
              </>
            )}

            {/* Spacer for sticky footer */}
            <div className="h-24" />
          </main>
        </div>

        {/* Sticky Bottom Action Bar */}
        <footer className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="container mx-auto flex h-16 items-center justify-between px-6">
            <div className="text-sm text-muted-foreground hidden md:block">
              {isClientLoaded ? "Client verified. Ready for processing." : "Search for a CIS ID to begin."}
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" className="gap-2">
                <FloppyDisk size={16} weight="bold" />
                Save Draft
              </Button>
              <Button
                type="submit"
                size="lg"
                className="gap-2 px-6"
                disabled={!isClientLoaded}
              >
                <PaperPlaneTilt size={16} weight="bold" />
                Submit for Recommendation
              </Button>
            </div>
          </div>
        </footer>

        {/* Scroll to top button */}
        {showScrollTop && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="fixed bottom-24 right-6 z-30 rounded-full h-10 w-10 shadow-lg"
            onClick={scrollToTop}
          >
            <ArrowUp size={18} weight="bold" />
          </Button>
        )}
      </form>
    </FormProvider>
  );
}
