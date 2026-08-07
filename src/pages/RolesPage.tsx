/**
 * RolesPage.tsx
 * View all admin-role users, assign/remove roles, and see permission matrix.
 * Only super_admin can reach this page (enforced via PermissionGate).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Shield, Plus, Trash2, RefreshCw, ChevronDown, ChevronRight, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ROLE_META, ROLE_COLOR_CLASSES, ASSIGNABLE_ROLES,
  ROLE_PERMISSIONS, type AdminRole, type Permission,
} from '@/lib/permissions'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminRoleRow {
  id: string
  user_id: string
  role: AdminRole
  granted_at: string
  expires_at: string | null
  user_name: string | null
}

// ── Queries ───────────────────────────────────────────────────────────────────

async function fetchAdminRoles(): Promise<AdminRoleRow[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, user_id, role, granted_at, expires_at')
    .in('role', ASSIGNABLE_ROLES as string[])
    .order('granted_at', { ascending: false })
  if (error) throw error

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.name
  }

  return (data ?? []).map((r) => ({
    ...r,
    role: r.role as AdminRole,
    user_name: userMap[r.user_id] ?? null,
  }))
}

async function fetchAllUsers() {
  const { data } = await supabase.from('users').select('id, name').order('name').limit(500)
  return data ?? []
}

// ── Assign Role Modal ─────────────────────────────────────────────────────────

function AssignRoleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user: admin } = useAuth()
  const qc = useQueryClient()
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<AdminRole>('analyst')
  const [loading, setLoading] = useState(false)

  const { data: users = [] } = useQuery({ queryKey: ['users-for-roles'], queryFn: fetchAllUsers, enabled: open })

  const save = async () => {
    if (!userId) { toast.error('Select a user'); return }
    setLoading(true)
    const { error } = await supabase.from('user_roles').upsert(
      { user_id: userId, role, granted_by: admin?.id, granted_at: new Date().toISOString() },
      { onConflict: 'user_id,role' },
    )
    setLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Assigned ${role} to user`)
    qc.invalidateQueries({ queryKey: ['admin-roles'] })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Role" size="sm">
      <div className="space-y-4">
        <Select
          label="User"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Select a user…"
          options={users.map((u) => ({ value: u.id, label: u.name ?? u.id.slice(0, 8) }))}
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as AdminRole)}
          options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_META.find((m) => m.value === r)?.label ?? r }))}
        />
        <div className="rounded-md bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {ROLE_META.find((m) => m.value === role)?.description}
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={save} loading={loading}>Assign role</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Permission Matrix ─────────────────────────────────────────────────────────

const PERMISSION_GROUPS: { label: string; perms: Permission[] }[] = [
  { label: 'Users', perms: ['users.view', 'users.edit', 'users.delete', 'users.suspend', 'users.reset_password', 'users.change_role'] },
  { label: 'Subscriptions', perms: ['subscriptions.view', 'subscriptions.edit', 'subscriptions.cancel'] },
  { label: 'Payments', perms: ['payments.view'] },
  { label: 'Workouts', perms: ['workouts.view', 'workouts.delete'] },
  { label: 'Nutrition', perms: ['nutrition.view', 'nutrition.delete'] },
  { label: 'Exercises', perms: ['exercises.view', 'exercises.create', 'exercises.edit', 'exercises.delete'] },
  { label: 'Notifications', perms: ['notifications.view', 'notifications.send', 'notifications.delete'] },
  { label: 'AI Usage', perms: ['ai.view'] },
  { label: 'Reports', perms: ['reports.view'] },
  { label: 'Settings', perms: ['settings.view', 'settings.edit'] },
  { label: 'Roles', perms: ['roles.view', 'roles.assign'] },
]

function PermissionMatrix() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Users']))

  const toggle = (label: string) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(label) ? next.delete(label) : next.add(label)
    return next
  })

  const roleCols = ASSIGNABLE_ROLES

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground w-48">Permission</th>
            {roleCols.map((r) => {
              const meta = ROLE_META.find((m) => m.value === r)
              return (
                <th key={r} className="px-2 py-3 text-center font-medium">
                  <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', ROLE_COLOR_CLASSES[r])}>
                    {meta?.label ?? r}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_GROUPS.map((group) => (
            <>
              <tr
                key={group.label}
                className="border-b border-border bg-secondary/40 cursor-pointer hover:bg-secondary/60 transition-colors"
                onClick={() => toggle(group.label)}
              >
                <td className="px-4 py-2 font-semibold text-foreground" colSpan={roleCols.length + 1}>
                  <div className="flex items-center gap-2">
                    {expanded.has(group.label)
                      ? <ChevronDown className="h-3 w-3" />
                      : <ChevronRight className="h-3 w-3" />}
                    {group.label}
                  </div>
                </td>
              </tr>
              {expanded.has(group.label) && group.perms.map((perm) => (
                <tr key={perm} className="border-b border-border hover:bg-muted/20">
                  <td className="px-4 py-2 text-muted-foreground font-mono pl-8">{perm.split('.')[1]}</td>
                  {roleCols.map((role) => {
                    const hasPerm = (ROLE_PERMISSIONS as Record<string, Permission[]>)[role]?.includes(perm)
                    return (
                      <td key={role} className="px-2 py-2 text-center">
                        {hasPerm
                          ? <Check className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                          : <span className="text-muted-foreground/30 text-base leading-none">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RolesPage() {
  const { can } = useAuth()
  const [assignOpen, setAssignOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<AdminRoleRow | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(false)
  const qc = useQueryClient()

  const { data: roleRows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: fetchAdminRoles,
  })

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setRevokeLoading(true)
    const { error } = await supabase.from('user_roles').delete().eq('id', revokeTarget.id)
    setRevokeLoading(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Revoked ${revokeTarget.role} from ${revokeTarget.user_name ?? 'user'}`)
    qc.invalidateQueries({ queryKey: ['admin-roles'] })
    setRevokeTarget(null)
  }

  // Group by user
  const byUser: Record<string, { name: string | null; roles: AdminRoleRow[] }> = {}
  for (const row of roleRows) {
    if (!byUser[row.user_id]) byUser[row.user_id] = { name: row.user_name, roles: [] }
    byUser[row.user_id].roles.push(row)
  }

  return (
    <PageShell
      title="Permissions & Roles"
      description="Manage admin roles and access levels across the dashboard."
      icon={Shield}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMatrixOpen(true)}>Permission matrix</Button>
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={isFetching} onClick={() => refetch()}>Refresh</Button>
          {can('roles.assign') && (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAssignOpen(true)}>Assign role</Button>
          )}
        </div>
      }
    >
      {/* Role cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLE_META.map((meta) => {
          const count = roleRows.filter((r) => r.role === meta.value).length
          return (
            <div key={meta.value} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', ROLE_COLOR_CLASSES[meta.value])}>
                  {meta.label}
                </span>
                <span className="text-2xl font-bold tabular-nums">{count}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
            </div>
          )
        })}
      </div>

      {/* Users & their roles */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Assigned Admin Roles</h3>
        {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
          Object.keys(byUser).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No admin roles assigned yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Granted</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Expires</th>
                    {can('roles.assign') && (
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roleRows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{row.user_name ?? <span className="italic text-muted-foreground">No name</span>}</div>
                        <div className="text-xs text-muted-foreground">{row.user_id.slice(0, 8)}…</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', ROLE_COLOR_CLASSES[row.role])}>
                          {ROLE_META.find((m) => m.value === row.role)?.label ?? row.role}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{formatDate(row.granted_at)}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">
                        {row.expires_at ? formatDate(row.expires_at) : <span className="text-xs">Never</span>}
                      </td>
                      {can('roles.assign') && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => setRevokeTarget(row)}
                            title="Revoke role"
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-auto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Permission matrix modal */}
      <Modal open={matrixOpen} onClose={() => setMatrixOpen(false)} title="Permission Matrix" size="xl">
        <p className="text-sm text-muted-foreground mb-4">
          Full breakdown of what each role can do. Click a group header to expand.
        </p>
        <PermissionMatrix />
      </Modal>

      {/* Modals */}
      <AssignRoleModal open={assignOpen} onClose={() => setAssignOpen(false)} />
      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Role"
        message={`Remove the "${revokeTarget?.role}" role from ${revokeTarget?.user_name ?? 'this user'}?`}
        confirmLabel="Revoke"
        variant="danger"
        loading={revokeLoading}
      />
    </PageShell>
  )
}
