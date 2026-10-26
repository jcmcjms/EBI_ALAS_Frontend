import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { CircleNotch } from '@phosphor-icons/react'
import { Field, FieldGroup, FieldLabel } from '@/src/shared/ui/forms/field'
import { Input } from '@/src/shared/ui/primitives/input'
import { Button } from '@/src/shared/ui/primitives/button'
import { apiClient, getErrorMessage } from '@/src/shared/lib/apiClient'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas'

const ENTERPRISE_BANK_URL = 'https://www.enterprisebank.ph/'

interface ForgotPasswordResponse {
  message: string
}

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      const response = await apiClient.post<ForgotPasswordResponse>(
        '/api/auth/forgot-password',
        { username: data.username },
      )
      toastSuccess(response.data.message)
      setSubmitted(true)
    } catch (error) {
      toastError(getErrorMessage(error))
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href={ENTERPRISE_BANK_URL}>
            <img
              src="/enterprise_bank-logo.png"
              alt="Enterprise Bank Inc"
              className="h-8 object-contain"
            />
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">ALAS (CL)</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enterprise Bank Inc.
              </p>
            </div>

            {submitted ? (
              <div className="flex flex-col gap-6 text-center">
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a temporary password to your registered email
                  address. Sign in with it, then choose a new password.
                </p>
                <Button onClick={() => navigate({ to: '/login' })}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col gap-6"
                noValidate
              >
                <FieldGroup>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <h2 className="text-2xl font-bold">Forgot password?</h2>
                    <p className="text-sm text-balance text-muted-foreground">
                      Enter your username and we'll email a temporary password
                      to your registered address.
                    </p>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      id="username"
                      autoComplete="username"
                      aria-invalid={!!errors.username}
                      {...register('username')}
                    />
                    {errors.username && (
                      <p className="text-xs text-destructive mt-1" role="alert">
                        {errors.username.message}
                      </p>
                    )}
                  </Field>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <CircleNotch
                        size={20}
                        weight="bold"
                        className="animate-spin"
                      />
                    ) : (
                      'Send temporary password'
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    <Link
                      to="/login"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      Back to sign in
                    </Link>
                  </div>
                </FieldGroup>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="/EBI_bg_login.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl dark:brightness-[0.2] dark:grayscale"
        />
        <img
          src="/EBI_bg_login.png"
          alt=""
          className="absolute inset-0 h-full w-full object-contain dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
