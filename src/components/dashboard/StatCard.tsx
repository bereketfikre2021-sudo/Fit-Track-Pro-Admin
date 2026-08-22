import { type ElementType, type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

export type TrendDir = 'up' | 'down' | 'neutral'

interface StatCardProps {
  title: string
  value: string | number
  icon: ElementType
  iconColor?: string
  iconBg?: string
  trend?: { value: string; dir: TrendDir; label?: string }
  loading?: boolean
  className?: string
  children?: ReactNode
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
  loading = false,
  className,
  children,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 relative group',
        className,
      )}
    >
      {/* 3-dot menu — matches chart card style */}
      <button
        className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground/0 group-hover:text-muted-foreground hover:bg-secondary transition-all"
        aria-label="Card options"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {/* Icon + title row */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            iconBg,
          )}
          aria-hidden="true"
        >
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
        <p className="text-xs font-medium text-muted-foreground leading-tight">{title}</p>
      </div>

      {/* Value */}
      <div>
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <span className="text-2xl font-bold tabular-nums leading-none text-foreground">
            {value}
          </span>
        )}
      </div>

      {/* Trend */}
      {trend && !loading && (
        <div className="flex items-center gap-1.5 text-xs pt-0.5 border-t border-border/50">
          {trend.dir === 'up' && (
            <span className="flex items-center gap-0.5 font-semibold text-emerald-500">
              <TrendingUp className="h-3.5 w-3.5" />
              {trend.value}
            </span>
          )}
          {trend.dir === 'down' && (
            <span className="flex items-center gap-0.5 font-semibold text-red-500">
              <TrendingDown className="h-3.5 w-3.5" />
              {trend.value}
            </span>
          )}
          {trend.dir === 'neutral' && (
            <span className="flex items-center gap-0.5 font-semibold text-muted-foreground">
              <Minus className="h-3.5 w-3.5" />
              {trend.value}
            </span>
          )}
          {trend.label && (
            <span className="text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}

      {children}
    </div>
  )
}
