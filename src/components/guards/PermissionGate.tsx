/**
 * PermissionGate.tsx
 *
 * Conditionally renders children based on whether the current user
 * has the required permission(s).
 *
 * Usage:
 *   <PermissionGate permission="users.delete">
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permission="settings.edit" fallback={<ReadOnlyView />}>
 *     <EditableForm />
 *   </PermissionGate>
 */

import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import type { Permission } from '@/lib/permissions'

interface PermissionGateProps {
  permission: Permission | Permission[]
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const { can, canAll } = useAuth()

  const allowed = Array.isArray(permission)
    ? canAll(permission)
    : can(permission)

  return <>{allowed ? children : fallback}</>
}

/** Hook version for imperative checks */
export function usePermission(permission: Permission | Permission[]): boolean {
  const { can, canAll } = useAuth()
  return Array.isArray(permission) ? canAll(permission) : can(permission)
}
