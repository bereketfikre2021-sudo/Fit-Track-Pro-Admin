import { Wallet, CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { RecentPayment } from '@/lib/dashboard.queries'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime, truncate } from '@/lib/utils'
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

function fmtAmount(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function RecentPayments({ data, loading, error }: Props) {
  return (
    <WidgetCard title="Recent Payments" icon={Wallet} viewAllHref="/payments">
      {loading ? (
        <div className="flex justify-center py-8" aria-label="Loading recent payments">
          <Spinner label="Loading recent payments" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8" role="alert">
          Failed to load payments.
        </p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No payments recorded yet.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Recent payments">
          {data.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <StatusIcon status={p.status} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{fmtAmount(p.amount_usd)}</p>
                <p className="text-xs text-muted-foreground">
                  {truncate(p.provider, 12)} · {formatDateTime(p.created_at)}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[p.status as PayStatus] ?? 'default'}>{p.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
