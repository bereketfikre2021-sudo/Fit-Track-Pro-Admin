/**
 * AuthCallbackPage.tsx
 *
 * PKCE OAuth callback handler.
 * Route: /auth/callback
 *
 * Supabase redirects here after the user authenticates with any OAuth
 * provider (currently: Central Admin OIDC). This page exchanges the
 * authorization code for a session, then sends the user to the dashboard.
 *
 * The AdminRouteGuard will redirect to /unauthorized if the authenticated
 * user does not have a row in user_roles with an admin-level role.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          console.error('[AuthCallback] exchangeCodeForSession error:', error.message)
          navigate('/login', { replace: true })
        } else {
          // Session is set; AuthContext.onAuthStateChange will load roles.
          // AdminRouteGuard handles /unauthorized if roles are insufficient.
          navigate('/dashboard', { replace: true })
        }
      })
  }, [navigate])

  return <LoadingScreen message="Completing sign-in…" />
}
