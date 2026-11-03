/**
 * AuthCallbackPage.tsx
 *
 * PKCE OAuth callback handler.
 * Route: /auth/callback
 *
 * Supabase redirects here after the user authenticates with any OAuth
 * provider (currently: Central Admin OIDC). With flowType:'pkce' and
 * detectSessionInUrl:true set in the Supabase client, getSession() handles
 * the code exchange automatically — no manual exchangeCodeForSession needed.
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
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('[AuthCallback] getSession error:', error.message)
        navigate('/login', { replace: true })
      } else if (data.session) {
        // Session established; AuthContext.onAuthStateChange will load roles.
        // AdminRouteGuard handles /unauthorized if roles are insufficient.
        navigate('/dashboard', { replace: true })
      } else {
        // No session and no error — code may have already been consumed.
        console.warn('[AuthCallback] No session after callback, redirecting to login.')
        navigate('/login', { replace: true })
      }
    })
  }, [navigate])

  return <LoadingScreen message="Completing sign-in…" />
}
