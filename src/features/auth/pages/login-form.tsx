import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { CircleNotch, Eye, EyeSlash } from '@phosphor-icons/react'
import { cn } from '@/src/shared/lib/utils'
import { Field, FieldGroup, FieldLabel } from '@/src/shared/ui/forms/field'
import { Input } from '@/src/shared/ui/primitives/input'
import { Button } from '@/src/shared/ui/primitives/button'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { apiClient, getErrorMessage } from '@/src/shared/lib/apiClient'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { loginSchema, type LoginFormData } from '../schemas'
import {
  readLoginSession,
  type AuthTokenResponse,
} from '../login-session'

interface LoginFormProps extends React.ComponentProps<'form'> {
  className?: string
}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiClient.post<AuthTokenResponse>(
        '/api/auth/login',
        data,
      )
      const session = readLoginSession(response.data)

      if (session) {
        setSession(session.token, session.user)
        toastSuccess('Login successful')
        navigate({
          to: session.user.mustChangePassword ? '/change-password' : '/dashboard',
          replace: true,
        })
      } else {
        toastError('Login failed')
      }
    } catch (error) {
      toastError(getErrorMessage(error))
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="text-sm text-balance text-muted-foreground">
            Use your Enterprise Bank officer account.
          </p>
        </div>

        <Field>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            placeholder="Username"
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

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="https://itsupport.enterprisebank.ph/support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1" role="alert">
              {errors.password.message ?? 'Enter your password to sign in.'}
            </p>
          )}
        </Field>

        <Field>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? (
              <CircleNotch size={20} weight="bold" className="animate-spin" />
            ) : (
              'Login'
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
