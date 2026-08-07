/**
 * permissions.ts
 *
 * Central permission system for the FitTrack Pro Admin Dashboard.
 *
 * Role hierarchy (highest to lowest):
 *   super_admin > admin > content_manager > support > analyst > moderator > user
 *
 * Each role has a set of permissions. The permission check is additive —
 * a role inherits all permissions of roles below it in the hierarchy.
 */

export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'content_manager'
  | 'support'
  | 'analyst'
  | 'moderator'
  | 'user'

// ── Permission keys ───────────────────────────────────────────────────────────

export type Permission =
  // Users
  | 'users.view'
  | 'users.edit'
  | 'users.delete'
  | 'users.suspend'
  | 'users.reset_password'
  | 'users.change_role'
  // Subscriptions
  | 'subscriptions.view'
  | 'subscriptions.edit'
  | 'subscriptions.cancel'
  // Payments
  | 'payments.view'
  // Workouts (sessions / history)
  | 'workouts.view'
  | 'workouts.delete'
  // Nutrition (meal logs)
  | 'nutrition.view'
  | 'nutrition.delete'
  // Exercises
  | 'exercises.view'
  | 'exercises.create'
  | 'exercises.edit'
  | 'exercises.delete'
  // Notifications
  | 'notifications.view'
  | 'notifications.send'
  | 'notifications.delete'
  // AI usage logs
  | 'ai.view'
  // Reports & analytics
  | 'reports.view'
  // Settings (app_settings, subscription_plans)
  | 'settings.view'
  | 'settings.edit'
  // Roles management
  | 'roles.view'
  | 'roles.assign'

// ── Role → permission map ─────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    // Full access — all permissions
    'users.view', 'users.edit', 'users.delete', 'users.suspend', 'users.reset_password', 'users.change_role',
    'subscriptions.view', 'subscriptions.edit', 'subscriptions.cancel',
    'payments.view',
    'workouts.view', 'workouts.delete',
    'nutrition.view', 'nutrition.delete',
    'exercises.view', 'exercises.create', 'exercises.edit', 'exercises.delete',
    'notifications.view', 'notifications.send', 'notifications.delete',
    'ai.view',
    'reports.view',
    'settings.view', 'settings.edit',
    'roles.view', 'roles.assign',
  ],

  admin: [
    // Manage users, workouts, nutrition, notifications — NOT system settings or role assignment
    'users.view', 'users.edit', 'users.suspend', 'users.reset_password',
    'subscriptions.view', 'subscriptions.edit', 'subscriptions.cancel',
    'payments.view',
    'workouts.view', 'workouts.delete',
    'nutrition.view', 'nutrition.delete',
    'exercises.view', 'exercises.create', 'exercises.edit', 'exercises.delete',
    'notifications.view', 'notifications.send', 'notifications.delete',
    'ai.view',
    'reports.view',
    'settings.view',
    'roles.view',
  ],

  content_manager: [
    // Manage exercises, foods/nutrition templates, workout templates — no user data
    'exercises.view', 'exercises.create', 'exercises.edit', 'exercises.delete',
    'workouts.view',
    'nutrition.view',
    'notifications.view',
    'reports.view',
  ],

  support: [
    // View users, reset passwords, no destructive actions
    'users.view', 'users.reset_password', 'users.suspend',
    'subscriptions.view',
    'payments.view',
    'workouts.view',
    'nutrition.view',
    'notifications.view', 'notifications.send',
    'ai.view',
    'reports.view',
  ],

  analyst: [
    // Read-only: reports and analytics only
    'reports.view',
    'ai.view',
    'users.view',
    'subscriptions.view',
    'payments.view',
    'workouts.view',
    'nutrition.view',
    'exercises.view',
    'notifications.view',
  ],

  moderator: [
    'users.view',
    'workouts.view',
    'exercises.view',
    'notifications.view',
    'reports.view',
  ],

  user: [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the full set of permissions for a list of roles. */
export function getPermissions(roles: string[]): Set<Permission> {
  const perms = new Set<Permission>()
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role as AdminRole] ?? []
    for (const p of rolePerms) perms.add(p)
  }
  return perms
}

/** Returns true if ANY of the given roles grants the permission. */
export function can(roles: string[], permission: Permission): boolean {
  return getPermissions(roles).has(permission)
}

/** Returns true if ALL of the given permissions are granted by the roles. */
export function canAll(roles: string[], permissions: Permission[]): boolean {
  const perms = getPermissions(roles)
  return permissions.every((p) => perms.has(p))
}

// ── Role metadata (for UI display) ───────────────────────────────────────────

export interface RoleMeta {
  value: AdminRole
  label: string
  description: string
  color: 'red' | 'orange' | 'blue' | 'green' | 'purple' | 'slate'
}

export const ROLE_META: RoleMeta[] = [
  {
    value: 'super_admin',
    label: 'Super Admin',
    description: 'Full unrestricted access to everything including system settings and role management.',
    color: 'red',
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Manage users, workouts, nutrition, and notifications. Cannot edit system settings or assign roles.',
    color: 'orange',
  },
  {
    value: 'content_manager',
    label: 'Content Manager',
    description: 'Create and manage exercises, foods, workout templates, and meal plans. No user data access.',
    color: 'blue',
  },
  {
    value: 'support',
    label: 'Support',
    description: 'View user profiles, reset passwords, respond to issues. No destructive actions.',
    color: 'green',
  },
  {
    value: 'analyst',
    label: 'Analyst',
    description: 'Read-only access to reports, analytics, AI usage, and platform statistics.',
    color: 'purple',
  },
  {
    value: 'moderator',
    label: 'Moderator',
    description: 'Basic view access to users and content. Limited operational permissions.',
    color: 'slate',
  },
]

export const ROLE_COLOR_CLASSES: Record<string, string> = {
  super_admin:     'bg-red-500/15 text-red-400 border border-red-500/20',
  admin:           'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  content_manager: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  support:         'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  analyst:         'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  moderator:       'bg-slate-500/15 text-slate-400 border border-slate-500/20',
  user:            'bg-secondary text-secondary-foreground',
}

/** Returns true if this role can access the admin dashboard at all. */
export function isAdminRole(role: string): boolean {
  return ['super_admin', 'admin', 'content_manager', 'support', 'analyst', 'moderator'].includes(role)
}

/** Sorted list of roles that can be assigned to admin dashboard users. */
export const ASSIGNABLE_ROLES: AdminRole[] = [
  'super_admin', 'admin', 'content_manager', 'support', 'analyst', 'moderator',
]
