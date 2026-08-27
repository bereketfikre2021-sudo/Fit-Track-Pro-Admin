/**
 * ReportShell.tsx
 * Shared wrapper for every report — date range picker, export buttons, loading states.
 */

import type { ReactNode } from 'react'
import { Download, FileText, RefreshCw, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils'

interface ReportShellProps {
  title: string
  description: string
  dateFrom: string
  dateTo: string
  onDateFrom: (v: string) => void
  onDateTo:   (v: string) => void
  onRefetch:  () => void
  onExportCsv?: () => void
  onExportPdf?: () => void
  isLoading: boolean
  isFetching: boolean
  children: ReactNode
  presets?: { label: string; months: number }[]
}

const DEFAULT_PRESETS = [
  { label: '1M',  months: 1 },
  { label: '3M',  months: 3 },
  { label: '6M',  months: 6 },
  { label: '1Y',  months: 12 },
]

export function ReportShell({
  title, description,
  dateFrom, dateTo, onDateFrom, onDateTo, onRefetch,
  onExportCsv, onExportPdf,
  isLoading, isFetching,
  children,
  presets = DEFAULT_PRESETS,
}: ReportShellProps) {
  const setPreset = (months: number) => {
    const to   = new Date()
    const from = new Date()
    from.setMonth(from.getMonth() - months)
    onDateFrom(from.toISOString().slice(0, 10))
    onDateTo(to.toISOString().slice(0, 10))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onExportCsv && (
            <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={onExportCsv} disabled={isLoading}>
              CSV
            </Button>
          )}
          {onExportPdf && (
            <Button size="sm" variant="outline" leftIcon={<FileText className="h-3.5 w-3.5" />} onClick={onExportPdf} disabled={isLoading}>
              PDF
            </Button>
          )}
          <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRefetch} loading={isFetching}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => onDateFrom(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <span className="text-muted-foreground text-xs">to</span>
          <input type="date" value={dateTo} onChange={(e) => onDateTo(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <div className="flex gap-1">
          {presets.map((p) => (
            <button key={p.label} onClick={() => setPreset(p.months)}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
        {isFetching && <Spinner size="sm" />}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-muted-foreground">Generating report…</p>
          </div>
        </div>
      ) : children}
    </div>
  )
}

// ── Stat card for reports ─────────────────────────────────────────────────────

interface ReportStatProps {
  label: string
  value: string | number
  sub?: string
  color?: string
}

export function ReportStat({ label, value, sub, color = 'text-foreground' }: ReportStatProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4 overflow-hidden min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={cn(
        'font-bold mt-1 tabular-nums leading-tight truncate',
        // Scale font size down on narrow containers — use text-lg on mobile, text-xl on sm+
        'text-lg sm:text-xl lg:text-2xl',
        color,
      )}
        title={String(value)}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
    </div>
  )
}
