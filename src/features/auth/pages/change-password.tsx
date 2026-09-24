/**
 * Change password page — forced password change for users with mustChangePassword.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { CircleNotch, Eye, EyeSlash } from "@phosphor-icons/react";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { Button } from "@/src/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/src/components/ui/field";
import { Input } from "@/src/components/ui/input";
import { useAuthStore } from "@/src/store/authStore";
import { apiClient, getErrorMessage } from "@/src/lib/apiClient";
import {
    changePasswordSchema,
    type ChangePasswordFormData,
} from "../schemas";

export default function ChangePassword() {
    const navigate = useNavigate();
    const clearSession = useAuthStore((state) => state.clearSession);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        mode: "onBlur",
    });

    const onSubmit = async (data: ChangePasswordFormData) => {
        try {
            await apiClient.post("/api/auth/change-password", {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
            });

            toastSuccess(
                "Password changed successfully. Please log in with your new password.",
            );
            clearSession();
            navigate("/login", { replace: true });
        } catch (error) {
            const fallback = "Failed to change password.";
            const detail = (
                error as { response?: { data?: { message?: string } } }
            )?.response?.data?.message;
            toastError(detail ?? getErrorMessage(error) ?? fallback);
        }
    };

    return (
        <div className="flex min-h-svh w-full items-center justify-center p-6 bg-background">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <img
                        src="/enterprise_bank-logo.png"
                        alt="Enterprise Bank Inc"
                        className="h-8 object-contain"
                    />
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex flex-col gap-6 rounded-lg border bg-card p-8 shadow-sm"
                >
                    <FieldGroup>
                        <div className="flex flex-col items-center gap-2 text-center">
                            <h1 className="text-2xl font-bold">
                                Update your password
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                To secure your account, please choose a strong new
                                password.
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
                                        showCurrentPassword ? "text" : "password"
                                    }
                                    {...register("currentPassword")}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowCurrentPassword(!showCurrentPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? (
                                        <EyeSlash size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                            {errors.currentPassword && (
                                <p className="text-xs text-red-500 mt-1">
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
                                    type={showNewPassword ? "text" : "password"}
                                    {...register("newPassword")}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNewPassword(!showNewPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? (
                                        <EyeSlash size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                            {errors.newPassword && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.newPassword.message}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                                At least 8 chars: uppercase, lowercase, number, and
                                one of !?*.
                            </p>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="confirmPassword">
                                Confirm New Password
                            </FieldLabel>
                            <Input
                                id="confirmPassword"
                                type="password"
                                {...register("confirmPassword")}
                            />
                            {errors.confirmPassword && (
                                <p className="text-xs text-red-500 mt-1">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </Field>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full"
                        >
                            {isSubmitting ? (
                                <CircleNotch
                                    size={20}
                                    weight="bold"
                                    className="animate-spin"
                                />
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
}
