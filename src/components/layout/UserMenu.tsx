import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, ChevronDown, Settings } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { ROLE_META, ROLE_COLOR_CLASSES } from '@/lib/permissions'

// Fetch the admin's avatar + name from public.users
async function fetchMyProfile(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('name, avatar_url')
    .eq('id', userId)
    .single()
  return data
}

export function UserMenu() {
  const { user, roles, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: profile } = useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: () => fetchMyProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })

  const email       = user?.email ?? ''
  const displayName = profile?.name ?? email
  const avatarUrl   = profile?.avatar_url ?? null
  const initials    = (profile?.name ?? email).slice(0, 2).toUpperCase()

  const highestRole = roles.includes('super_admin') ? 'super_admin'
    : roles.includes('admin') ? 'admin'
    : roles.includes('content_manager') ? 'content_manager'
    : roles.includes('support') ? 'support'
    : roles.includes('analyst') ? 'analyst'
    : roles.includes('moderator') ? 'moderator'
    : 'user'
  const roleMeta = ROLE_META.find((m) => m.value === highestRole)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleProfile = () => {
    setOpen(false)
    navigate('/profile')
  }

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Open user menu"
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          'hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {/* Avatar — shows image if set, else initials */}
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden bg-primary text-xs font-semibold text-primary-foreground">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="hidden sm:block max-w-[120px] truncate text-foreground">
          {profile?.name ?? email}
        </span>
        <ChevronDown
          className={cn('hidden sm:block h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-full mt-1.5 w-60 rounded-lg border border-border bg-card shadow-lg z-50 py-1 animate-fade-in"
        >
          {/* User info header */}
          <div className="px-3 py-3 border-b border-border flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full overflow-hidden bg-primary text-sm font-semibold text-primary-foreground">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : initials}
            </span>
            <div className="min-w-0">
              {profile?.name && (
                <p className="text-sm font-semibold text-foreground truncate">{profile.name}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <span className={cn('inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-medium', ROLE_COLOR_CLASSES[highestRole])}>
                {roleMeta?.label ?? highestRole}
              </span>
            </div>
          </div>

          {/* Profile settings */}
          <button
            role="menuitem"
            onClick={handleProfile}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Profile settings
          </button>

          {/* Sign out */}
          <div className="border-t border-border mt-1 pt-1">
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
