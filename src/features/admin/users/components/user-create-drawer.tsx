import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { SignaturePad } from "@/src/components/ui/signature-pad";
import { BranchMultiSelect } from "@/src/components/ui/branch-multi-select";
import { toastError } from "@/src/components/ui/toast";
import { BRANCHES } from "@/src/lib/api/types";
import { stripRoleDisplayName } from "@/src/lib/role-badges";
import { useRoles } from "../hooks/use-roles";
import { useApprovalAuthorities } from "../hooks/use-approval-authorities";

/**
 * Payload contract for POST /api/users (CreateUserRequest).
 * The temporary password is generated here and sent to the backend;
 * it is revealed to the admin only after the account is created.
 */
export interface UserCreatePayload {
    username: string;
    password: string;
    firstName: string;
    middleName: string;
    lastName: string;
    branchId: string;
    role: string;
    jobTitle: string;
    eSignature: string | null;
    coveredBranches: string[] | null;
}

interface UserCreateDrawerProps {
    open: boolean;
    onClose: () => void;
    /** Creates the user via the API. Resolves true when created (drawer then shows confirmation). */
    onCreate: (payload: UserCreatePayload) => Promise<boolean>;
}

const emptyForm = {
    username: "",
    firstName: "",
    middleName: "",
    lastName: "",
    jobTitle: "",
    branchId: "",
    role: "",
    eSignature: null as string | null,
    coveredBranches: [] as string[],
};

// Mirrors backend CreateUserValidator: ^[a-zA-Z0-9_]+$, max 50 chars.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/**
 * Value→label lookup for the branch <Select> trigger. Base UI's
 * <Select.Value> renders the raw value (the branch code, e.g. "000")
 * unless the Root receives an `items` map — without it the closed
 * trigger shows the code instead of "Lianga Branch". Module-level so
 * the array identity is stable across renders.
 */
const BRANCH_SELECT_ITEMS = BRANCHES.map((branch) => ({
    value: branch.code,
    label: branch.name,
}));

/**
 * Formats a number as Philippine Peso currency string.
 */
function formatPhp(amount: number): string {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Generates a readable temporary password using cryptographically secure
 * randomness that satisfies the backend policy: at least one uppercase, one
 * lowercase, one digit, and one special character (!?*.). Ambiguous
 * characters (O/0, I/l/1) are excluded so the password survives being read
 * aloud or transcribed by hand.
 */
function generateTempPassword(length = 12): string {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const specials = "!?*.";
    const all = upper + lower + digits + specials;

    const pick = (set: string) => {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return set[buf[0] % set.length];
    };

    // Guarantee at least one character from each required class.
    const chars = [pick(upper), pick(lower), pick(digits), pick(specials)];
    while (chars.length < length) chars.push(pick(all));

    // Fisher–Yates shuffle so the guaranteed characters aren't front-loaded.
    for (let i = chars.length - 1; i > 0; i--) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        const j = buf[0] % (i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

export function UserCreateDrawer({ open, onClose, onCreate }: UserCreateDrawerProps) {
    const { data: roles } = useRoles();
    // Same lookup semantics as BRANCH_SELECT_ITEMS; roles arrive async,
    // so memoize on the fetched list.
    const roleSelectItems = useMemo(
        () => roles.map((role) => ({ value: role.name, label: stripRoleDisplayName(role.displayName) })),
        [roles],
    );
    const [form, setForm] = useState(emptyForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch approval authorities only when role is Approver (for the dropdown).
    const isApprover = form.role === "Approver";
    const { data: authorities, isLoading: authoritiesLoading } = useApprovalAuthorities(isApprover);

    // Determine if the selected authority is Branch-scope (scopeType === 0).
    const selectedAuthority = isApprover ? (authorities ?? []).find(a => a.key === form.jobTitle) : null;
    const isBranchScope = isApprover && selectedAuthority?.scopeType === 0;

    const handleFieldChange = <K extends keyof typeof emptyForm>(field: K, value: typeof emptyForm[K]) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };
            // When switching away from Approver, clear the authority selection
            // and covered branches so stale data doesn't leak.
            if (field === "role" && value !== "Approver") {
                next.jobTitle = "";
                next.coveredBranches = [];
            }
            // When switching to Approver, also clear jobTitle since the user
            // needs to pick from the authority dropdown (not type free text).
            if (field === "role" && value === "Approver") {
                next.jobTitle = "";
                next.coveredBranches = [];
            }
            // When the authority changes, clear covered branches if the new
            // authority is not Branch-scope (scopeType !== 0).
            if (field === "jobTitle" && prev.role === "Approver") {
                const selectedAuth = (authorities ?? []).find(a => a.key === value);
                if (selectedAuth && selectedAuth.scopeType !== 0) {
                    next.coveredBranches = [];
                }
            }
            return next;
        });
    };

    const handleCreate = async () => {
        if (!form.username.trim()) {
            toastError("Username is required");
            return;
        }
        if (!USERNAME_PATTERN.test(form.username.trim())) {
            toastError("Username must be alphanumeric (letters, numbers, underscores)");
            return;
        }
        if (form.username.trim().length > 50) {
            toastError("Username must not exceed 50 characters");
            return;
        }
        if (!form.firstName.trim()) {
            toastError("First name is required");
            return;
        }
        if (!form.lastName.trim()) {
            toastError("Last name is required");
            return;
        }
        if (form.jobTitle.length > 100) {
            toastError("Job title must not exceed 100 characters");
            return;
        }
        if (!form.branchId) {
            toastError("Branch is required");
            return;
        }
        if (!form.role) {
            toastError("Role is required");
            return;
        }
        // Approvers must select an authority from the matrix.
        if (form.role === "Approver" && !form.jobTitle) {
            toastError("Please select an approval authority for this Approver.");
            return;
        }
        // Branch-scope approvers must select at least one covered branch.
        if (form.role === "Approver" && isBranchScope && form.coveredBranches.length === 0) {
            toastError("Please select at least one covered branch for this Branch-scope approver.");
            return;
        }
        if (!form.eSignature) {
            toastError("Signature is required. Please sign the pad.");
            return;
        }

        setIsSubmitting(true);
        try {
            // The generated password travels with the payload; the backend
            // hashes it (BCrypt) before storage — it is never stored in clear.
            const tempPassword = generateTempPassword();
            const success = await onCreate({
                username: form.username.trim(),
                password: tempPassword,
                firstName: form.firstName.trim(),
                middleName: form.middleName.trim(),
                lastName: form.lastName.trim(),
                jobTitle: form.jobTitle.trim(),
                branchId: form.branchId,
                role: form.role,
                eSignature: form.eSignature,
                // Set to null when not applicable so the backend's
                // null = "keep existing" semantics work correctly on update.
                coveredBranches: isBranchScope && form.coveredBranches.length > 0
                    ? form.coveredBranches
                    : null,
            });
            if (!success) return;

            // Parent handles the secure handoff dialog — just close and reset.
            setForm(emptyForm);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setForm(emptyForm);
        onClose();
    };

    return (
        <Sheet open={open} onOpenChange={(next) => !next && handleCancel()}>
            <SheetContent className="flex flex-col p-0 sm:max-w-[500px]">
                <SheetHeader className="border-b bg-muted/30 p-6 pb-4">
                    <SheetTitle>Create New User</SheetTitle>
                    <SheetDescription>Add a new user to the ALAS system.</SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    <div className="space-y-2">
                        <Label htmlFor="create-username">Username *</Label>
                        <Input
                            id="create-username"
                            value={form.username}
                            onChange={(e) => handleFieldChange("username", e.target.value)}
                            placeholder="jdelacruz"
                            autoComplete="off"
                            className="h-9"
                        />
                        <p className="text-xs text-muted-foreground">Letters, numbers and underscores only.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="create-firstName">First Name *</Label>
                            <Input
                                id="create-firstName"
                                value={form.firstName}
                                onChange={(e) => handleFieldChange("firstName", e.target.value)}
                                placeholder="Juan"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create-middleName">Middle Name</Label>
                            <Input
                                id="create-middleName"
                                value={form.middleName}
                                onChange={(e) => handleFieldChange("middleName", e.target.value)}
                                placeholder="Optional"
                                className="h-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-lastName">Last Name *</Label>
                        <Input
                            id="create-lastName"
                            value={form.lastName}
                            onChange={(e) => handleFieldChange("lastName", e.target.value)}
                            placeholder="Dela Cruz"
                            className="h-9"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-branch">Assigned Branch *</Label>
                        <Select value={form.branchId} onValueChange={(value) => handleFieldChange("branchId", value ?? "")} items={BRANCH_SELECT_ITEMS}>
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {BRANCHES.map(b => <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="create-role">Primary Role *</Label>
                        <Select value={form.role} onValueChange={(value) => handleFieldChange("role", value ?? "")} items={roleSelectItems}>
                            <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(r => <SelectItem key={r.name} value={r.name}>{stripRoleDisplayName(r.displayName)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">A temporary password will be generated for this account.</p>
                    </div>

                    {/* ── Job Title / Approval Authority ── */}
                    <div className="space-y-2">
                        <Label htmlFor="create-jobTitle">
                            {isApprover ? "Approval Authority *" : "Job Title"}
                        </Label>
                        {isApprover ? (
                            <Select
                                value={form.jobTitle}
                                onValueChange={(value) => handleFieldChange("jobTitle", value ?? "")}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder={authoritiesLoading ? "Loading authorities..." : "Select approval authority"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(authorities ?? []).map((auth) => (
                                        <SelectItem key={auth.key} value={auth.key}>
                                            {auth.displayName} — Tier {auth.tier}, up to {formatPhp(auth.maxTotalExposure)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                id="create-jobTitle"
                                value={form.jobTitle}
                                onChange={(e) => handleFieldChange("jobTitle", e.target.value)}
                                placeholder="e.g. Senior Credit Evaluator"
                                maxLength={100}
                                className="h-9"
                            />
                        )}
                        <p className="text-xs text-muted-foreground">
                            {isApprover
                                ? "Determines which loans this approver can authorize (delegation of authority)."
                                : "Complements the workflow role and shows up on audit trails."}
                        </p>
                    </div>

                    {/* ── Covered Branches (Branch-scope Approvers only) ── */}
                    {isBranchScope && (
                        <div className="space-y-2">
                            <Label>Covered Branches *</Label>
                            <BranchMultiSelect
                                branches={BRANCHES}
                                selected={form.coveredBranches}
                                onChange={(codes) => handleFieldChange("coveredBranches", codes)}
                                placeholder="Select branches this approver covers"
                            />
                            <p className="text-xs text-muted-foreground">
                                This approver can authorize loans from the selected branches.
                            </p>
                        </div>
                    )}

                    {/* ── Signature Pad ── */}
                    <div className="space-y-2">
                        <Label htmlFor="create-signature">E-Signature *</Label>
                        <SignaturePad
                            value={form.eSignature}
                            onChange={(base64) => handleFieldChange("eSignature", base64)}
                            heightClassName="h-40"
                        />
                        <p className="text-xs text-muted-foreground">
                            Required for audit compliance. The signature will appear on loan approval forms.
                        </p>
                    </div>
                </div>

                <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
                    <Button variant="outline" className="h-9" onClick={handleCancel}>Cancel</Button>
                    <Button className="h-9" onClick={handleCreate} disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Create User"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
