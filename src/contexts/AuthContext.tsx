/**
 * AuthContext.tsx — Admin Dashboard Auth
 *
 * Loading strategy:
 * - onAuthStateChange fires synchronously on mount with the current session
 * - We set session immediately (sync) then kick off role loading async
 * - loading clears after INITIAL_AUTH event resolves roles
 * - Never await inside onAuthStateChange — causes Supabase deadlock
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { can, canAll, isAdminRole, type Permission } from '@/lib/permissions'

export type AppRole = 'user' | 'moderator' | 'admin' | 'super_admin' | 'content_manager' | 'support' | 'analyst'

const ROLE_HIERARCHY: Record<AppRole, number> = {
  user: 0,
  moderator: 1,
  analyst: 1,
  support: 2,
  content_manager: 2,
  admin: 3,
  super_admin: 4,
}

export function hasRole(roles: AppRole[], required: AppRole): boolean {
  if (!roles.length) return false
  const max = Math.max(...roles.map((r) => ROLE_HIERARCHY[r] ?? 0))
  return max >= (ROLE_HIERARCHY[required] ?? 999)
}

interface AuthState {
  session: Session | null
  user: User | null
  roles: AppRole[]
  loading: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  hasRole: (required: AppRole) => boolean
  can: (permission: Permission) => boolean
  canAll: (permissions: Permission[]) => boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [roles, setRoles] = useState<AppRole[]>([])
  const [loading, setLoading] = useState(true)
  const rolesLoadedFor = useRef<string | null>(null)
  const initialEventFired = useRef(false)

  // Load roles as a standalone async function — never awaited inside callbacks
  const loadRoles = useCallback((userId: string) => {
    if (!userId || rolesLoadedFor.current === userId) return
    rolesLoadedFor.current = userId

    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[AuthContext] loadRoles error:', error.message)
          setRoles(['user'])
        } else {
          const loaded = (data?.map((r: { role: string }) => r.role) ?? []) as AppRole[]
          setRoles(loaded.length ? loaded : ['user'])
        }
        // Clear loading after first role load
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION or SIGNED_OUT
    // This is the canonical way to bootstrap auth per Supabase docs
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)

      if (session?.user?.id) {
        // Reset role cache on new session
        if (rolesLoadedFor.current !== session.user.id) {
          rolesLoadedFor.current = null
        }
        loadRoles(session.user.id)
      } else {
        // No session — clear everything and stop loading
        setRoles([])
        rolesLoadedFor.current = null
        setLoading(false)
      }

      // Mark that the initial event has fired
      if (!initialEventFired.current) {
        initialEventFired.current = true
        // If no session, loading is already set to false above
        // If there is a session, loadRoles() will clear it
      }
    })

    return () => subscription.unsubscribe()
  }, [loadRoles])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    setRoles([])
    rolesLoadedFor.current = null
    await supabase.auth.signOut()
    // onAuthStateChange will fire SIGNED_OUT and set session=null + loading=false
  }

  const isAdmin = hasRole(roles, 'admin')
  const isSuperAdmin = hasRole(roles, 'super_admin')

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        roles,
        loading,
        isAdmin,
        isSuperAdmin,
        hasRole: (required) => hasRole(roles, required),
        can: (permission) => can(roles, permission),
        canAll: (permissions) => canAll(roles, permissions),
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
