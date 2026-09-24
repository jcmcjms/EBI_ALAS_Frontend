/**
 * Auth schemas — Zod validation for login and password forms.
 */

import { z } from "zod";

export const loginSchema = z.object({
    username: z.string().min(3, "Username is required").max(50),
    password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Must contain uppercase")
            .regex(/[a-z]/, "Must contain lowercase")
            .regex(/[0-9]/, "Must contain digit")
            .regex(/[!?*.]/, "Must contain one of !?*."),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
