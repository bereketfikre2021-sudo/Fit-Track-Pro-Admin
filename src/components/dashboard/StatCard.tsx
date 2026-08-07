import { type ElementType, type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'

export type TrendDir = 'up' | 'down' | 'neutral'

interface StatCardProps {
  title: string
  value: string | number
  icon: ElementType
  iconColor?: string      // Tailwind text-* class
  iconBg?: string         // Tailwind bg-* class
  trend?: { value: string; dir: TrendDir; label?: string }
  loading?: boolean
  className?: string
  children?: ReactNode    // optional sparkline slot
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
        'rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
          <div className="mt-1 flex items-baseline gap-1">
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <span className="text-2xl font-bold tabular-nums leading-none text-foreground">
                {value}
              </span>
            )}
          </div>
        </div>
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            iconBg,
          )}
          aria-hidden="true"
        >
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>

      {trend && !loading && (
        <div className="flex items-center gap-1.5 text-xs">
          {trend.dir === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
          {trend.dir === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
          {trend.dir === 'neutral' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
          <span
            className={cn(
              'font-medium',
              trend.dir === 'up' && 'text-emerald-500',
              trend.dir === 'down' && 'text-red-500',
              trend.dir === 'neutral' && 'text-muted-foreground',
            )}
          >
            {trend.value}
          </span>
          {trend.label && (
            <span className="text-muted-foreground">{trend.label}</span>
          )}
        </div>
      )}

      {children}
    </div>
  )
}
