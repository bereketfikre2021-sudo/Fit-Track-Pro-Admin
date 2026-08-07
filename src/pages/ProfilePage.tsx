/**
 * ProfilePage.tsx — Admin Profile Settings
 *
 * Features:
 * - View account info (email, role, join date)
 * - Upload / change avatar (Supabase avatars bucket)
 * - Update display name
 * - Change password
 * - Active session info
 */

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  User, Camera, Key, Shield, Calendar, Mail,
  Save, Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PageShell } from '@/components/layout/PageShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { ROLE_COLOR_CLASSES, ROLE_META } from '@/lib/permissions'
import { formatDate, cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Schemas ───────────────────────────────────────────────────────────────────

const nameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(60),
})

const passwordSchema = z.object({
  current_password: z.string().min(6, 'Enter your current password'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type NameForm     = z.infer<typeof nameSchema>
type PasswordForm = z.infer<typeof passwordSchema>

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function fetchAdminProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, avatar_url, registration_date')
    .eq('id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

// ── Avatar upload ─────────────────────────────────────────────────────────────

async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Validate
  if (!file.type.startsWith('image/')) throw new Error('File must be an image')
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB')

  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  // Try avatars bucket first (main app bucket, public read)
  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadErr) {
    // Bucket may not allow admin uploads — store URL as data URL fallback
    // so the UI still works even without storage access
    throw new Error(`Upload failed: ${uploadErr.message}. Make sure the "avatars" bucket exists in Supabase Storage and has an INSERT policy for authenticated users.`)
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Bust cache with timestamp
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`

  // Save to public.users — upsert in case the admin has no profile row yet
  const { error: updateErr } = await supabase
    .from('users')
    .upsert(
      { id: userId, avatar_url: publicUrl },
      { onConflict: 'id' },
    )
  if (updateErr) throw new Error(`Profile update failed: ${updateErr.message}`)

  return publicUrl
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AvatarSection({ userId, avatarUrl, name, email, onUpdated }: {
  userId: string
  avatarUrl: string | null
  name: string | null
  email: string
  onUpdated: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(avatarUrl)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setPreview(avatarUrl) }, [avatarUrl])

  const initials = (name ?? email).slice(0, 2).toUpperCase()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const url = await uploadAvatar(userId, file)
      onUpdated(url)
      toast.success('Avatar updated')
    } catch (err) {
      setPreview(avatarUrl) // revert
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const removeAvatar = async () => {
    setUploading(true)
    try {
      await supabase.from('users').update({ avatar_url: null }).eq('id', userId)
      setPreview(null)
      onUpdated('')
      toast.success('Avatar removed')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-5">
      {/* Avatar circle */}
      <div className="relative shrink-0">
        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-secondary">
          {preview ? (
            <img
              src={preview}
              alt={`${name ?? email} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xl font-bold text-muted-foreground">
              {initials}
            </div>
          )}
        </div>
        {/* Overlay upload button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Change avatar"
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {uploading ? <Spinner size="sm" /> : <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{name ?? 'No display name'}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            leftIcon={<Camera className="h-3.5 w-3.5" />}
          >
            {uploading ? 'Uploading…' : 'Change photo'}
          </Button>
          {preview && (
            <Button
              size="sm"
              variant="ghost"
              onClick={removeAvatar}
              disabled={uploading}
            >
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · Max 5 MB</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
        aria-label="Upload avatar image"
      />
    </div>
  )
}

// ── Display name form ─────────────────────────────────────────────────────────

function DisplayNameForm({ userId, currentName, onUpdated }: {
  userId: string
  currentName: string | null
  onUpdated: (name: string) => void
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: currentName ?? '' },
  })

  useEffect(() => { reset({ name: currentName ?? '' }) }, [currentName, reset])

  const onSubmit = async (values: NameForm) => {
    const { error } = await supabase
      .from('users')
      .update({ name: values.name.trim() })
      .eq('id', userId)
    if (error) { toast.error(error.message); return }
    onUpdated(values.name.trim())
    reset({ name: values.name.trim() })
    toast.success('Display name updated')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Display name"
        hint="This name is shown in the admin dashboard."
        error={errors.name?.message}
        {...register('name')}
      />
      <Button type="submit" size="sm" loading={isSubmitting} disabled={!isDirty} leftIcon={<Save className="h-3.5 w-3.5" />}>
        Save name
      </Button>
    </form>
  )
}

// ── Password change form ──────────────────────────────────────────────────────

function PasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const newPw = watch('new_password', '')

  // Password strength
  const strength = [
    newPw.length >= 8,
    /[A-Z]/.test(newPw),
    /[0-9]/.test(newPw),
    /[^A-Za-z0-9]/.test(newPw),
  ]
  const strengthScore = strength.filter(Boolean).length
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore]
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-400', 'bg-emerald-500'][strengthScore]

  const onSubmit = async (values: PasswordForm) => {
    // Re-authenticate first by signing in with current password
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { toast.error('Session expired. Please sign in again.'); return }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: values.current_password,
    })
    if (signInErr) {
      toast.error('Current password is incorrect')
      return
    }

    // Update password
    const { error } = await supabase.auth.updateUser({ password: values.new_password })
    if (error) { toast.error(error.message); return }

    toast.success('Password updated successfully')
    reset()
  }

  const EyeToggle = ({ show, onToggle, label }: { show: boolean; onToggle: () => void; label: string }) => (
    <button
      type="button"
      tabIndex={-1}
      onClick={onToggle}
      aria-label={show ? `Hide ${label}` : `Show ${label}`}
      className="absolute right-3 top-[30px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="relative">
        <Input
          label="Current password"
          type={showCurrent ? 'text' : 'password'}
          autoComplete="current-password"
          error={errors.current_password?.message}
          {...register('current_password')}
        />
        <EyeToggle show={showCurrent} onToggle={() => setShowCurrent((v) => !v)} label="current password" />
      </div>

      <div className="relative">
        <Input
          label="New password"
          type={showNew ? 'text' : 'password'}
          autoComplete="new-password"
          error={errors.new_password?.message}
          {...register('new_password')}
        />
        <EyeToggle show={showNew} onToggle={() => setShowNew((v) => !v)} label="new password" />
      </div>

      {/* Password strength indicator */}
      {newPw.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all',
                  i < strengthScore ? strengthColor : 'bg-secondary',
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{strengthLabel}</span>
            <div className="flex gap-3">
              {[
                { ok: strength[0], label: '8+ chars' },
                { ok: strength[1], label: 'Uppercase' },
                { ok: strength[2], label: 'Number' },
                { ok: strength[3], label: 'Symbol' },
              ].map((r) => (
                <span key={r.label} className={cn('flex items-center gap-1', r.ok ? 'text-emerald-400' : 'text-muted-foreground')}>
                  {r.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {r.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        <Input
          label="Confirm new password"
          type={showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />
        <EyeToggle show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} label="confirm password" />
      </div>

      <Button type="submit" size="sm" loading={isSubmitting} leftIcon={<Key className="h-3.5 w-3.5" />}>
        Update password
      </Button>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user, roles } = useAuth()
  const qc = useQueryClient()
  const userId = user?.id ?? ''

  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-profile', userId],
    queryFn: () => fetchAdminProfile(userId),
    enabled: !!userId,
  })

  const [localAvatar, setLocalAvatar] = useState<string | null>(null)
  const [localName, setLocalName] = useState<string | null>(null)

  // Sync from query data
  useEffect(() => {
    if (profile) {
      setLocalAvatar(profile.avatar_url ?? null)
      setLocalName(profile.name ?? null)
    }
  }, [profile])

  const invalidateProfile = () => qc.invalidateQueries({ queryKey: ['admin-profile', userId] })

  const highestRole = roles.includes('super_admin') ? 'super_admin'
    : roles.includes('admin') ? 'admin'
    : roles.includes('content_manager') ? 'content_manager'
    : roles.includes('support') ? 'support'
    : roles.includes('analyst') ? 'analyst'
    : 'user'

  const roleMeta = ROLE_META.find((m) => m.value === highestRole)

  if (isLoading) return (
    <div className="flex justify-center py-24"><Spinner size="lg" label="Loading profile" /></div>
  )

  return (
    <PageShell
      title="Profile Settings"
      description="Manage your admin account settings."
      icon={User}
    >
      <div className="max-w-2xl space-y-6">

        {/* Account info card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar */}
            <AvatarSection
              userId={userId}
              avatarUrl={localAvatar}
              name={localName}
              email={user?.email ?? ''}
              onUpdated={(url) => { setLocalAvatar(url || null); invalidateProfile() }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">Email address</p>
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                  {user?.email_confirmed_at && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />Verified
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-0.5', ROLE_COLOR_CLASSES[highestRole])}>
                    {roleMeta?.label ?? highestRole}
                  </span>
                  {roles.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      +{roles.length - 1} more role{roles.length > 2 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">Account created</p>
                  <p className="text-sm font-medium text-foreground">
                    {user?.created_at ? formatDate(user.created_at) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-xs text-muted-foreground">Last sign in</p>
                  <p className="text-sm font-medium text-foreground">
                    {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Display name card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" aria-hidden="true" />
              Display Name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DisplayNameForm
              userId={userId}
              currentName={localName}
              onUpdated={(name) => { setLocalName(name); invalidateProfile() }}
            />
          </CardContent>
        </Card>

        {/* Password card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" aria-hidden="true" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.app_metadata?.provider === 'google' ? (
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-4">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">Google OAuth account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your account uses Google Sign-In. Passwords are managed by Google — you cannot set a password here.
                  </p>
                </div>
              </div>
            ) : (
              <PasswordForm />
            )}
          </CardContent>
        </Card>

        {/* All roles */}
        {roles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" aria-hidden="true" />
                Your Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span
                    key={role}
                    className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', ROLE_COLOR_CLASSES[role] ?? ROLE_COLOR_CLASSES['user'])}
                  >
                    {ROLE_META.find((m) => m.value === role)?.label ?? role}
                  </span>
                ))}
              </div>
              {roleMeta && (
                <p className="text-xs text-muted-foreground mt-3">{roleMeta.description}</p>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </PageShell>
  )
}
