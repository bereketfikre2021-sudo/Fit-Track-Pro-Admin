/**
 * LoginPage.tsx
 * Admin-only login form.
 * Uses Supabase email + password authentication.
 * After sign-in, AdminRouteGuard checks for admin/super_admin role.
 */

import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShieldCheck, Eye, EyeOff, Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormValues = z.infer<typeof schema>

// ── Component ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const { signIn, session, isAdmin, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPw, setShowPw] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSending, setResetSending] = useState(false)

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard'

  if (session && (isAdmin || isSuperAdmin)) {
    return <Navigate to={from} replace />
  }

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) { toast.error('Enter your email address'); return }
    setResetSending(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setResetSending(false)
    if (error) { toast.error(error.message); return }
    toast.success('Password reset email sent — check your inbox')
    setResetMode(false)
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    setServerError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setServerError(error.message ?? 'Sign in failed. Check your credentials.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">FitTrack Pro</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {resetMode ? (
            <>
              <h2 className="text-base font-semibold mb-1">Reset password</h2>
              <p className="text-xs text-muted-foreground mb-5">Enter your admin email and we'll send a reset link.</p>
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  autoFocus
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                />
                <Button className="w-full" loading={resetSending} onClick={handleResetPassword}
                  leftIcon={<Mail className="h-4 w-4" />}>
                  Send reset link
                </Button>
                <button type="button" onClick={() => setResetMode(false)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
                  ← Back to sign in
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold mb-5">Sign in to continue</h2>
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  error={errors.email?.message}
                  {...register('email')}
                />
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-[30px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {serverError && (
                  <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                    {serverError}
                  </p>
                )}

                <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
                  Sign in
                </Button>

                <button type="button" onClick={() => setResetMode(true)}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center">
                  Forgot password?
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Admin access only. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  )
}
