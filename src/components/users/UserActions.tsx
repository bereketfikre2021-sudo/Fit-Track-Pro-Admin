/**
 * UserActions.tsx
 * All action modals: Suspend, Reactivate, Delete, Reset Password,
 * Change Role, Change Subscription, Extend Subscription, Cancel Subscription.
 */

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import {
  suspendUser,
  reactivateUser,
  deleteUser,
  changeUserRole,
  changeUserSubscription,
  extendUserSubscription,
  cancelUserSubscription,
  reactivateUserSubscription,
  fetchSubscriptionPlans,
} from '@/lib/users.queries'
import { useQuery } from '@tanstack/react-query'
import type { AdminUser } from '@/lib/users.queries'

// ── Shared hook ───────────────────────────────────────────────────────────────

function useAction(key: string[]) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['users'] })
    qc.invalidateQueries({ queryKey: key })
  }
  return { invalidate }
}

// ── Suspend ───────────────────────────────────────────────────────────────────

export function SuspendDialog({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  const { user: admin } = useAuth()
  const { invalidate } = useAction(['users'])
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!admin?.id) return
    setLoading(true)
    try {
      await suspendUser(user.id, admin.id)
      toast.success(`${user.name ?? 'User'} suspended`)
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Suspend User"
      message={`Suspend ${user.name ?? 'this user'}? They will be flagged in their settings and can be reactivated later.`}
      confirmLabel="Suspend"
      variant="warning"
      loading={loading}
    />
  )
}

// ── Reactivate ────────────────────────────────────────────────────────────────

export function ReactivateDialog({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  const { user: admin } = useAuth()
  const { invalidate } = useAction(['users'])
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!admin?.id) return
    setLoading(true)
    try {
      await reactivateUser(user.id, admin.id)
      toast.success(`${user.name ?? 'User'} reactivated`)
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Reactivate User"
      message={`Reactivate ${user.name ?? 'this user'}? This will remove the suspension flag.`}
      confirmLabel="Reactivate"
      variant="warning"
      loading={loading}
    />
  )
}

// ── Delete ────────────────────────────────────────────────────────────────────

export function DeleteUserDialog({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  const { user: admin } = useAuth()
  const { invalidate } = useAction(['users'])
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState('')

  const handleConfirm = async () => {
    if (!admin?.id) return
    setLoading(true)
    try {
      await deleteUser(user.id, admin.id)
      toast.success(`User deleted`)
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete User" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This will permanently delete <strong className="text-foreground">{user.name ?? 'this user'}</strong> and all their data. This cannot be undone.
        </p>
        <Input
          label={`Type "${user.name ?? user.id.slice(0, 8)}" to confirm`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type name to confirm"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            loading={loading}
            disabled={confirm !== (user.name ?? user.id.slice(0, 8))}
          >
            Delete permanently
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Reset Password ────────────────────────────────────────────────────────────

export function ResetPasswordDialog({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Reset Password" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          To reset <strong className="text-foreground">{user.name ?? 'this user'}</strong>'s password, use the Supabase Dashboard → Authentication → Users → find the user → Send password reset email.
        </p>
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
          The Supabase anon key does not allow sending password reset emails on behalf of other users. This must be done via the service role or Supabase Dashboard.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Change Role ───────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'user', label: 'User' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'support', label: 'Support' },
  { value: 'content_manager', label: 'Content Manager' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
]

export function ChangeRoleDialog({ user, open, onClose }: { user: AdminUser; open: boolean; onClose: () => void }) {
  const { user: admin } = useAuth()
  const { invalidate } = useAction(['users', 'user', user.id])
  const [role, setRole] = useState(user.role ?? 'user')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!admin?.id) return
    setLoading(true)
    try {
      await changeUserRole(user.id, role, admin.id)
      toast.success(`Role changed to ${role}`)
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change Role" size="sm">
      <div className="space-y-4">
        <Select
          label="New role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={ROLES}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} loading={loading}>Save</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Change Subscription ───────────────────────────────────────────────────────

export function ChangeSubscriptionDialog({ user, subscriptionId, open, onClose }: {
  user: AdminUser
  subscriptionId: string | null
  open: boolean
  onClose: () => void
}) {
  const { invalidate } = useAction(['users', 'user', user.id])
  const [planId, setPlanId] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: fetchSubscriptionPlans,
    enabled: open,
  })

  const handleSave = async () => {
    if (!subscriptionId || !planId) return
    setLoading(true)
    try {
      await changeUserSubscription(subscriptionId, planId)
      toast.success('Subscription plan changed')
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change Subscription" size="sm">
      <div className="space-y-4">
        {!subscriptionId ? (
          <p className="text-sm text-muted-foreground">This user has no active subscription to change.</p>
        ) : (
          <Select
            label="New plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            placeholder="Select a plan"
            options={plans.map((p) => ({
              value: p.id,
              label: `${p.name} — $${p.price_monthly_usd}/mo`,
            }))}
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          {subscriptionId && (
            <Button onClick={handleSave} loading={loading} disabled={!planId}>Save</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Extend Subscription ───────────────────────────────────────────────────────

export function ExtendSubscriptionDialog({ user, subscriptionId, open, onClose }: {
  user: AdminUser
  subscriptionId: string | null
  open: boolean
  onClose: () => void
}) {
  const { invalidate } = useAction(['user', user.id])
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!subscriptionId) return
    const n = parseInt(days, 10)
    if (!n || n <= 0) { toast.error('Enter a valid number of days'); return }
    setLoading(true)
    try {
      await extendUserSubscription(subscriptionId, n)
      toast.success(`Subscription extended by ${n} days`)
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Extend Subscription" size="sm">
      <div className="space-y-4">
        {!subscriptionId ? (
          <p className="text-sm text-muted-foreground">No active subscription to extend.</p>
        ) : (
          <Input
            label="Days to extend"
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          {subscriptionId && (
            <Button onClick={handleSave} loading={loading}>Extend</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Cancel Subscription ───────────────────────────────────────────────────────

export function CancelSubscriptionDialog({ user, subscriptionId, open, onClose }: {
  user: AdminUser
  subscriptionId: string | null
  open: boolean
  onClose: () => void
}) {
  const { invalidate } = useAction(['user', user.id])
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!subscriptionId) return
    setLoading(true)
    try {
      await cancelUserSubscription(subscriptionId)
      toast.success('Subscription set to cancel at period end')
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Cancel Subscription"
      message={`Cancel ${user.name ?? 'this user'}'s subscription at the end of the current period?`}
      confirmLabel="Cancel subscription"
      variant="warning"
      loading={loading}
    />
  )
}
