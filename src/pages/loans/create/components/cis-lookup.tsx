import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowCounterClockwise,
  IdentificationCard,
  LockSimple,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Skeleton } from "@/src/components/ui/skeleton";
import { getErrorMessage } from "@/src/lib/apiClient";
import { getWebLoanByCis } from "@/src/lib/api/webloans";
import {
  WEBLOAN_BRANCHES,
  type PreLoanItem,
  type WebLoanAccount,
  type WebLoanCisSearchResponse,
} from "@/src/lib/api/types";
import { cn } from "@/src/lib/utils";

import { ActiveLoansTable } from "./active-loans-table";
import type { LoanApplicationFormData } from "../schema";

/** Formats an ISO datetime as yyyy-MM-dd for <input type="date"> fields. */
function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** Null-safe numeric coercion for decimal fields coming from the API. */
// (Removed legacy helper — CIS search no longer carries decimal fields
// that the form pre-fills; loan parameters and obligations come from the
// dedicated pending-loan endpoint or are entered manually later.)

interface CISLookupProps {
  /** Acting user's branchId — passed down to the preloan picker as a UI label. */
  userBranchId: string;
  /** Currently selected preloan id (controlled). */
  selectedPreLoanId: string;
  /** Callback fired when the AO picks / clears a preloan. */
  onPreLoanChange: (id: string, preloan: PreLoanItem | null) => void;
}

export function CISLookup({
  userBranchId,
  selectedPreLoanId,
  onPreLoanChange,
}: CISLookupProps) {
  const { control, setValue, register } =
    useFormContext<LoanApplicationFormData>();

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Raw LAI list (full account rows) from the loaded borrower. Kept in
  // component-local state because the form only stores the joined display
  // string ("011-05-13081-1, 011-..."). Each row carries the combined
  // `accountId` ("<branchCode>-<accountNo>") the ActiveLoansTable's
  // outstanding-loans / pending-loan endpoints require on their route.
  const [laiAccounts, setLaiAccounts] = useState<WebLoanAccount[]>([]);
  // Count of outstanding (active) loans already known from the loaded
  // profile. Surfaced as a hint badge on the ActiveLoansTable card.
  const [outstandingCount, setOutstandingCount] = useState(0);

  // Keep the parent's `onPreLoanChange` in a ref so `clearForm` can stay
  // stable across re-renders — otherwise the parent re-creating the
  // callback every render would invalidate `clearForm`'s identity and
  // re-run downstream effects.
  const onPreLoanChangeRef = useRef(onPreLoanChange);
  useEffect(() => {
    onPreLoanChangeRef.current = onPreLoanChange;
  }, [onPreLoanChange]);

  // Single source of truth: the loaded client is derived from form state,
  // so draft restore / future hydration works without duplicated state.
  const client = useWatch({ control, name: "client" });
  const isLoaded = !!client.cisId;

  const fullName = [
    client.firstName,
    client.middleName,
    client.lastName,
    client.suffix,
  ]
    .filter(Boolean)
    .join(" ");
  const initials =
    [client.firstName?.[0], client.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";

  // The requesting officer is sourced from webloan data (branchAndType.requestingOfficer).
  // Backend resolves loan_acct_info.solicitor → dbo.mis_group (group_no=2) → description
  // (e.g. "ALDREX JOEY L. CEZAR"). On submit, the API must still re-authoritatively
  // derive the acting officer from the JWT — never trust the client-provided value.

  // Auto-reset the two-click confirm after 3s.
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  /** Resets all CIS-populated fields so a new client can be loaded. */
  const clearForm = useCallback(() => {
    setValue("branchType.loanType", "");
    setValue("branchType.branch", "");
    setValue("branchType.requestingOfficer", "");
    setValue("branchType.lai", "");
    setValue("client.cisId", "");
    setValue("client.firstName", "");
    setValue("client.middleName", "");
    setValue("client.lastName", "");
    setValue("client.suffix", "");
    setValue("client.birthdate", "");
    setValue("client.address", "");
    setValue("client.agency", "");
    setValue("client.position", "");
    setValue("client.employeeId", "");
    setValue("client.region", "");
    setValue("client.divisionCode", "");
    setValue("client.stationCode", "");
    setValue("client.misAgency", "");
    setValue("loan.purpose", "");
    setValue("loan.proposedAmount", 0);
    setValue("loan.term", 0);
    setValue("loan.interestRate", 0);
    setValue("outstandingLoans", []);
    setValue("ebiReloans", []);
    setValue("buyOuts", []);
    setValue("incomingLoans", []);
    setValue("preLoan", undefined);
    setLaiAccounts([]);
    setOutstandingCount(0);
    // Drop any preloan that was attached to the previous client.
    onPreLoanChangeRef.current("", null);
  }, [setValue]);

  const handleChangeClient = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearForm();
    setConfirmClear(false);
    setSearchQuery("");
    setLookupError(null);
    toast.info("Client cleared. Search for a new CIS number.");
  };

  const handleLookup = async () => {
    const query = searchQuery.trim();
    if (!query || isLoading) return;

    setIsLoading(true);
    setLookupError(null);

    try {
      const result = await getWebLoanByCis(query);
      applySearchResult(result, query);
      toast.success("Client profile loaded successfully.");
    } catch (error) {
      const message = getErrorMessage(error);
      clearForm();
      setLookupError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Maps the GET /api/webloans/cis/{cisNo}/search payload onto the loan
   * application form.
   *
   * Backend contract is `WebLoanCisSearchResponse` (see
   * `src/lib/api/types.ts`): a flat `{ borrower, accounts[] }` envelope.
   *  - `borrower.*`  → `client.*` (and `branchType.requestingOfficer`).
   *  - `accounts[]`  → LAI picker (`laiAccounts` + `branchType.branch`
   *                    + `branchType.loanType` + `branchType.lai`).
   *
   * Fields the backend does NOT supply (purpose / proposedAmount /
   * term / interestRate / outstandingLoans / ebiReloans / buyOuts /
   * incomingLoans) are intentionally left to their existing form
   * defaults — they are either entered manually later in the wizard
   * or sourced from the dedicated pending-loan endpoint after the AO
   * picks an account.
   */
  const applySearchResult = (
    result: WebLoanCisSearchResponse,
    query: string
  ) => {
    const b = result.borrower;
    const accounts = result.accounts ?? [];

    // Capture the raw account list so the ActiveLoansTable card below
    // can populate its account picker without re-fetching the borrower.
    // Pass the full rows (not just accountNo) so the picker can display
    // and submit the combined "<bch>-<acctNo>" identifier the
    // outstanding-loans / pending-loan endpoints expect.
    setLaiAccounts(accounts);

    // The backend doesn't expose an outstanding-loan count from this
    // endpoint (that's served by /pending-loan once an account is picked).
    // Keep the badge count at 0 so we don't show a misleading "N on file"
    // hint until the real source-of-truth endpoint populates it.
    setOutstandingCount(0);

    // Branch is stored/displayed by name (resolved from the WEBLOAN_BRANCHES
    // snapshot). All accounts under a CIS typically share the same branch
    // code (loan_acct_info.bch); we use the first account's branchCode for
    // the displayed label.
    const firstBranchCode = accounts[0]?.branchCode ?? "";
    const branchName = firstBranchCode
      ? WEBLOAN_BRANCHES.find((x) => x.code === firstBranchCode)?.name ??
        firstBranchCode
      : "";
    setValue("branchType.loanType", "");
    setValue("branchType.branch", branchName);
    // Join the combined "<bch>-<acctNo>" identifiers into the form's
    // display string. Mirrors the route parameter so the AO sees the
    // same value the backend will use downstream.
    setValue(
      "branchType.lai",
      accounts.map((a) => a.accountId).join(", ")
    );
    // Requesting officer resolved by the backend from loan_acct_info.solicitor
    // → dbo.mis_group (group_no=2) → description. Display-only; the API
    // re-derives the acting officer from the JWT on submit.
    setValue("branchType.requestingOfficer", b.requestingOfficer ?? "");

    setValue("client.cisId", b.cisNo || query);
    setValue("client.firstName", b.firstName ?? "");
    setValue("client.middleName", b.middleName ?? "");
    setValue("client.lastName", b.lastName ?? "");
    // The backend exposes `appelation` (suffix) and `title` — the form
    // schema only has `suffix`, so we surface `appelation` there. Title
    // is intentionally not mapped (no field on the form schema).
    setValue("client.suffix", b.appelation ?? "");
    setValue("client.birthdate", toDateInput(b.birthDate));
    setValue("client.address", b.address ?? "");
    // Agency: backend exposes only `agencyType` (the resolved description
    // e.g. "RPSU"); the form has a single `agency` field that the existing
    // legacy UI used for either type or company. Map the agency type here.
    setValue("client.agency", b.agencyType ?? "");
    setValue("client.position", b.positionTitle ?? "");
    setValue("client.employeeId", b.employeeNumber ?? "");
    setValue("client.region", b.regionCode ?? "");
    setValue("client.divisionCode", b.divisionCode ?? "");
    setValue("client.stationCode", b.stationCode ?? "");
    // `lengthOfService` is sourced from check_list_data CCR10 on the
    // backend — surface it directly so the AO doesn't have to re-enter it.
    setValue("client.lengthOfService", b.lengthOfService ?? "");
    // The backend exposes only the resolved `misAgency` (cat_mis_group2 →
    // mis_group.path). The raw primary path (cat_mis_group) is no longer
    // sent over the wire, so there's nothing to fall back to.
    setValue("client.misAgency", b.misAgency ?? "");

    // Loan parameters and obligations are NOT pre-filled from CIS search:
    //  - `loan.purpose / proposedAmount / term / interestRate` are
    //    captured manually per application (no "borrower's most recent
    //    loan" carry-over by design).
    //  - `outstandingLoans` is sourced from the in-flight pending-loan
    //    endpoint (GET .../pending-loan) once the AO picks an account.
    //  - `ebiReloans / buyOuts / incomingLoans` are entered manually in
    //    later wizard steps — no backend endpoint exposes them.
    // clearForm() already reset these to their schema defaults before
    // this function runs (via the parent component's reset cycle), so
    // there's nothing left to write here.

    // Mark the form as loaded — `isLoaded` is derived from
    // `useWatch({ control, name: "client" })` above.
  };

  return (
    <Card className="flex max-h-[max(28rem,calc(100dvh_-_var(--header-height)_-_12rem))] flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <IdentificationCard
            size={20}
            weight="bold"
            className="text-primary"
          />
          1. Client Lookup (CIS Number)
        </CardTitle>
      </CardHeader>
      <CardContent
        className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pt-6"
        role="region"
        aria-label="Client lookup, account and preloan selection"
        tabIndex={0}
      >
        {/* ── CIS search ─────────────────────────────────────── */}
        <div className="flex gap-3 items-center">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute left-3 top-3 text-muted-foreground"
            />
            <Input
              placeholder="Enter CIS Number..."
              aria-label="CIS number"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (!val.trim() && isLoaded) clearForm();
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="h-10 pl-9 tabular-nums"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleLookup}
            disabled={isLoading || !searchQuery.trim()}
            className="h-10 shrink-0 px-6"
          >
            {isLoading ? "Fetching..." : "Fetch Profile"}
          </Button>
        </div>

        {/* ── Persistent inline error ────────────────────────── */}
        {/* Toast alone disappears before it can be acted on. */}
        {lookupError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <div className="flex items-start gap-2">
              <WarningCircle
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
              />
              <div>
                <p className="font-medium">Unable to load client profile</p>
                <p className="text-xs opacity-90">{lookupError}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 gap-1.5 text-destructive"
              onClick={handleLookup}
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              Retry
            </Button>
          </div>
        )}

        {/* ── Loading skeleton ────────────────────────────────── */}
        {isLoading && (
          <div
            className="space-y-4 rounded-md border bg-muted/20 p-4"
            aria-label="Loading client profile"
            aria-busy="true"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          </div>
        )}

        {/* ── Loaded client summary + system-verified routing ── */}
        {isLoaded && !isLoading && (
          <div className="space-y-4">
            {/* Client identity strip */}
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {fullName || "—"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    client.agency,
                    client.position,
                    client.employeeId && `ID ${client.employeeId}`,
                  ]
                    .filter(Boolean)
                    .join(" \u2022 ") || "No agency details on file"}
                </p>
              </div>
              <Badge variant="outline" className="tabular-nums">
                CIS {client.cisId}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleChangeClient}
                className={cn(
                  "gap-1.5",
                  confirmClear && "text-destructive hover:text-destructive"
                )}
              >
                {confirmClear ? (
                  <>
                    <WarningCircle size={14} weight="fill" />
                    Confirm — clears entered data
                  </>
                ) : (
                  <>
                    <ArrowCounterClockwise size={14} weight="bold" />
                    Change client
                  </>
                )}
              </Button>
            </div>

            {/* Branch & Type (system-verified, read-only) */}
            <div className="space-y-4 rounded-md border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Branch & Type
                </h4>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-xs font-normal"
                >
                  <LockSimple size={12} weight="bold" />
                  System Verified
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Loan Type
                  </Label>
                  <Input
                    {...register("branchType.loanType")}
                    readOnly
                    className="h-9 bg-muted/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Branch
                  </Label>
                  <Input
                    {...register("branchType.branch")}
                    readOnly
                    className="h-9 bg-muted/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Requesting Officer
                  </Label>
                  <Input
                    {...register("branchType.requestingOfficer")}
                    readOnly
                    className="h-9 bg-muted/50"
                  />
                </div>
              </div>
            </div>

            {/* Active Loans by Account — mirrors the reference "Active
                Loans by existing borrower" SQL for the selected (CIS,
                account) pair. Renders a picker for the borrower's
                accounts and a table of up to 10 active PN rows. */}
            <ActiveLoansTable
              cisNo={client.cisId}
              accounts={laiAccounts}
              totalActiveLoansCount={outstandingCount}
              userBranchId={userBranchId}
              selectedPreLoanId={selectedPreLoanId}
              onPreLoanChange={onPreLoanChange}
            />
          </div>
        )}


        {/* ── Pristine helper text ───────────────────────────── */}
        {!isLoaded && !isLoading && !lookupError && (
          <p className="text-xs text-muted-foreground">
            Profile, branch routing and existing obligations are pulled
            automatically from the CIS.
          </p>
        )}

      </CardContent>
    </Card>
  );
}
