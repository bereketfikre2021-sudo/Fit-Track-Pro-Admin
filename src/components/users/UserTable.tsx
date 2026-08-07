import { useNavigate } from 'react-router-dom'
import { UserCircle, MoreVertical, Eye, Ban, RefreshCw, Trash2, Key, Shield, CreditCard } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { AdminUser } from '@/lib/users.queries'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

interface UserTableProps {
  users: AdminUser[]
  loading: boolean
  onSuspend: (u: AdminUser) => void
  onReactivate: (u: AdminUser) => void
  onDelete: (u: AdminUser) => void
  onResetPassword: (u: AdminUser) => void
  onChangeRole: (u: AdminUser) => void
  onChangeSubscription: (u: AdminUser) => void
}

const PLAN_BADGE: Record<string, 'outline' | 'info' | 'warning' | 'success'> = {
  free: 'outline', pro: 'info', elite: 'warning', team: 'success',
}

const ROLE_BADGE: Record<string, 'outline' | 'info' | 'warning' | 'danger' | 'success'> = {
  user: 'outline', moderator: 'info', admin: 'warning', super_admin: 'danger',
}

// ── Portal dropdown — escapes overflow:hidden / stacking contexts ────────────

interface MenuPos { top: number; left: number }

function ActionMenu({ user, onSuspend, onReactivate, onDelete, onResetPassword, onChangeRole, onChangeSubscription }: {
  user: AdminUser
  onSuspend: () => void
  onReactivate: () => void
  onDelete: () => void
  onResetPassword: () => void
  onChangeRole: () => void
  onChangeSubscription: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<MenuPos>({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { can } = useAuth()

  // Position the portal menu below-right of the button
  const calcPos = useCallback(() => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuW = 192  // w-48 = 12rem = 192px
    const viewW = window.innerWidth
    // Prefer right-aligned; flip left if too close to edge
    const left = rect.right + window.scrollX - menuW
    const top  = rect.bottom + window.scrollY + 4
    setPos({ top, left: Math.max(8, Math.min(left, viewW - menuW - 8)) })
  }, [])

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open) calcPos()
    setOpen((v) => !v)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on scroll / resize
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const item = (icon: React.ElementType, label: string, onClick: () => void, danger = false) => {
    const Icon = icon
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onClick(); setOpen(false) }}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
          danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-secondary',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </button>
    )
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="User actions"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="User actions"
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-48 rounded-lg border border-border bg-card shadow-xl py-1 animate-fade-in"
        >
          {item(Eye, 'View profile', () => {})}
          {can('users.reset_password') && item(Key, 'Reset password', onResetPassword)}
          {can('users.change_role') && item(Shield, 'Change role', onChangeRole)}
          {can('subscriptions.edit') && item(CreditCard, 'Change subscription', onChangeSubscription)}
          {can('users.suspend') && (
            <>
              <div className="border-t border-border my-1" />
              {item(Ban, 'Suspend user', onSuspend)}
              {item(RefreshCw, 'Reactivate', onReactivate)}
            </>
          )}
          {can('users.delete') && (
            <>
              <div className="border-t border-border my-1" />
              {item(Trash2, 'Delete user', onDelete, true)}
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

export function UserTable({
  users, loading,
  onSuspend, onReactivate, onDelete, onResetPassword, onChangeRole, onChangeSubscription,
}: UserTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!users.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
        <UserCircle className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No users found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" aria-label="Users table" role="grid">
        <caption className="sr-only">Registered users list with role, plan, and action controls</caption>
        <thead>
          <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground" scope="col">User</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell" scope="col">Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell" scope="col">Plan</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell" scope="col">Goal</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell" scope="col">Joined</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground" scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr
              key={u.id}
              className="hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => navigate(`/users/${u.id}`)}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate max-w-[160px]">
                      {u.name ?? <span className="italic text-muted-foreground">No name</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                      {u.id.slice(0, 8)}…
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <Badge variant={ROLE_BADGE[u.role ?? 'user'] ?? 'outline'}>
                  {u.role ?? 'user'}
                </Badge>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                <div className="flex flex-col gap-0.5">
                  <Badge variant={PLAN_BADGE[u.plan_tier ?? 'free'] ?? 'outline'}>
                    {(u.plan_tier ?? 'free').toUpperCase()}
                  </Badge>
                  {u.sub_status && (
                    <span className="text-xs text-muted-foreground">{u.sub_status}</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground capitalize">
                {u.fitness_goal?.replace('_', ' ') ?? '—'}
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                {formatDate(u.registration_date)}
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <ActionMenu
                  user={u}
                  onSuspend={() => onSuspend(u)}
                  onReactivate={() => onReactivate(u)}
                  onDelete={() => onDelete(u)}
                  onResetPassword={() => onResetPassword(u)}
                  onChangeRole={() => onChangeRole(u)}
                  onChangeSubscription={() => onChangeSubscription(u)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
