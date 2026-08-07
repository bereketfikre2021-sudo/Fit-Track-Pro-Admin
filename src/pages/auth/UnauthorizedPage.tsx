import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldOff, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { isAdminRole } from '@/lib/permissions'

export function UnauthorizedPage() {
  const { signOut, loading, roles, session } = useAuth()
  const navigate = useNavigate()

  // If roles loaded and user IS an admin role, redirect to dashboard
  useEffect(() => {
    if (!loading && session && roles.some(isAdminRole)) {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, session, roles, navigate])

  if (loading) return <LoadingScreen message="Checking permissions…" />

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-5">
        <ShieldOff className="h-10 w-10 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your account doesn't have any admin privileges. Contact a super admin
          to assign you a role (Admin, Support, Content Manager, or Analyst).
        </p>
        {roles.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Current roles: <span className="font-medium text-foreground">{roles.join(', ')}</span>
          </p>
        )}
      </div>
      <Button
        variant="outline"
        leftIcon={<LogOut className="h-4 w-4" />}
        onClick={handleSignOut}
      >
        Sign out
      </Button>
    </div>
  )
}
