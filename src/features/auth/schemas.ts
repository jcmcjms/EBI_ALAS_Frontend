import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Enter your username').max(50),
  password: z.string().min(1, 'Enter your password').max(100),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password must be at most 128 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

export const forgotPasswordSchema = z.object({
  username: z.string().min(1, 'Enter your username').max(50),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
