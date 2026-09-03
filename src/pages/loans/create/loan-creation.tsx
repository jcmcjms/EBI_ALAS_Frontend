import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm, useWatch, useFormContext } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUp,
  CheckCircle,
  ClipboardText,
  CloudCheck,
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
import { useAuthStore } from "@/src/store/authStore";
import { WEBLOAN_BRANCHES } from "@/src/lib/api/types";
import type { PreLoanItem } from "@/src/lib/api/types";

import { loanApplicationSchema, type LoanApplicationFormData } from "./schema";
import { LoanTransfersProvider } from "./loan-transfers-provider";
import { CISLookup } from "./components/cis-lookup";
import { PersonalInfoSection } from "./components/personal-info-section";
import { LoanParametersSection } from "./components/loan-parameters-section";
import { ObligationsSection } from "./components/obligations-section";
import { OtherObligationsSection } from "./components/other-obligations";
import { VerificationSection } from "./components/verification-section";
import { DeviationsSection } from "./components/deviations-section";
import { ApprovalFormPreview } from "./components/approval-form-preview";

// ── Section definitions ─────────────────────────────────────────
// Sourced from ./sections so the stepper, mobile nav and every
// section header derive their numbering from one place. Adding or
// re-ordering sections is a single-file change.
import { SECTIONS, type SectionId, type SectionDef } from "./sections";

const SCROLL_OFFSET_PX = 96;

// ── Error counting utilities ────────────────────────────────────

/**
 * Per-section completion state for the stepper.
 *
 *  - `auto`     — data sourced from an upstream system (CIS, preloan,
 *                 approval generator). Shown with a distinct glyph so
 *                 the user doesn't conflate "data on file" with a
 *                 user-earned "complete" check.
 *  - `complete` — Account-Officer-entered data passes the presence
 *                 checks.
 *  - `error`    — there is a validation error after a submit attempt.
 *  - `active`   — currently in view (IntersectionObserver / scroll target).
 *  - `locked`   — section can't be reached yet (no client loaded).
 *  - `upcoming` — not yet started.
 */
type SectionStatus = "active" | "complete" | "auto" | "error" | "locked" | "upcoming";

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
          loan.proposedAmount > 0 &&
          loan.term > 0
        );
      case "verification":
        // `findings` is a required, non-empty string in the schema.
        return !!verification?.findings?.trim();
      case "deviations":
        // `otherRemarks` is always required. `deviationDetails` is
        // also required (as a non-empty array) when `hasDeviations`
        // is true — the schema's superRefine enforces the same at
        // submit time, but we mirror the check here so the sidebar
        // stepper turns green as soon as the AO has selected at
        // least one reason, without waiting for a submit attempt.
        if (!deviations?.otherRemarks?.trim()) return false;
        if (deviations.hasDeviations && (deviations.deviationDetails?.length ?? 0) === 0)
          return false;
        return true;
      case "approval-form":
        return isClientLoaded; // preview available once client is loaded
    }
  };

  const getStatus = (section: SectionDef, index: number): SectionStatus => {
    if (submitAttempted && sectionErrorCount(formState.errors, section.id) > 0)
      return "error";
    if (activeSection === section.id) return "active";
    // System-sourced sections become "auto" (data on file) the moment
    // a client is loaded — never a user-earned "complete" check.
    if (section.systemSourced)
      return isClientLoaded ? "auto" : "upcoming";
    if (isComplete(section.id)) return "complete";
    if (!isClientLoaded && index > 0) return "locked";
    return "upcoming";
  };

  const errorCount = (id: SectionId) =>
    submitAttempted ? sectionErrorCount(formState.errors, id) : 0;

  // Count everything that is "ready" — either user-completed or
  // auto-populated — so the progress bar reflects the real readiness
  // (e.g. "5 of 8 ready" once the client and their obligations are
  // in, not "1 of 8 required").
  const readyCount = SECTIONS.filter(
    (s) => isComplete(s.id) || (s.systemSourced && isClientLoaded)
  ).length;

  return { getStatus, errorCount, readyCount };
}

// ── Status icon ─────────────────────────────────────────────────

function StatusIcon({ status }: { status: SectionStatus }) {
  if (status === "complete")
    return <CheckCircle size={20} weight="fill" className="text-primary" />;
  if (status === "error")
    return (
      <WarningCircle size={20} weight="fill" className="text-destructive" />
    );
  // `auto` = data sourced from an upstream system. Distinct glyph so
  // it doesn't read as a user-earned "complete" check.
  if (status === "auto")
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
        <CloudCheck size={12} weight="bold" className="text-primary" />
        <span className="sr-only">Auto-populated</span>
      </div>
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
  const { getStatus, errorCount, readyCount } = useSectionProgress(
    isClientLoaded,
    preLoanSelected,
    submitAttempted,
    activeSection
  );

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-[calc(var(--header-height)+1rem)] space-y-6">
        {/* Progress summary */}
        <div className="space-y-2 px-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground">
              Application progress
            </h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              {readyCount} of {SECTIONS.length} ready
            </span>
          </div>
          <div
            className="h-1 rounded-full bg-muted"
            role="progressbar"
            aria-label="Sections ready"
            aria-valuemin={0}
            aria-valuemax={SECTIONS.length}
            aria-valuenow={readyCount}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(readyCount / SECTIONS.length) * 100}%` }}
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
                  {section.step}. {section.label}
                </span>
                {errors > 0 ? (
                  <Badge
                    variant="destructive"
                    className="h-5 min-w-5 px-1 tabular-nums text-[10px]"
                  >
                    {errors}
                  </Badge>
                ) : status === "auto" ? (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Auto
                  </span>
                ) : null}
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
      <nav aria-label="Application sections">
        <div className="flex gap-2 overflow-x-auto px-4 py-2">
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
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  status === "active"
                    ? "border-primary bg-primary text-primary-foreground"
                    : status === "error"
                      ? "border-destructive/40 bg-destructive/5 text-destructive"
                      : status === "complete" || status === "auto"
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-border text-muted-foreground",
                  status === "locked" && "opacity-50"
                )}
              >
                {section.step}. {section.label}
                {errors > 0 && (
                  <span className="tabular-nums font-bold">({errors})</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
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
        nthpDate: "",
      },
      outstandingLoans: [],
      ebiReloans: [],
      buyOuts: [],
      incomingLoans: [],
      preLoan: undefined,
      verification: { findings: "" },
      deviations: {
        hasDeviations: false,
        // `deviationDetails` is now a DeviationReason[] (the fixed
        // catalogue of deviation reasons surfaced by the wizard's
        // checkbox group). Seed as an empty array so the form passes
        // a stable, type-narrow shape to RHF on first mount.
        deviationDetails: [],
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
    setActiveSection(id);
    const top = Math.max(
      0,
      element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET_PX
    );
    window.scrollTo({ top, behavior: "smooth" });
    // Move screen-reader focus to the section heading so the user lands
    // on the destination, not at the bottom of the previous section.
    // Visual scroll stays smooth/unchanged (`preventScroll: true`).
    element
      .querySelector<HTMLElement>("[data-section-heading]")
      ?.focus({ preventScroll: true });
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

  const canSubmit = isClientLoaded && !!selectedPreLoan.id;
  const firstErrorSection = submitAttempted
    ? SECTIONS.find((s) => sectionErrorCount(errors, s.id) > 0)
    : undefined;

  return (
    <FormProvider {...methods}>
      {/* ── LoanTransfersProvider ─────────────────────────────────────
       * Must sit inside FormProvider because `useLoanTransfers` reads the
       * form via `useFormContext`. It mounts exactly one `useFieldArray`
       * per array name; Section 4 (Outstanding Loans) and Section 5
       * (EBI, Buy-Outs & Incoming) consume the shared instance via
       * `useLoanTransfersContext()` so a transfer in one section is
       * reflected in the other on the same render. */}
      <LoanTransfersProvider>
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="flex min-h-[calc(100vh-var(--header-height))] flex-col bg-muted/40"
        >
        {/* ── Top header ──────────────────────────────── */}
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

        {/* ── Mobile section nav ─────────────────────────────── */}
        <MobileSectionNav {...stepperProps} />

        <div className="container mx-auto flex flex-1 gap-8 px-6 py-8">
          {/* ── Desktop sidebar stepper (sticky wrapper lives inside
                DesktopStepper itself — single sticky container). */}
          <DesktopStepper {...stepperProps} />

          {/* ── Main form content ─────────────────────────────── */}
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
                  <ApprovalFormPreview ref={approvalFormRef} />
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
                  body="Choose which of the borrower's accounts this application is for. Active loans refresh."
                />
                <WorkflowHint
                  icon={<Stack size={16} weight="bold" />}
                  step="Step 3"
                  title="Attach a preloan"
                  body="If the borrower has a pending preloan on the selected account, pick one to resume it."
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
                <button
                  type="button"
                  onClick={() =>
                    firstErrorSection && scrollToSection(firstErrorSection.id)
                  }
                  className="underline-offset-4 hover:underline"
                >
                  {totalErrors} field{totalErrors === 1 ? "" : "s"} need
                  {totalErrors === 1 ? "s" : ""} attention — jump to first
                </button>
              </div>
            ) : (
              <p
                id="submit-hint"
                className="hidden text-sm text-muted-foreground md:block"
              >
                {!isClientLoaded
                  ? "Search for a CIS number to begin."
                  : !selectedPreLoan.id
                    ? "Pick an account and a preloan to continue."
                    : "Client verified, preloan attached. Ready for processing."}
              </p>
            )}
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="lg"
                className="gap-2 px-6"
                disabled={!canSubmit}
                aria-describedby={canSubmit ? undefined : "submit-hint"}
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
      </LoanTransfersProvider>
    </FormProvider>
  );
}
