/**
 * SSOPage.tsx
 *
 * Dedicated SSO initiation page for Central Admin OIDC.
 * Route: /sso
 *
 * Central Admin opens this URL to kick off SSO into Fit Track Pro Admin.
 * No UI is shown — the browser is immediately redirected to the IdP.
 *
 * The OIDC provider slug "custom:central-admin" must be registered in the
 * Fit Track Pro Admin Supabase dashboard under:
 *   Authentication → Sign In / Up → Enterprise → Add provider
 *   Issuer: https://gencqivcjlhpfudecxxt.supabase.co/auth/v1
 *   Discovery: https://gencqivcjlhpfudecxxt.supabase.co/auth/v1/.well-known/openid-configuration
 */

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function SSOPage() {
  useEffect(() => {
    supabase.auth.signInWithOAuth({
      provider: 'oidc' as never,
      options: {
        scopes: 'openid email',
        redirectTo: 'https://fit-track-pro-admin.vercel.app/auth/callback',
        queryParams: {
          provider_id: 'custom:central-admin',
        },
      },
    })
  }, [])

  return <LoadingScreen message="Redirecting to Central Admin…" />
}
