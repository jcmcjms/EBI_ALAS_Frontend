import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { SignOut } from '@phosphor-icons/react'
import { toastSuccess, toastError } from '@/src/shared/ui/feedback/toast'
import { Button } from '@/src/shared/ui/primitives/button'
import { useAuthStore } from '@/src/shared/store/auth-store'
import { apiClient, getErrorMessage } from '@/src/shared/lib/apiClient'
import { changePasswordSchema, type ChangePasswordFormData } from '../schemas'
import { PasswordChangeForm } from './password-change-form'

export default function ChangePassword() {
  const navigate = useNavigate()
  const router = useRouter()
  const mustChange = useAuthStore((s) => s.user?.mustChangePassword ?? false)
  const clearSession = useAuthStore((s) => s.clearSession)

  const [reveal, setReveal] = useState({
    current: false,
    next: false,
    confirm: false,
  })
  const [capsOn, setCapsOn] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur',
  })

  const newPassword = watch('newPassword') ?? ''
  const confirmPassword = watch('confirmPassword') ?? ''

  const capsHandler = (e: React.KeyboardEvent) =>
    setCapsOn(e.getModifierState?.('CapsLock') ?? false)

  const signOut = () => {
    clearSession()
    navigate({ to: '/login', replace: true })
  }

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      await apiClient.post('/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })

      toastSuccess('Password changed. Sign in with your new password.')
      clearSession()
      navigate({ to: '/login', replace: true })
    } catch (error) {
      const response = (
        error as {
          response?: {
            status?: number
            data?: { detail?: string; message?: string }
          }
        }
      )?.response
      const message = response?.data?.detail ?? response?.data?.message
      if (
        response?.status === 400 &&
        message &&
        /current password/i.test(message)
      ) {
        setError('currentPassword', {
          type: 'server',
          message,
        })
      } else {
        toastError(message ?? getErrorMessage(error))
      }
    }
  }

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

      <main
        className="flex flex-1 items-center justify-center p-6"
        onKeyUp={capsHandler}
      >
        <div className="w-full max-w-md">
          <PasswordChangeForm
            register={register}
            errors={errors}
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={isSubmitting}
            mustChange={mustChange}
            reveal={reveal}
            setReveal={setReveal}
            capsOn={capsOn}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            onBack={() => router.history.back()}
          />
        </div>
      </main>

      <footer className="p-6 text-center text-xs text-muted-foreground">
        You'll be signed out of all devices after changing your password.
      </footer>
    </div>
  )
}