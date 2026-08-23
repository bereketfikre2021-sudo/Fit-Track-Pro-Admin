import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, ExternalLink } from 'lucide-react'
import {
  fetchUserSubscriptions, fetchUserPayments, fetchUserPaymentSubmissions,
} from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  ExtendSubscriptionDialog,
  CancelSubscriptionDialog,
  ChangeSubscriptionDialog,
} from '@/components/users/UserActions'
import { supabase } from '@/lib/supabase'
import type { AdminUser } from '@/lib/users.queries'

interface Props { userId: string; user: AdminUser }

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'outline' | 'info'> = {
  active: 'success', trialing: 'info', cancelled: 'warning',
  expired: 'danger', past_due: 'danger', paused: 'outline',
}

const PAY_BADGE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'outline'> = {
  succeeded: 'success', failed: 'danger', pending: 'warning', refunded: 'info', disputed: 'danger',
}

const SUB_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'outline' | 'info'> = {
  pending_verification: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'outline',
  expired: 'info',
}

export function SubscriptionsTab({ userId, user }: Props) {
  const { data: subs = [], isLoading: sLoading } = useQuery({
    queryKey: ['user-subscriptions', userId],
    queryFn: () => fetchUserSubscriptions(userId),
  })
  const { data: payments = [], isLoading: pLoading } = useQuery({
    queryKey: ['user-payments', userId],
    queryFn: () => fetchUserPayments(userId),
  })
  const { data: submissions = [], isLoading: subLoading } = useQuery({
    queryKey: ['user-payment-submissions', userId],
    queryFn: () => fetchUserPaymentSubmissions(userId),
  })

  const activeSub = subs.find((s) => ['active', 'trialing'].includes(s.status))
  const [showExtend, setShowExtend] = useState(false)
  const [showCancel, setShowCancel]  = useState(false)
  const [showChange, setShowChange]  = useState(false)

  const openProof = async (path: string) => {
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(path, 600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  if (sLoading || pLoading || subLoading) return (
    <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  )

  return (
    <div className="space-y-6 pt-5">

      {/* Active subscription */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Active Subscription</h3>
        {!activeSub ? (
          <p className="text-sm text-muted-foreground">No active subscription</p>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="font-medium">{activeSub.plan_name}</span>
                <Badge variant={STATUS_BADGE[activeSub.status] ?? 'outline'}>{activeSub.status}</Badge>
                {activeSub.cancel_at_period_end && <Badge variant="warning">Cancels at period end</Badge>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => setShowChange(true)}>Change plan</Button>
                <Button size="sm" variant="outline" onClick={() => setShowExtend(true)}>Extend</Button>
                <Button size="sm" variant="outline" onClick={() => setShowCancel(true)}>Cancel</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
              <div><span className="block font-medium text-foreground">Provider</span>{activeSub.provider}</div>
              <div><span className="block font-medium text-foreground">Period start</span>{formatDate(activeSub.current_period_start)}</div>
              <div><span className="block font-medium text-foreground">Period end</span>{formatDate(activeSub.current_period_end)}</div>
              <div><span className="block font-medium text-foreground">Trial end</span>{activeSub.trial_end ? formatDate(activeSub.trial_end) : '—'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Subscription history */}
      {subs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Subscription History</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{s.plan_name ?? s.tier ?? '—'}</td>
                    <td className="px-4 py-2.5"><Badge variant={STATUS_BADGE[s.status] ?? 'outline'}>{s.status}</Badge></td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{s.provider}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual payment submissions */}
      {submissions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Payment Submissions</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Submitted</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">
                      {s.plan_name ?? '—'}
                      <span className="text-xs text-muted-foreground ml-1 capitalize">{s.plan_tier}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                      ETB {s.amount_etb.toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.method_name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="space-y-0.5">
                        <Badge variant={SUB_BADGE[s.status] ?? 'outline'}>{s.status.replace('_', ' ')}</Badge>
                        {s.rejection_reason && <p className="text-[10px] text-red-400">{s.rejection_reason}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{formatDate(s.submitted_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {s.proof_path && (
                        <button onClick={() => openProof(s.proof_path!)} title="View proof"
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ml-auto">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment records */}
      {payments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Payment Records</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium tabular-nums">{formatCurrency(p.amount_usd)}</td>
                    <td className="px-4 py-2.5"><Badge variant={PAY_BADGE[p.status] ?? 'outline'}>{p.status}</Badge></td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{p.provider}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ExtendSubscriptionDialog user={user} subscriptionId={activeSub?.id ?? null} open={showExtend} onClose={() => setShowExtend(false)} />
      <CancelSubscriptionDialog user={user} subscriptionId={activeSub?.id ?? null} open={showCancel} onClose={() => setShowCancel(false)} />
      <ChangeSubscriptionDialog user={user} subscriptionId={activeSub?.id ?? null} open={showChange} onClose={() => setShowChange(false)} />
    </div>
  )
}
