/**
 * SSOPage.tsx
 *
 * Dedicated SSO initiation page for Central Admin OIDC.
 * Route: /sso
 *
 * Central Admin opens this URL to kick off SSO into Fit Track Pro Admin.
 * No UI is shown — the browser is immediately redirected to the IdP.
 *
 * The OIDC provider with identifier "custom:central-admin" must be registered
 * in the Fit Track Pro Admin Supabase dashboard under:
 *   Authentication → Auth Providers → New Provider → Auto-discovery (OIDC)
 *   Identifier:  custom:central-admin
 *   Issuer URL:  https://gencqivcjlhpfudecxxt.supabase.co/auth/v1
 */

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function SSOPage() {
  useEffect(() => {
    supabase.auth.signInWithOAuth({
      provider: 'custom:central-admin' as never,
      options: {
        scopes: 'openid email',
        redirectTo: 'https://fit-track-pro-admin.vercel.app/auth/callback',
      },
    })
  }, [])

  return <LoadingScreen message="Redirecting to Central Admin…" />
}
