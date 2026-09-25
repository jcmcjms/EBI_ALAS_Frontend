/**
 * Change-password gate — serves both the forced flow (mustChangePassword)
 * and voluntary changes.  Chromeless by design: no AppShell, no navigation,
 * mirrors the login page's visual language so the gate reads as part of
 * the authentication surface, not the app.
 */

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
    CircleNotch,
    Eye,
    EyeSlash,
    Check,
    X,
    SignOut,
    WarningCircle,
} from "@phosphor-icons/react";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { cn } from "@/src/lib/utils";
import { useAuthStore } from "@/src/store/authStore";
import { apiClient, getErrorMessage } from "@/src/lib/apiClient";
import {
    changePasswordSchema,
    type ChangePasswordFormData,
} from "../schemas";

/** Mirrors the server policy (BankingSecurityValidator) so feedback is instant. */
const RULES = [
    {
        id: "len",
        label: "At least 8 characters",
        test: (pw: string) => pw.length >= 8,
    },
    {
        id: "upper",
        label: "One uppercase letter",
        test: (pw: string) => /[A-Z]/.test(pw),
    },
    {
        id: "lower",
        label: "One lowercase letter",
        test: (pw: string) => /[a-z]/.test(pw),
    },
    {
        id: "digit",
        label: "One number",
        test: (pw: string) => /\d/.test(pw),
    },
    {
        id: "special",
        label: "One of !?*.",
        test: (pw: string) => /[!?*.]/.test(pw),
    },
] as const;

const STRENGTH = [
    { label: "Too weak", bar: "bg-destructive" },
    { label: "Weak", bar: "bg-destructive" },
    { label: "Fair", bar: "bg-amber-500" },
    { label: "Good", bar: "bg-emerald-500" },
    { label: "Strong", bar: "bg-emerald-600" },
] as const;

function RevealToggle({
    revealed,
    onToggle,
    label,
}: {
    revealed: boolean;
    onToggle: () => void;
    label: string;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
            onClick={onToggle}
            aria-label={label}
            aria-pressed={revealed}
        >
            {revealed ? (
                <EyeSlash size={16} weight="bold" />
            ) : (
                <Eye size={16} weight="bold" />
            )}
        </Button>
    );
}

export default function ChangePassword() {
    const navigate = useNavigate();
    const mustChange = useAuthStore(
        (s) => s.user?.mustChangePassword ?? false,
    );
    const clearSession = useAuthStore((s) => s.clearSession);

    const [reveal, setReveal] = useState({
        current: false,
        next: false,
        confirm: false,
    });
    const [capsOn, setCapsOn] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        mode: "onBlur",
    });

    const newPassword = watch("newPassword") ?? "";
    const confirmPassword = watch("confirmPassword") ?? "";

    const met = useMemo(
        () => RULES.filter((r) => r.test(newPassword)).length,
        [newPassword],
    );
    const score = useMemo(() => {
        if (met === 0) return 0;
        const bonus = newPassword.length >= 12 ? 1 : 0;
        return Math.min(4, Math.ceil((met + bonus) / 1.5));
    }, [met, newPassword]);
    const matches =
        confirmPassword.length > 0 && confirmPassword === newPassword;

    const capsHandler = (e: React.KeyboardEvent) =>
        setCapsOn(e.getModifierState?.("CapsLock") ?? false);

    const signOut = () => {
        clearSession();
        navigate("/login", { replace: true });
    };

    const onSubmit = async (data: ChangePasswordFormData) => {
        try {
            await apiClient.post("/api/auth/change-password", {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });
            // Backend revokes every session on success — re-login is mandatory.
            toastSuccess(
                "Password changed. Sign in with your new password.",
            );
            clearSession();
            navigate("/login", { replace: true });
        } catch (error) {
            const status = (
                error as { response?: { status?: number } }
            )?.response?.status;
            const message = (
                error as {
                    response?: { data?: { message?: string } };
                }
            )?.response?.data?.message;
            if (
                status === 400 &&
                message &&
                /current password/i.test(message)
            ) {
                // Wrong-current-password belongs ON the field, not in a toast.
                setError("currentPassword", {
                    type: "server",
                    message,
                });
            } else {
                toastError(message ?? getErrorMessage(error));
            }
        }
    };

    return (
        <div className="flex min-h-svh flex-col bg-muted/40">
            <header className="flex items-center justify-between p-6">
                <img
                    src="/enterprise_bank-logo.png"
                    alt="Enterprise Bank Inc"
                    className="h-8 object-contain"
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={signOut}
                >
                    <SignOut size={14} weight="bold" /> Sign out
                </Button>
            </header>

            <main className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex flex-col gap-6 rounded-lg border bg-card p-8 shadow-sm"
                        noValidate
                    >
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">
                                    Update your password
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {mustChange
                                        ? "Your temporary password must be changed before you can access ALAS."
                                        : "To secure your account, please choose a strong new password."}
                                </p>
                            </div>

                            <Field>
                                <FieldLabel htmlFor="currentPassword">
                                    Current Password
                                </FieldLabel>
                                <div className="relative">
                                    <Input
                                        id="currentPassword"
                                        type={
                                            reveal.current
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="current-password"
                                        autoFocus
                                        aria-invalid={
                                            !!errors.currentPassword
                                        }
                                        aria-describedby={
                                            errors.currentPassword
                                                ? "currentPassword-error"
                                                : undefined
                                        }
                                        onKeyUp={capsHandler}
                                        className="pr-10"
                                        {...register("currentPassword")}
                                    />
                                    <RevealToggle
                                        revealed={reveal.current}
                                        onToggle={() =>
                                            setReveal((r) => ({
                                                ...r,
                                                current: !r.current,
                                            }))
                                        }
                                        label={
                                            reveal.current
                                                ? "Hide current password"
                                                : "Show current password"
                                        }
                                    />
                                </div>
                                {errors.currentPassword && (
                                    <p
                                        id="currentPassword-error"
                                        role="alert"
                                        className="mt-1 text-xs text-destructive"
                                    >
                                        {errors.currentPassword.message}
                                    </p>
                                )}
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="newPassword">
                                    New Password
                                </FieldLabel>
                                <div className="relative">
                                    <Input
                                        id="newPassword"
                                        type={
                                            reveal.next
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="new-password"
                                        aria-invalid={
                                            !!errors.newPassword
                                        }
                                        aria-describedby="newPassword-rules"
                                        onKeyUp={capsHandler}
                                        className="pr-10"
                                        {...register("newPassword")}
                                    />
                                    <RevealToggle
                                        revealed={reveal.next}
                                        onToggle={() =>
                                            setReveal((r) => ({
                                                ...r,
                                                next: !r.next,
                                            }))
                                        }
                                        label={
                                            reveal.next
                                                ? "Hide new password"
                                                : "Show new password"
                                        }
                                    />
                                </div>

                                {/* Live policy checklist + strength — feedback while typing, not after submit */}
                                <div
                                    id="newPassword-rules"
                                    className="mt-2 space-y-2"
                                >
                                    <div
                                        className="flex gap-1"
                                        aria-hidden
                                    >
                                        {[1, 2, 3, 4].map((i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "h-1 flex-1 rounded-full transition-colors",
                                                    i <= score
                                                        ? STRENGTH[score]
                                                              .bar
                                                        : "bg-muted",
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Strength:{" "}
                                        <span className="font-medium text-foreground">
                                            {
                                                STRENGTH[score].label
                                            }
                                        </span>
                                    </p>
                                    <ul
                                        className="grid grid-cols-1 gap-1 sm:grid-cols-2"
                                        aria-live="polite"
                                    >
                                        {RULES.map((rule) => {
                                            const ok =
                                                rule.test(newPassword);
                                            return (
                                                <li
                                                    key={rule.id}
                                                    className={cn(
                                                        "flex items-center gap-1.5 text-xs",
                                                        ok
                                                            ? "text-emerald-600"
                                                            : "text-muted-foreground",
                                                    )}
                                                >
                                                    {ok ? (
                                                        <Check
                                                            size={
                                                                12
                                                            }
                                                            weight="bold"
                                                        />
                                                    ) : (
                                                        <X
                                                            size={
                                                                12
                                                            }
                                                            weight="bold"
                                                            className="opacity-50"
                                                        />
                                                    )}
                                                    {rule.label}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                {errors.newPassword && (
                                    <p
                                        role="alert"
                                        className="mt-1 text-xs text-destructive"
                                    >
                                        {errors.newPassword.message}
                                    </p>
                                )}
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="confirmPassword">
                                    Confirm New Password
                                </FieldLabel>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={
                                            reveal.confirm
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="new-password"
                                        aria-invalid={
                                            !!errors.confirmPassword
                                        }
                                        aria-describedby={
                                            matches
                                                ? "confirmPassword-ok"
                                                : undefined
                                        }
                                        onKeyUp={capsHandler}
                                        className="pr-10"
                                        {...register("confirmPassword")}
                                    />
                                    <RevealToggle
                                        revealed={reveal.confirm}
                                        onToggle={() =>
                                            setReveal((r) => ({
                                                ...r,
                                                confirm: !r.confirm,
                                            }))
                                        }
                                        label={
                                            reveal.confirm
                                                ? "Hide confirmation"
                                                : "Show confirmation"
                                        }
                                    />
                                </div>
                                {matches &&
                                    !errors.confirmPassword && (
                                        <p
                                            id="confirmPassword-ok"
                                            className="mt-1 flex items-center gap-1 text-xs text-emerald-600"
                                        >
                                            <Check
                                                size={12}
                                                weight="bold"
                                            />{" "}
                                            Passwords match
                                        </p>
                                    )}
                                {errors.confirmPassword && (
                                    <p
                                        role="alert"
                                        className="mt-1 text-xs text-destructive"
                                    >
                                        {errors.confirmPassword.message}
                                    </p>
                                )}
                            </Field>

                            {capsOn && (
                                <p
                                    role="status"
                                    className="flex items-center gap-1.5 text-xs text-amber-700"
                                >
                                    <WarningCircle
                                        size={12}
                                        weight="fill"
                                    />{" "}
                                    Caps Lock is on.
                                </p>
                            )}

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full gap-2"
                            >
                                {isSubmitting && (
                                    <CircleNotch
                                        size={16}
                                        weight="bold"
                                        className="animate-spin"
                                    />
                                )}
                                {isSubmitting
                                    ? "Updating…"
                                    : "Update Password"}
                            </Button>

                            {!mustChange && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="mx-auto"
                                    onClick={() => navigate(-1)}
                                >
                                    Back
                                </Button>
                            )}
                        </FieldGroup>
                    </form>
                </div>
            </main>

            <footer className="p-6 text-center text-xs text-muted-foreground">
                Passwords are verified against bank policy and every
                session is signed out after a change.
            </footer>
        </div>
    );
}