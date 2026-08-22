import { ShieldCheck, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { RecentPayment } from '@/lib/dashboard.queries'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, truncate } from '@/lib/utils'
import { WidgetCard } from './WidgetCard'

interface Props {
  data: RecentPayment[]
  loading: boolean
  error?: boolean
}

type PayStatus = 'succeeded' | 'failed' | 'pending' | 'refunded' | 'disputed'

const STATUS_BADGE: Record<PayStatus, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  succeeded: 'success', failed: 'danger', pending: 'warning', refunded: 'info', disputed: 'danger',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'succeeded') return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
  if (status === 'failed' || status === 'disputed') return <XCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
  return <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />
}

function fmtEtb(n: number): string {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 0 })}`
}

export function RecentPayments({ data, loading, error }: Props) {
  return (
    <WidgetCard title="Recent Payments" icon={ShieldCheck} viewAllHref="/payments">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner label="Loading recent payments" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8" role="alert">
          Failed to load payments.
        </p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No payments recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border/50" aria-label="Recent payments">
          {data.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <StatusIcon status={p.status} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground leading-tight">
                  {fmtEtb(p.amount_usd)}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {truncate(p.provider, 12)} · {formatDate(p.created_at)}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[p.status as PayStatus] ?? 'default'} className="text-[10px]">
                {p.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
