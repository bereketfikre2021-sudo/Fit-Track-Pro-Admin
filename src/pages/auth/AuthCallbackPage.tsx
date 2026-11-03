/**
 * AuthCallbackPage.tsx
 *
 * PKCE OAuth callback handler.
 * Route: /auth/callback
 *
 * With flowType:'pkce' + detectSessionInUrl:true, the Supabase client
 * automatically exchanges the ?code= param on initialization and fires
 * onAuthStateChange(SIGNED_IN). We simply wait for that event and then
 * navigate — never calling exchangeCodeForSession or getSession() early,
 * which would race against the in-flight exchange and return null.
 *
 * AdminRouteGuard handles /unauthorized if roles are insufficient.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    // Listen for the SIGNED_IN event that detectSessionInUrl triggers after
    // exchanging the authorization code. This fires before getSession() would
    // resolve with a valid session, so it's the reliable signal to navigate.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe()
        navigate('/dashboard', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        navigate('/login', { replace: true })
      }
    })

    // Safety timeout: if neither event fires in 10 s, bail to login.
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      console.warn('[AuthCallback] Timed out waiting for auth event.')
      navigate('/login', { replace: true })
    }, 10_000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return <LoadingScreen message="Completing sign-in…" />
}
