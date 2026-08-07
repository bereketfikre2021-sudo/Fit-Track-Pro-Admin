import { BrainCircuit, CheckCircle2, XCircle } from 'lucide-react'
import type { RecentAiRequest } from '@/lib/dashboard.queries'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime, truncate } from '@/lib/utils'
import { WidgetCard } from './WidgetCard'

interface Props {
  data: RecentAiRequest[]
  loading: boolean
  error?: boolean
}

function featureLabel(f: string): string {
  return f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RecentAiRequests({ data, loading, error }: Props) {
  return (
    <WidgetCard title="Recent AI Requests" icon={BrainCircuit} viewAllHref="/ai-usage">
      {loading ? (
        <div className="flex justify-center py-8" aria-label="Loading recent AI requests">
          <Spinner label="Loading recent AI requests" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8" role="alert">
          Failed to load AI requests.
        </p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No AI requests yet.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Recent AI requests">
          {data.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              {r.success
                ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-label="Success" />
                : <XCircle className="h-4 w-4 shrink-0 text-red-400" aria-label="Failed" />
              }
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {truncate(featureLabel(r.feature), 24)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.provider} · {r.model ? truncate(r.model, 16) : '—'} · {formatDateTime(r.created_at)}
                </p>
              </div>
              {r.total_tokens != null && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {r.total_tokens.toLocaleString()} tok
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
