import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch, useFormContext } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUp,
  CheckCircle,
  ClipboardText,
  FilePdf,
  FloppyDisk,
  IdentificationBadge,
  LockSimple,
  MagnifyingGlass,
  PaperPlaneTilt,
  Receipt,
  Stack,
  WarningCircle,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { generatePdfFromElement } from "@/src/lib/pdf";
import { useAuthStore } from "@/src/store/authStore";
import { WEBLOAN_BRANCHES } from "@/src/lib/api/types";
import type { PreLoanItem } from "@/src/lib/api/types";

import { loanApplicationSchema, type LoanApplicationFormData } from "./schema";
import { CISLookup } from "./components/cis-lookup";
import { PersonalInfoSection } from "./components/personal-info-section";
import { LoanParametersSection } from "./components/loan-parameters-section";
import { ObligationsSection } from "./components/obligations-section";
import { OtherObligationsSection } from "./components/other-obligations";
import { VerificationSection } from "./components/verification-section";
import { DeviationsSection } from "./components/deviations-section";
import { ApprovalFormPreview } from "./components/approval-form-preview";

// ── Section definitions ─────────────────────────────────────────
// Mirrors the rendered <section> elements. "Branch & Type" lives
// inside the Client Lookup card (system-verified), not a separate step.
type SectionId =
  | "cis-lookup"
  | "personal-info"
  | "loan-params"
  | "obligations"
  | "other-obligations"
  | "verification"
  | "deviations"
  | "approval-form";

interface SectionDef {
  id: SectionId;
  label: string;
  optional?: boolean;
}

const SECTIONS: SectionDef[] = [
  { id: "cis-lookup", label: "Client, Account & Preloan" },
  { id: "personal-info", label: "Personal & Agency" },
  { id: "loan-params", label: "Loan Parameters" },
  { id: "obligations", label: "Outstanding Loans" },
  { id: "other-obligations", label: "EBI, Buy-Outs & Incoming" },
  { id: "verification", label: "Verification Conducted", optional: true },
  { id: "deviations", label: "Remarks & Deviations", optional: true },
  { id: "approval-form", label: "Approval Form" },
];

const REQUIRED_SECTION_COUNT = SECTIONS.filter((s) => !s.optional).length;
const SCROLL_OFFSET_PX = 96;

// ── Error counting utilities ────────────────────────────────────

type SectionStatus = "active" | "complete" | "error" | "locked" | "upcoming" | "optional";

/** Counts leaf validation messages in an RHF error subtree (objects or arrays). */
function countFieldErrors(node: unknown): number {
  if (!node || typeof node !== "object") return 0;
  const record = node as Record<string, unknown>;
  if (typeof record.message === "string") return 1;
  return Object.values(record).reduce((sum, child) => sum + countFieldErrors(child), 0);
}

function sectionErrorCount(errors: FieldErrors<LoanApplicationFormData>, id: SectionId): number {
  switch (id) {
    case "cis-lookup":
      return countFieldErrors(errors.branchType) + countFieldErrors(errors.client);
    case "loan-params":
      return countFieldErrors(errors.loan);
    case "obligations":
      return countFieldErrors(errors.outstandingLoans);
    case "other-obligations":
      return (
        countFieldErrors(errors.ebiReloans) +
        countFieldErrors(errors.buyOuts) +
        countFieldErrors(errors.incomingLoans)
      );
    case "verification":
      return countFieldErrors(errors.verification);
    case "deviations":
      return countFieldErrors(errors.deviations);
    case "approval-form":
      return 0; // preview only, no validation
    default:
      return 0; // personal-info is read-only, CIS-sourced
  }
}

// ── Section progress hook (useWatch-scoped, avoids root re-render) ──

/**
 * Section completion + status, scoped via useWatch so the page root doesn't
 * re-render on every keystroke. Deliberately lightweight presence checks;
 * the Zod schema remains the source of truth on submit.
 */
function useSectionProgress(
  isClientLoaded: boolean,
  preLoanSelected: boolean,
  submitAttempted: boolean,
  activeSection: SectionId
) {
  const { control, formState } = useFormContext<LoanApplicationFormData>();
  const branchType = useWatch({ control, name: "branchType" });
  const loan = useWatch({ control, name: "loan" });
  const verification = useWatch({ control, name: "verification" });
  const deviations = useWatch({ control, name: "deviations" });

  const isComplete = (id: SectionId): boolean => {
    switch (id) {
      case "cis-lookup":
        // The lookup is "complete" when a client is loaded, an account has
        // been picked (handled by the parent lifting `isClientLoaded` to
        // mean "profile sourced") and a preloan — bch-scoped to the acting
        // user — has been attached. The preloan is optional at the schema
        // level but tracked here as part of the step's overall completeness.
        return isClientLoaded && !!branchType.requestingOfficer && preLoanSelected;
      case "personal-info":
      case "obligations":
      case "other-obligations":
        return isClientLoaded; // read-only, complete once sourced from CIS
      case "loan-params":
        return (
          isClientLoaded &&
          !!loan.product &&
          !!loan.purpose &&
          !!loan.modeOfPayment &&
          loan.proposedAmount > 0 &&
          loan.term > 0
        );
      case "verification":
        return !!(verification?.conductedBy || verification?.findings);
      case "deviations":
        return !!(
          deviations?.deviationDetails ||
          deviations?.aoRecommendation ||
          deviations?.remarks
        );
      case "approval-form":
        return isClientLoaded; // preview available once client is loaded
    }
  };

  const getStatus = (section: SectionDef, index: number): SectionStatus => {
    if (submitAttempted && sectionErrorCount(formState.errors, section.id) > 0)
      return "error";
    if (activeSection === section.id) return "active";
    if (isComplete(section.id)) return "complete";
    if (!isClientLoaded && index > 0) return "locked";
    return section.optional ? "optional" : "upcoming";
  };

  const errorCount = (id: SectionId) =>
    submitAttempted ? sectionErrorCount(formState.errors, id) : 0;

  const completedRequired = SECTIONS.filter(
    (s) => !s.optional && isComplete(s.id)
  ).length;

  return { getStatus, errorCount, completedRequired };
}

// ── Status icon ─────────────────────────────────────────────────

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete")
    return <CheckCircle size={20} weight="fill" className="text-primary" />;
  if (status === "error")
    return (
      <WarningCircle size={20} weight="fill" className="text-destructive" />
    );
  if (status === "locked")
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/20">
        <LockSimple
          size={11}
          weight="bold"
          className="text-muted-foreground/50"
        />
      </div>
    );
  if (status === "active")
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-primary">
        <div className="h-2 w-2 rounded-full bg-background" />
      </div>
    );
  return (
    <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30" />
  );
}

// ── Desktop sidebar stepper ─────────────────────────────────────

interface StepperProps {
  activeSection: SectionId;
  isClientLoaded: boolean;
  preLoanSelected: boolean;
  submitAttempted: boolean;
  onNavigate: (id: SectionId) => void;
}

function DesktopStepper({
  activeSection,
  isClientLoaded,
  preLoanSelected,
  submitAttempted,
  onNavigate,
}: StepperProps) {
  const { getStatus, errorCount, completedRequired } = useSectionProgress(
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    activeSection
  );

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-[calc(var(--header-height)+4rem)] space-y-6">
        {/* Progress summary */}
        <div className="space-y-2 px-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Application Progress
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {completedRequired}/{REQUIRED_SECTION_COUNT} required
            </span>
          </div>
          <div
            className="h-1 rounded-full bg-muted"
            role="progressbar"
            aria-label="Required sections completed"
            aria-valuemin={0}
            aria-valuemax={REQUIRED_SECTION_COUNT}
            aria-valuenow={completedRequired}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${(completedRequired / REQUIRED_SECTION_COUNT) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Section nav */}
        <nav aria-label="Application sections" className="space-y-1">
          {SECTIONS.map((section, index) => {
            const status = getStatus(section, index);
            const errors = errorCount(section.id);
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onNavigate(section.id)}
                disabled={status === "locked"}
                aria-current={status === "active" ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all",
                  status === "active"
                    ? "border-l-4 border-primary bg-primary/5 pl-2 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  status === "locked" &&
                    "cursor-not-allowed opacity-50 hover:bg-transparent"
                )}
              >
                <div className="flex w-6 shrink-0 items-center justify-center">
                  <StatusIcon status={status} />
                </div>
                <span className="min-w-0 flex-1 truncate">
                  {index + 1}. {section.label}
                </span>
                {errors > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1 tabular-nums text-[10px]"
                  >
                    {errors}
                  </Badge>
                )}
                {section.optional &&
                  errors === 0 &&
                  status !== "complete" && (
                    <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground/70">
                      Optional
                    </span>
                  )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// ── Mobile horizontal section nav ───────────────────────────────

function MobileSectionNav({
  activeSection,
  isClientLoaded,
  preLoanSelected,
  submitAttempted,
  onNavigate,
}: StepperProps) {
  const { getStatus, errorCount } = useSectionProgress(
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    activeSection
  );

  return (
    <div className="sticky top-[var(--header-height)] z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div
        className="flex gap-2 overflow-x-auto px-4 py-2"
        role="tablist"
        aria-label="Application sections"
      >
        {SECTIONS.map((section, index) => {
          const status = getStatus(section, index);
          const errors = errorCount(section.id);
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onNavigate(section.id)}
              disabled={status === "locked"}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                status === "active"
                  ? "border-primary bg-primary text-primary-foreground"
                  : status === "error"
                    ? "border-destructive/40 bg-destructive/5 text-destructive"
                    : status === "complete"
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground",
                status === "locked" && "opacity-50"
              )}
            >
              {index + 1}. {section.label}
              {errors > 0 && (
                <span className="tabular-nums font-bold">({errors})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Workflow hint cards (empty state) ───────────────────────────

function WorkflowHint({
  icon,
  step,
  title,
  body,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {step}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

// ── Main page component ─────────────────────────────────────────

export function LoanCreationPage() {
  // Acting officer's branchId is the **server-side** filter for the preloan
  // list (bch = JWT-user.branchId). The frontend never sends it — we just
  // read it from the auth store to render the scope chip and to label the
  // user's branch in the page header.
  const userBranchId = useAuthStore((s) => s.user?.branchId ?? "");
  const userBranchName =
    WEBLOAN_BRANCHES.find((b) => b.code === userBranchId)?.name ??
    userBranchId;

  // The selected preloan id is mirrored into form state (loanApplicationSchema.preLoan)
  // AND kept as a local payload so the rest of the form (loan params, etc.)
  // can be hydrated from it without re-fetching. Reset together with the rest
  // of the form on "Change client" / "Change account".
  const [selectedPreLoan, setSelectedPreLoan] = useState<{
    id: string;
    payload: PreLoanItem | null;
  }>({ id: "", payload: null });

  const methods = useForm<LoanApplicationFormData>({
    resolver: zodResolver(loanApplicationSchema),
    mode: "onBlur",
    defaultValues: {
      branchType: {
        loanType: "",
        branch: "",
        requestingOfficer: "",
        lai: "",
      },
      client: {
        cisId: "",
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        birthdate: "",
        address: "",
        agency: "",
        position: "",
        employeeId: "",
        netTakeHomePay: 0,
        lengthOfService: "",
        region: "",
        divisionCode: "",
        stationCode: "",
        misAgency: "",
        school: "",
        referrer: "",
      },
      loan: {
        product: "",
        purpose: "",
        proposedAmount: 0,
        term: 0,
        interestRate: 0,
        modeOfPayment: "",
        dateOfFirstRelease: "",
        nthpDate: "",
        coMaker: "",
      },
      outstandingLoans: [],
      ebiReloans: [],
      buyOuts: [],
      incomingLoans: [],
      preLoan: undefined,
      verification: { conductedBy: "", verificationDate: "", findings: "" },
      deviations: {
        hasDeviations: false,
        deviationDetails: "",
        aoRecommendation: "",
        otherRemarks: "",
        remarks: "",
      },
    },
  });

  const { handleSubmit, watch, formState } = methods;
  const { isDirty, errors } = formState;

  const cisId = watch("client.cisId");
  const isClientLoaded = !!cisId && cisId.length > 0;

  const [activeSection, setActiveSection] = useState<SectionId>("cis-lookup");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const approvalFormRef = useRef<HTMLDivElement | null>(null);

  // Intersection Observer tracks the active section while scrolling.
  useEffect(() => {
    if (!isClientLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting)
            setActiveSection(entry.target.id as SectionId);
        });
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [isClientLoaded]);

  // Track scroll position for "Scroll to Top" button.
  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: SectionId) => {
    const element = sectionRefs.current[id];
    if (!element) return;
    const top = Math.max(
      0,
      element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX
    );
    window.scrollTo({ top, behavior: "smooth" });
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const onSubmit = (data: LoanApplicationFormData) => {
    // TODO: POST to the .NET 8 API with an Idempotency-Key header.
    // The backend must re-validate and derive officer/branch/LAI from the JWT,
    // not from this payload.
    console.info("Submit to .NET API", data);
    toast.success("Application submitted for recommendation.");
  };

  const onInvalid = (fieldErrors: FieldErrors<LoanApplicationFormData>) => {
    setSubmitAttempted(true);
    const total = SECTIONS.reduce(
      (n, s) => n + sectionErrorCount(fieldErrors, s.id),
      0
    );
    const first = SECTIONS.find(
      (s) => sectionErrorCount(fieldErrors, s.id) > 0
    );
    toast.error(
      `${total} field${total === 1 ? "" : "s"} need${total === 1 ? "s" : ""} attention before submission.`
    );
    if (first) scrollToSection(first.id);
  };

  const handleSaveDraft = () => {
    // TODO: persist server-side (POST /api/loan-applications/draft) with an
    // ownership check. Do NOT use localStorage — PII on shared terminals.
    toast.success("Draft saved.");
  };

  const handleGeneratePdf = async () => {
    if (!approvalFormRef.current) return;
    const lai = watch("branchType.lai") || "draft";
    try {
      toast.info("Generating PDF...");
      await generatePdfFromElement(approvalFormRef.current, `approval-form-${lai}-${Date.now()}.pdf`);
      toast.success("PDF generated.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF.");
    }
  };

  const totalErrors = submitAttempted
    ? SECTIONS.reduce((n, s) => n + sectionErrorCount(errors, s.id), 0)
    : 0;

  const stepperProps: StepperProps = {
    activeSection,
    isClientLoaded,
    preLoanSelected: !!selectedPreLoan.id,
    submitAttempted,
    onNavigate: scrollToSection,
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40"
      >
        {/* ── Sticky top header ──────────────────────────────── */}
        <header className="sticky top-[var(--header-height)] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                  <span className="font-mono">Branch</span>
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
                    <span className="font-mono text-[10px] text-muted-foreground">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!isClientLoaded}
              className="gap-2"
              onClick={handleGeneratePdf}
              title={
                isClientLoaded
                  ? "Generate approval form PDF"
                  : "Load a client to enable PDF export"
              }
            >
              <FilePdf size={16} weight="bold" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
          </div>
        </header>

        {/* ── Mobile section nav ─────────────────────────────── */}
        <MobileSectionNav {...stepperProps} />

        <div className="container mx-auto flex flex-1 gap-8 px-6 py-8">
          {/* ── Desktop sidebar stepper ──────────────────────── */}
          <DesktopStepper {...stepperProps} />

          {/* ── Main form content ────────────────────────────── */}
          <main className="mx-auto w-full max-w-4xl flex-1 space-y-8">
            <section
              id="cis-lookup"
              ref={(el) => {
                sectionRefs.current["cis-lookup"] = el;
              }}
            >
              <CISLookup
                userBranchId={userBranchId}
                selectedPreLoanId={selectedPreLoan.id}
                onPreLoanChange={(id, payload) => {
                  setSelectedPreLoan({ id, payload });
                  if (payload) {
                    methods.setValue("preLoan", {
                      id: payload.id,
                      accountNo: payload.accountNo,
                      bch: payload.bch,
                      formNumber: payload.formNumber ?? undefined,
                      productDescription:
                        payload.productDescription ?? undefined,
                    });
                  } else {
                    methods.setValue("preLoan", undefined);
                  }
                }}
              />
            </section>

            {isClientLoaded ? (
              <>
                <section
                  id="personal-info"
                  ref={(el) => {
                    sectionRefs.current["personal-info"] = el;
                  }}
                >
                  <PersonalInfoSection />
                </section>
                <section
                  id="loan-params"
                  ref={(el) => {
                    sectionRefs.current["loan-params"] = el;
                  }}
                >
                  <LoanParametersSection />
                </section>
                <section
                  id="obligations"
                  ref={(el) => {
                    sectionRefs.current["obligations"] = el;
                  }}
                >
                  <ObligationsSection />
                </section>
                <section
                  id="other-obligations"
                  ref={(el) => {
                    sectionRefs.current["other-obligations"] = el;
                  }}
                >
                  <OtherObligationsSection />
                </section>
                <section
                  id="verification"
                  ref={(el) => {
                    sectionRefs.current["verification"] = el;
                  }}
                >
                  <VerificationSection />
                </section>
                <section
                  id="deviations"
                  ref={(el) => {
                    sectionRefs.current["deviations"] = el;
                  }}
                >
                  <DeviationsSection />
                </section>

                {/* 8. Approval Form */}
                <section
                  id="approval-form"
                  ref={(el) => {
                    sectionRefs.current["approval-form"] = el;
                  }}
                >
                  <ApprovalFormPreview ref={approvalFormRef} onGeneratePdf={handleGeneratePdf} />
                </section>
              </>
            ) : (
              <section
                aria-label="How the application works"
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <WorkflowHint
                  icon={<MagnifyingGlass size={16} weight="bold" />}
                  step="Step 1"
                  title="Look up the client"
                  body="Enter the CIS number to pull the borrower's profile, agency details and existing accounts."
                />
                <WorkflowHint
                  icon={<Receipt size={16} weight="bold" />}
                  step="Step 2"
                  title="Pick the account"
                  body="Choose which of the borrower's LAI accounts this application is for. Active loans refresh."
                />
                <WorkflowHint
                  icon={<Stack size={16} weight="bold" />}
                  step="Step 3"
                  title="Attach a preloan"
                  body={`Preloans under your branch (${userBranchId || "—"}) only — pick one to resume.`}
                />
                <WorkflowHint
                  icon={<PaperPlaneTilt size={16} weight="bold" />}
                  step="Step 4"
                  title="Submit for recommendation"
                  body="Encode the proposed terms, then route to the Account Officer."
                />
              </section>
            )}

            {/* Spacer for sticky footer */}
            <div className="h-24" />
          </main>
        </div>

        {/* ── Sticky bottom action bar ───────────────────────── */}
        <footer className="sticky bottom-0 z-20 border-t bg-background/95 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-6">
            {totalErrors > 0 ? (
              <div
                className="hidden items-center gap-1.5 text-sm text-destructive md:flex"
                role="alert"
              >
                <WarningCircle size={16} weight="fill" />
                {totalErrors} field{totalErrors === 1 ? "" : "s"} need
                {totalErrors === 1 ? "s" : ""} attention.
              </div>
            ) : (
              <div className="hidden text-sm text-muted-foreground md:block">
                {!isClientLoaded
                  ? "Search for a CIS ID to begin."
                  : !selectedPreLoan.id
                    ? `Pick an account and a preloan under your branch (${userBranchId || "—"}) to continue.`
                    : "Client verified, preloan attached. Ready for processing."}
              </div>
            )}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleSaveDraft}
              >
                <FloppyDisk size={16} weight="bold" />
                Save Draft
              </Button>
              <Button
                type="submit"
                size="lg"
                className="gap-2 px-6"
                disabled={!isClientLoaded || !selectedPreLoan.id}
                title={
                  !isClientLoaded
                    ? "Load a client to enable submission"
                    : !selectedPreLoan.id
                      ? "Pick a preloan to enable submission"
                      : undefined
                }
              >
                <PaperPlaneTilt size={16} weight="bold" />
                Submit for Recommendation
              </Button>
            </div>
          </div>
        </footer>

        {/* ── Scroll to top button ───────────────────────────── */}
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
    </FormProvider>
  );
}
