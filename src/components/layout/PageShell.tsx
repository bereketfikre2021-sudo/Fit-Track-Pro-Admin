/**
 * PageShell.tsx
 * Consistent page wrapper — tighter header matching the dashboard screenshot style.
 */

import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  title: string
  description?: string
  icon?: ElementType
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function PageShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn('space-y-5', className)}>
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground leading-tight truncate">{title}</h1>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}
