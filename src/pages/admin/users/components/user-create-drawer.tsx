import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, Copy } from "@phosphor-icons/react";
import { BRANCHES } from "@/src/lib/api/types";
import { useRoles } from "@/src/hooks/use-roles";

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
    branchId: "",
    role: "",
};

// Mirrors backend CreateUserValidator: ^[a-zA-Z0-9_]+$, max 50 chars.
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

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
    const [form, setForm] = useState(emptyForm);
    const [createdUser, setCreatedUser] = useState<{ name: string; username: string } | null>(null);
    const [tempPassword, setTempPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFieldChange = <K extends keyof typeof emptyForm>(field: K, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleCreate = async () => {
        if (!form.username.trim()) {
            toast.error("Username is required");
            return;
        }
        if (!USERNAME_PATTERN.test(form.username.trim())) {
            toast.error("Username must be alphanumeric (letters, numbers, underscores)");
            return;
        }
        if (form.username.trim().length > 50) {
            toast.error("Username must not exceed 50 characters");
            return;
        }
        if (!form.firstName.trim()) {
            toast.error("First name is required");
            return;
        }
        if (!form.lastName.trim()) {
            toast.error("Last name is required");
            return;
        }
        if (!form.branchId) {
            toast.error("Branch is required");
            return;
        }
        if (!form.role) {
            toast.error("Role is required");
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
                branchId: form.branchId,
                role: form.role,
            });
            if (!success) return;

            // Capture identity before clearing the form, then reveal the
            // generated temporary password in the confirmation step.
            setCreatedUser({
                name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
                username: form.username.trim(),
            });
            setTempPassword(tempPassword);
            setForm(emptyForm);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(tempPassword);
            toast.success("Temporary password copied to clipboard");
        } catch {
            toast.error("Could not copy — please select and copy manually");
        }
    };

    const resetAll = () => {
        setForm(emptyForm);
        setCreatedUser(null);
        setTempPassword("");
    };

    const handleCancel = () => {
        resetAll();
        onClose();
    };

    const isCreated = createdUser !== null && tempPassword !== "";

    return (
        <Sheet open={open} onOpenChange={(next) => !next && handleCancel()}>
            <SheetContent className="flex flex-col p-0 sm:max-w-[500px]">
                {isCreated ? (
                    <>
                        <SheetHeader className="border-b bg-muted/30 p-6 pb-4">
                            <SheetTitle>User Created</SheetTitle>
                            <SheetDescription>
                                Share this temporary password securely — it will not be shown again.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="flex flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-6">
                            <CheckCircle size={40} weight="fill" className="text-emerald-600" />

                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">{createdUser.name}</p>
                                <p className="text-xs text-muted-foreground">@{createdUser.username}</p>
                            </div>

                            <div className="w-full space-y-2 border bg-muted/30 p-4">
                                <Label htmlFor="temp-password">Temporary Password</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="temp-password"
                                        readOnly
                                        value={tempPassword}
                                        onFocus={(e) => e.target.select()}
                                        className="h-9"
                                    />
                                    <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopyPassword}>
                                        <Copy size={14} />
                                        <span className="sr-only">Copy password</span>
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    The user will be prompted to change this password on first login.
                                </p>
                            </div>
                        </div>

                        <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
                            <Button className="h-9" onClick={handleCancel}>Done</Button>
                        </SheetFooter>
                    </>
                ) : (
                    <>
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
                                <Select value={form.branchId} onValueChange={(value) => handleFieldChange("branchId", value ?? "")}>
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
                                <Select value={form.role} onValueChange={(value) => handleFieldChange("role", value ?? "")}>
                                    <SelectTrigger className="h-9 w-full">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map(r => <SelectItem key={r.name} value={r.name}>{r.displayName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">A temporary password will be generated for this account.</p>
                            </div>
                        </div>

                        <SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
                            <Button variant="outline" className="h-9" onClick={handleCancel}>Cancel</Button>
                            <Button className="h-9" onClick={handleCreate} disabled={isSubmitting}>
                                {isSubmitting ? "Creating..." : "Create User"}
                            </Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
