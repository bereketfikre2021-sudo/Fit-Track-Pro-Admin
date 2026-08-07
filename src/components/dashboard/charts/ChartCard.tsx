import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { BarChart2 } from 'lucide-react'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
  loading?: boolean
  className?: string
}

function ChartEmpty() {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
      <BarChart2 className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
      <p className="text-xs text-muted-foreground">No data available</p>
    </div>
  )
}

export function ChartCard({ title, subtitle, children, loading = false, className }: ChartCardProps) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-5 shadow-sm', className)}
      role="figure"
      aria-label={title}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {loading ? (
        <div className="flex h-[220px] items-center justify-center">
          <Spinner size="md" label={`Loading ${title} chart`} />
        </div>
      ) : (
        <ErrorBoundary fallback={<ChartEmpty />}>
          {children}
        </ErrorBoundary>
      )}
    </div>
  )
}
