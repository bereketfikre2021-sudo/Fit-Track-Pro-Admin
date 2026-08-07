import { type ElementType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WidgetCardProps {
  title: string
  icon?: ElementType
  viewAllHref?: string
  children: ReactNode
  className?: string
}

export function WidgetCard({ title, icon: Icon, viewAllHref, children, className }: WidgetCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-sm flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-3">{children}</div>
    </div>
  )
}
