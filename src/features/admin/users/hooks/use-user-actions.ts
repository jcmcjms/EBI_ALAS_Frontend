/**
 * User action handlers — extracted from UsersDataTable.
 *
 * Owns the confirm-action flow for destructive/sensitive operations
 * (toggle status, reset password, force reset, revoke sessions).
 */

import { useState } from "react";
import { toastSuccess, toastError } from "@/src/components/ui/toast";
import { getErrorMessage } from "@/src/lib/apiClient";
import { PERMISSIONS, type CreateUserPayload, type UpdateUserPayload, type UserResponse } from "@/src/lib/api/types";
import { useAuthStore } from "@/src/store/authStore";
import {
    useCreateUser,
    useForcePasswordReset,
    useResetUserPassword,
    useRevokeUserSessions,
    useUpdateUser,
    useUpdateUserStatus,
} from "./use-users";
import type { UserProfileChanges } from "../components/user-edit-drawer";
import type { UserCreatePayload } from "../components/user-create-drawer";
import type { TemporaryCredential } from "../components/temporary-password-dialog";
import { formatFullName } from "../components/user-columns";

export interface ConfirmActionState {
    title: string;
    description: string;
    actionLabel: string;
    destructive?: boolean;
    onConfirm: () => void;
}

export function useUserActions() {
    const hasPermission = useAuthStore((s) => s.hasPermission);
    const canSuspendUsers = hasPermission(PERMISSIONS.userSuspend);

    // ── Mutations ─────────────────────────────────────────────────
    const createUserMutation = useCreateUser();
    const updateUserMutation = useUpdateUser();
    const updateUserStatusMutation = useUpdateUserStatus();
    const resetUserPasswordMutation = useResetUserPassword();
    const forcePasswordResetMutation = useForcePasswordReset();
    const revokeSessionsMutation = useRevokeUserSessions();

    // ── Dialog state ──────────────────────────────────────────────
    const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null);
    const [tempCred, setTempCred] = useState<TemporaryCredential | null>(null);

    // ── Handlers ──────────────────────────────────────────────────

    function closeConfirm() {
        setConfirmAction(null);
    }

    function handleToggleStatusRequest(user: UserResponse) {
        if (!canSuspendUsers) {
            toastError("You don't have permission to suspend or activate users");
            return;
        }
        if (user.isActive) {
            setConfirmAction({
                title: "Suspend User Account",
                description: `Are you sure you want to suspend ${formatFullName(user)}? This will immediately revoke their access to ALAS.`,
                actionLabel: "Suspend User",
                destructive: true,
                onConfirm: () => {
                    updateUserStatusMutation.mutate(
                        { id: user.id, isActive: false },
                        {
                            onSuccess: () =>
                                toastSuccess(`${formatFullName(user)}'s account has been suspended`),
                            onError: (e) => toastError(getErrorMessage(e)),
                        },
                    );
                    closeConfirm();
                },
            });
        } else {
            setConfirmAction({
                title: "Activate User Account",
                description: `Are you sure you want to activate ${formatFullName(user)}? This will restore their access to ALAS.`,
                actionLabel: "Activate User",
                onConfirm: () => {
                    updateUserStatusMutation.mutate(
                        { id: user.id, isActive: true },
                        {
                            onSuccess: () =>
                                toastSuccess(`${formatFullName(user)}'s account has been activated`),
                            onError: (e) => toastError(getErrorMessage(e)),
                        },
                    );
                    closeConfirm();
                },
            });
        }
    }

    function handleResetPasswordRequest(user: UserResponse) {
        if (!hasPermission(PERMISSIONS.userEdit)) {
            toastError("You don't have permission to reset passwords");
            return;
        }
        setConfirmAction({
            title: "Reset Password",
            description: `Generate a new temporary password for @${user.username}? The user will be required to change it on next login.`,
            actionLabel: "Reset Password",
            onConfirm: () => {
                resetUserPasswordMutation.mutate(user.id, {
                    onSuccess: (res) => {
                        setTempCred({
                            username: res.username,
                            temporaryPassword: res.temporaryPassword,
                        });
                    },
                    onError: (e) => toastError(getErrorMessage(e)),
                });
                closeConfirm();
            },
        });
    }

    function handleForcePasswordResetRequest(user: UserResponse) {
        if (!hasPermission(PERMISSIONS.userEdit)) {
            toastError("You don't have permission to force password resets");
            return;
        }
        setConfirmAction({
            title: "Force Password Reset",
            description: `Require @${user.username} to change their password on next login?`,
            actionLabel: "Force Reset",
            onConfirm: () => {
                forcePasswordResetMutation.mutate(user.id, {
                    onSuccess: () =>
                        toastSuccess(
                            `${formatFullName(user)} will be required to change password on next login`,
                        ),
                    onError: (e) => toastError(getErrorMessage(e)),
                });
                closeConfirm();
            },
        });
    }

    function handleRevokeSessionsRequest(user: UserResponse) {
        if (!hasPermission(PERMISSIONS.userSuspend)) {
            toastError("You don't have permission to revoke sessions");
            return;
        }
        setConfirmAction({
            title: "Revoke All Sessions",
            description: `Sign out @${user.username} from all active devices? This will invalidate all refresh tokens.`,
            actionLabel: "Revoke Sessions",
            destructive: true,
            onConfirm: () => {
                revokeSessionsMutation.mutate(user.id, {
                    onSuccess: (count) =>
                        toastSuccess(
                            `Revoked ${count} active session(s) for ${formatFullName(user)}`,
                        ),
                    onError: (e) => toastError(getErrorMessage(e)),
                });
                closeConfirm();
            },
        });
    }

    function handleViewAuditLog(
        user: UserResponse,
        setSelectedUserForAuditLog: (user: UserResponse | null) => void,
    ) {
        if (!hasPermission(PERMISSIONS.userView)) {
            toastError("You don't have permission to view audit logs");
            return;
        }
        setSelectedUserForAuditLog(user);
    }

    async function handleCreateUser(payload: UserCreatePayload): Promise<boolean> {
        try {
            await createUserMutation.mutateAsync({
                username: payload.username,
                password: payload.password,
                firstName: payload.firstName,
                middleName: payload.middleName || null,
                lastName: payload.lastName,
                branchId: payload.branchId,
                role: payload.role,
                jobTitle: payload.jobTitle.trim() || null,
                eSignature: payload.eSignature,
                coveredBranches: payload.coveredBranches,
            } satisfies CreateUserPayload);
            setTempCred({ username: payload.username, temporaryPassword: payload.password });
            return true;
        } catch (error) {
            toastError(getErrorMessage(error));
            return false;
        }
    }

    async function handleUpdateUser(
        userId: number,
        changes: UserProfileChanges,
        setSelectedUser: (user: UserResponse | null) => void,
    ): Promise<boolean> {
        try {
            await updateUserMutation.mutateAsync({
                id: userId,
                payload: {
                    firstName: changes.firstName,
                    middleName: changes.middleName || null,
                    lastName: changes.lastName,
                    branchId: changes.branchId,
                    role: changes.role,
                    jobTitle: changes.jobTitle ?? null,
                    eSignature: changes.eSignature,
                    coveredBranches: changes.coveredBranches,
                } satisfies UpdateUserPayload,
            });
            toastSuccess(`${changes.firstName} ${changes.lastName} updated successfully`);
            setSelectedUser(null);
            return true;
        } catch (error) {
            toastError(getErrorMessage(error));
            return false;
        }
    }

    return {
        confirmAction,
        closeConfirm,
        tempCred,
        setTempCred,
        handleToggleStatusRequest,
        handleResetPasswordRequest,
        handleForcePasswordResetRequest,
        handleRevokeSessionsRequest,
        handleViewAuditLog,
        handleCreateUser,
        handleUpdateUser,
    };
}
