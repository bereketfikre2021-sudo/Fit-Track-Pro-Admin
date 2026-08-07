import { Lock } from 'lucide-react'

interface PageAccessDeniedProps {
  message?: string
}

/**
 * Shown inside a page when the user can reach the route but
 * lacks the specific permission to view its content.
 */
export function PageAccessDenied({ message = "You don't have permission to view this content." }: PageAccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="rounded-full bg-muted p-4">
        <Lock className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      </div>
    </div>
  )
}
