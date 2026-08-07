/**
 * PageShell.tsx
 * Consistent page wrapper used by every admin page.
 * Renders the page title, optional description, optional action slot, and children.
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
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0">{actions}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  )
}
