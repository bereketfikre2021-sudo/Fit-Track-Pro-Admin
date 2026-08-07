/**
 * UserDetailPage.tsx
 * Full user profile with tabbed detail view.
 * Route: /users/:userId
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, UserCircle, Ban, RefreshCw, Trash2,
  Key, Shield, CreditCard, Calendar, Dumbbell, Salad,
  BrainCircuit, ClipboardList,
} from 'lucide-react'
import { fetchUserProfile, fetchUserRoles, fetchUserSubscriptions } from '@/lib/users.queries'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { PermissionGate } from '@/components/guards/PermissionGate'
import { ProfileTab } from '@/components/users/detail/ProfileTab'
import { WorkoutTab } from '@/components/users/detail/WorkoutTab'
import { NutritionTab } from '@/components/users/detail/NutritionTab'
import { AiTab } from '@/components/users/detail/AiTab'
import { SubscriptionsTab } from '@/components/users/detail/SubscriptionsTab'
import { AuditTab } from '@/components/users/detail/AuditTab'
import {
  SuspendDialog, ReactivateDialog, DeleteUserDialog,
  ResetPasswordDialog, ChangeRoleDialog, ChangeSubscriptionDialog,
} from '@/components/users/UserActions'
import type { AdminUser } from '@/lib/users.queries'
import { formatDate } from '@/lib/utils'

type ActionKey = 'suspend' | 'reactivate' | 'delete' | 'reset_pw' | 'change_role' | 'change_sub' | null

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: UserCircle },
  { id: 'workouts',      label: 'Workouts',       icon: Dumbbell },
  { id: 'nutrition',     label: 'Nutrition',      icon: Salad },
  { id: 'ai',            label: 'AI History',     icon: BrainCircuit },
  { id: 'subscriptions', label: 'Subscriptions',  icon: CreditCard },
  { id: 'audit',         label: 'Audit Log',      icon: ClipboardList },
]

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')
  const [action, setAction] = useState<ActionKey>(null)

  const { data: profile, isLoading: pLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  })
  const { data: roles = [] } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => fetchUserRoles(userId!),
    enabled: !!userId,
  })
  const { data: subs = [] } = useQuery({
    queryKey: ['user-subscriptions', userId],
    queryFn: () => fetchUserSubscriptions(userId!),
    enabled: !!userId,
  })

  if (pLoading) return (
    <div className="flex justify-center items-center py-24"><Spinner size="lg" /></div>
  )
  if (!profile || !userId) return (
    <div className="py-24 text-center text-sm text-muted-foreground">User not found</div>
  )

  const topRole = roles[0]?.role ?? 'user'
  const activeSub = subs.find((s) => ['active', 'trialing'].includes(s.status))

  // Build a minimal AdminUser for action dialogs
  const adminUser: AdminUser = {
    id: userId,
    name: profile.name,
    registration_date: profile.registration_date,
    gender: profile.gender,
    height_cm: profile.height_cm,
    current_weight_kg: profile.current_weight_kg,
    target_weight_kg: profile.target_weight_kg,
    fitness_goal: profile.fitness_goal,
    fitness_level: profile.fitness_level,
    avatar_url: profile.avatar_url,
    workout_days: profile.workout_days,
    equipment: profile.equipment,
    role: topRole,
    plan_tier: activeSub?.tier ?? 'free',
    sub_status: activeSub?.status ?? null,
  }

  const ROLE_BADGE: Record<string, 'outline' | 'info' | 'warning' | 'danger'> = {
    user: 'outline', moderator: 'info', admin: 'warning', super_admin: 'danger',
  }

  return (
    <PageShell
      title={profile.name ?? 'User Profile'}
      description={`ID: ${userId}`}
      icon={UserCircle}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/users')}>
            Back
          </Button>
          <PermissionGate permission="users.suspend">
            <Button size="sm" variant="outline" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setAction('suspend')}>Suspend</Button>
            <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => setAction('reactivate')}>Reactivate</Button>
          </PermissionGate>
          <PermissionGate permission="users.reset_password">
            <Button size="sm" variant="outline" leftIcon={<Key className="h-3.5 w-3.5" />} onClick={() => setAction('reset_pw')}>Reset PW</Button>
          </PermissionGate>
          <PermissionGate permission="users.change_role">
            <Button size="sm" variant="outline" leftIcon={<Shield className="h-3.5 w-3.5" />} onClick={() => setAction('change_role')}>Role</Button>
          </PermissionGate>
          <PermissionGate permission="users.delete">
            <Button size="sm" variant="destructive" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setAction('delete')}>Delete</Button>
          </PermissionGate>
        </div>
      }
    >
      {/* User header card */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <UserCircle className="h-8 w-8" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold truncate">{profile.name ?? 'No name'}</h2>
            <Badge variant={ROLE_BADGE[topRole] ?? 'outline'}>{topRole}</Badge>
            <Badge variant={activeSub ? 'success' : 'outline'}>
              {activeSub ? activeSub.tier?.toUpperCase() : 'FREE'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Joined {formatDate(profile.registration_date)}</span>
            {profile.fitness_goal && <span>Goal: {profile.fitness_goal}</span>}
            {profile.fitness_level && <span>Level: {profile.fitness_level}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        <div className="mt-2">
          <TabPanel id="profile"       active={activeTab}><ProfileTab       userId={userId} /></TabPanel>
          <TabPanel id="workouts"      active={activeTab}><WorkoutTab       userId={userId} /></TabPanel>
          <TabPanel id="nutrition"     active={activeTab}><NutritionTab     userId={userId} /></TabPanel>
          <TabPanel id="ai"            active={activeTab}><AiTab            userId={userId} /></TabPanel>
          <TabPanel id="subscriptions" active={activeTab}><SubscriptionsTab userId={userId} user={adminUser} /></TabPanel>
          <TabPanel id="audit"         active={activeTab}><AuditTab         userId={userId} /></TabPanel>
        </div>
      </div>

      {/* Action dialogs */}
      <SuspendDialog         user={adminUser} open={action === 'suspend'}     onClose={() => setAction(null)} />
      <ReactivateDialog      user={adminUser} open={action === 'reactivate'}  onClose={() => setAction(null)} />
      <DeleteUserDialog      user={adminUser} open={action === 'delete'}      onClose={() => { setAction(null); navigate('/users') }} />
      <ResetPasswordDialog   user={adminUser} open={action === 'reset_pw'}    onClose={() => setAction(null)} />
      <ChangeRoleDialog      user={adminUser} open={action === 'change_role'} onClose={() => setAction(null)} />
      <ChangeSubscriptionDialog user={adminUser} subscriptionId={activeSub?.id ?? null} open={action === 'change_sub'} onClose={() => setAction(null)} />
    </PageShell>
  )
}
