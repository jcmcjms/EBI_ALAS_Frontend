import { useCallback, useEffect, useState } from "react";
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
  type WebLoanBorrower,
} from "@/src/lib/api/types";
import { useAuthStore } from "@/src/store/authStore";
import { cn } from "@/src/lib/utils";

import type { LoanApplicationFormData } from "../schema";

/** Formats an ISO datetime as yyyy-MM-dd for <input type="date"> fields. */
function toDateInput(iso?: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

/** Null-safe numeric coercion for decimal fields coming from the API. */
function toNumber(value?: number | null): number {
  return typeof value === "number" ? value : 0;
}

export function CISLookup() {
  const { control, setValue, getValues, register } =
    useFormContext<LoanApplicationFormData>();
  const user = useAuthStore((state) => state.user);

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Single source of truth: the loaded client is derived from form state,
  // so draft restore / future hydration works without duplicated state.
  const client = useWatch({ control, name: "client" });
  const branchType = useWatch({ control, name: "branchType" });
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

  // The requesting officer is the authenticated identity — display-only here.
  // The backend must authoritatively derive it from the JWT on submit.
  useEffect(() => {
    if (user && !getValues("branchType.requestingOfficer")) {
      setValue(
        "branchType.requestingOfficer",
        [user.firstName, user.middleName, user.lastName]
          .filter(Boolean)
          .join(" ")
      );
    }
  }, [user, getValues, setValue]);

  // Auto-reset the two-click confirm after 3s.
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  /** Resets all CIS-populated fields. Officer identity is intentionally kept. */
  const clearForm = useCallback(() => {
    setValue("branchType.loanType", "");
    setValue("branchType.branch", "");
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
      const borrower = await getWebLoanByCis(query);
      applyBorrower(borrower, query);
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

  /** Maps the GET /api/webloans/cis/{cisNo} payload onto the loan application form. */
  const applyBorrower = (borrower: WebLoanBorrower, query: string) => {
    const b = borrower.branchAndType;
    const p = borrower.personalInformation;
    const li = borrower.loanInformation;

    // Branch is stored/displayed by name (resolved from the WEBLOAN_BRANCHES
    // snapshot); an unknown code falls back to the raw code so nothing renders blank.
    const branchName = b.branchCode
      ? WEBLOAN_BRANCHES.find((x) => x.code === b.branchCode)?.name ??
        b.branchCode
      : "";
    setValue("branchType.loanType", b.type ?? "");
    setValue("branchType.branch", branchName);
    setValue("branchType.lai", (b.lai ?? []).join(", "));

    setValue("client.cisId", b.cisNo || query);
    setValue("client.firstName", p.firstName ?? "");
    setValue("client.middleName", p.middleName ?? "");
    setValue("client.lastName", p.lastName ?? "");
    setValue("client.suffix", p.suffix ?? "");
    setValue("client.birthdate", toDateInput(p.birthdate));
    setValue("client.address", p.address ?? "");
    setValue("client.agency", p.agencyName ?? "");
    setValue("client.position", p.positionTitle ?? "");
    setValue("client.employeeId", p.employeeNo ?? "");
    setValue("client.region", p.regionCode ?? "");
    setValue("client.divisionCode", p.divisionCode ?? "");
    setValue("client.stationCode", p.stationCode ?? "");
    setValue("client.misAgency", p.misAgency ?? "");

    setValue("loan.purpose", li.purpose ?? "");
    setValue("loan.proposedAmount", toNumber(li.proposedAmount));
    setValue("loan.term", toNumber(li.termMonths));
    setValue("loan.interestRate", toNumber(li.interestRate));

    setValue(
      "outstandingLoans",
      (borrower.outstandingLoans ?? []).map((o) => ({
        pn: o.pn,
        principalBalance: toNumber(o.principalBalance),
        amortization: toNumber(o.amortization),
        outstandingBalance: toNumber(o.outstandingBalance),
        dateGranted: toDateInput(o.dateGranted),
        dateMaturity: toDateInput(o.dateMaturity),
        status: o.status ?? "Active",
      }))
    );

    setValue(
      "ebiReloans",
      (borrower.ebiReloanAccounts ?? []).map((r) => ({
        pn: r.pn,
        name: r.name ?? "",
        existingDeduction: toNumber(r.existingDeductions),
        // Template column "OB to be paid/closed" maps to payToClose
        outstandingBalance: toNumber(r.payToClose),
      }))
    );

    setValue(
      "buyOuts",
      (borrower.buyOutAccounts ?? []).map((x) => ({
        pn: x.pn,
        name: x.name ?? "",
        amortization: toNumber(x.amortization),
        outstandingBalance: toNumber(x.outstandingBalance),
      }))
    );

    setValue(
      "incomingLoans",
      (borrower.incomingLoans ?? []).map((i) => ({
        name: i.name ?? "",
        deductions: toNumber(i.deductions),
        remarks: i.remarks ?? "",
      }))
    );
  };

  return (
    <Card>
      <CardHeader className="border-b bg-muted/30 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <IdentificationCard
            size={20}
            weight="bold"
            className="text-primary"
          />
          1. Client Lookup (CIS Number)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
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
              className="h-10 pl-9 font-mono"
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
              <Badge variant="outline" className="font-mono">
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
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    LAI (Loan Application Index)
                  </Label>
                  <Input
                    {...register("branchType.lai")}
                    readOnly
                    className="h-9 bg-muted/50 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Pristine helper text ───────────────────────────── */}
        {!isLoaded && !isLoading && !lookupError && (
          <p className="text-xs text-muted-foreground">
            Profile, branch routing and existing obligations are pulled
            automatically from the CIS — you only encode the proposed
            terms.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
