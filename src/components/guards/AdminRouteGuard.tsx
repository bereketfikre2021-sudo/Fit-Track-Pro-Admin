/**
 * AdminRouteGuard.tsx
 * Allows any recognised admin role into the dashboard.
 * Per-page permission checks are done with useAuth().can()
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminRole } from '@/lib/permissions'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function AdminRouteGuard() {
  const { session, loading, roles } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen message="Loading…" />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />

  const hasAdminAccess = roles.some(isAdminRole)
  if (!hasAdminAccess) return <Navigate to="/unauthorized" replace />

  return <Outlet />
}
