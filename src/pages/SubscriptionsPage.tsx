/**
 * SubscriptionsPage.tsx — Full Subscription Management
 * Tabs: Overview | Plans | Active | Trials | Expired | Renewals | Revenue | Payments | Timeline
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CreditCard, RefreshCw, ArrowUp, ArrowDown, Ban, Pause, Play,
  Gift, RotateCcw, CalendarDays, DollarSign, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGate } from '@/components/guards/PermissionGate'
import {
  fetchAllPlans, fetchSubscriptionsByStatus, fetchSubscriptionStats,
  fetchUpcomingRenewals, fetchRevenueSummary, fetchSubscriptionEvents,
  upgradeSubscription, downgradeSubscription, cancelSubscription,
  pauseSubscription, resumeSubscription, grantFreeMonths, manualRenewal,
  type FullSubscription, type SubscriptionPlan,
} from '@/lib/subscriptions.queries'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const PAGE_SIZE = 20

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'outline' | 'info'> = {
  active: 'success', trialing: 'info', cancelled: 'warning',
  expired: 'danger', past_due: 'danger', paused: 'outline',
}

const TIER_ORDER = ['free', 'pro', 'elite', 'team']

function isTierHigher(a: string, b: string) {
  return TIER_ORDER.indexOf(a) > TIER_ORDER.indexOf(b)
}

// ── Action modal (single component handles all actions) ───────────────────────

type ActionType = 'upgrade' | 'downgrade' | 'cancel' | 'pause' | 'resume' | 'free_months' | 'renew' | null

interface ActionModalProps {
  sub: FullSubscription | null
  action: ActionType
  plans: SubscriptionPlan[]
  onClose: () => void
}

function ActionModal({ sub, action, plans, onClose }: ActionModalProps) {
  const { user: admin } = useAuth()
  const qc = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [months, setMonths] = useState('1')
  const [immediate, setImmediate] = useState(false)

  if (!sub || !action) return null

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sub-active'] })
    qc.invalidateQueries({ queryKey: ['sub-trialing'] })
    qc.invalidateQueries({ queryKey: ['sub-expired'] })
    qc.invalidateQueries({ queryKey: ['sub-stats'] })
    qc.invalidateQueries({ queryKey: ['sub-renewals'] })
  }

  const run = async () => {
    if (!admin?.id) return
    setLoading(true)
    try {
      switch (action) {
        case 'upgrade':
          if (!selectedPlanId) { toast.error('Select a plan'); return }
          await upgradeSubscription(sub.id, selectedPlanId, admin.id)
          toast.success('Subscription upgraded')
          break
        case 'downgrade':
          if (!selectedPlanId) { toast.error('Select a plan'); return }
          await downgradeSubscription(sub.id, selectedPlanId, admin.id)
          toast.success('Subscription downgraded')
          break
        case 'cancel':
          await cancelSubscription(sub.id, immediate, admin.id)
          toast.success(immediate ? 'Subscription cancelled immediately' : 'Will cancel at period end')
          break
        case 'pause':
          await pauseSubscription(sub.id, admin.id)
          toast.success('Subscription paused')
          break
        case 'resume':
          await resumeSubscription(sub.id, admin.id)
          toast.success('Subscription resumed')
          break
        case 'free_months':
          await grantFreeMonths(sub.id, parseInt(months) || 1, admin.id)
          toast.success(`Granted ${months} free month(s)`)
          break
        case 'renew':
          await manualRenewal(sub.id, admin.id)
          toast.success('Manual renewal applied')
          break
      }
      invalidate()
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<string, string> = {
    upgrade: 'Upgrade Plan', downgrade: 'Downgrade Plan', cancel: 'Cancel Subscription',
    pause: 'Pause Subscription', resume: 'Resume Subscription',
    free_months: 'Grant Free Months', renew: 'Manual Renewal',
  }

  const upgradePlans = plans.filter((p) => isTierHigher(p.tier, sub.plan_tier) && p.is_active)
  const downgradePlans = plans.filter((p) => !isTierHigher(p.tier, sub.plan_tier) && p.tier !== sub.plan_tier && p.is_active)

  return (
    <Modal open={!!action} onClose={onClose} title={titles[action]} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          User: <strong className="text-foreground">{sub.user_name ?? sub.user_id.slice(0, 8)}</strong>
          {' · '}Current plan: <strong className="text-foreground">{sub.plan_name}</strong>
        </p>

        {(action === 'upgrade') && (
          <Select label="New plan" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}
            placeholder="Select upgrade plan…"
            options={upgradePlans.map((p) => ({ value: p.id, label: `${p.name} — $${p.price_monthly_usd}/mo` }))} />
        )}
        {(action === 'downgrade') && (
          <Select label="New plan" value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}
            placeholder="Select downgrade plan…"
            options={downgradePlans.map((p) => ({ value: p.id, label: `${p.name} — $${p.price_monthly_usd}/mo` }))} />
        )}
        {action === 'cancel' && (
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} />
            Cancel immediately (instead of at period end)
          </label>
        )}
        {action === 'free_months' && (
          <Input label="Number of free months" type="number" min="1" max="12" value={months}
            onChange={(e) => setMonths(e.target.value)} />
        )}
        {action === 'renew' && (
          <p className="text-sm text-muted-foreground rounded-md bg-muted/30 p-3">
            This will set the period start to now and extend the period end by 1 month, setting status to active.
          </p>
        )}
        {(action === 'pause' || action === 'resume') && (
          <p className="text-sm text-muted-foreground rounded-md bg-muted/30 p-3">
            {action === 'pause' ? 'The subscription will be paused. No charges will occur during the pause.' : 'The subscription will be reactivated to active status.'}
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant={action === 'cancel' ? 'destructive' : 'primary'}
            onClick={run} loading={loading}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Subscription row with inline action menu ──────────────────────────────────

function SubRow({ sub, plans, onAction }: {
  sub: FullSubscription
  plans: SubscriptionPlan[]
  onAction: (sub: FullSubscription, action: ActionType) => void
}) {
  const isPaused = sub.status === 'paused'
  const isActive = ['active', 'trialing'].includes(sub.status)

  return (
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-2.5">
        <div className="font-medium truncate max-w-[130px]">{sub.user_name ?? <span className="italic text-muted-foreground">No name</span>}</div>
        <div className="text-xs text-muted-foreground">{sub.user_id.slice(0, 8)}…</div>
      </td>
      <td className="px-4 py-2.5">
        <div className="font-medium">{sub.plan_name}</div>
        <div className="text-xs text-muted-foreground uppercase">{sub.plan_tier}</div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-col gap-0.5">
          <Badge variant={STATUS_BADGE[sub.status] ?? 'outline'}>{sub.status}</Badge>
          {sub.cancel_at_period_end && <span className="text-xs text-amber-400">Cancels at end</span>}
        </div>
      </td>
      <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{sub.provider}</td>
      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{formatDate(sub.current_period_end)}</td>
      <td className="px-4 py-2.5">
        <PermissionGate permission="subscriptions.edit">
          <div className="flex items-center justify-end gap-1 flex-wrap">
            <button onClick={() => onAction(sub, 'upgrade')} title="Upgrade"
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onAction(sub, 'downgrade')} title="Downgrade"
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            {isPaused
              ? <button onClick={() => onAction(sub, 'resume')} title="Resume"
                  className="flex h-7 w-7 items-center justify-center rounded text-emerald-400 hover:bg-secondary transition-colors">
                  <Play className="h-3.5 w-3.5" />
                </button>
              : isActive && <button onClick={() => onAction(sub, 'pause')} title="Pause"
                  className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <Pause className="h-3.5 w-3.5" />
                </button>
            }
            <button onClick={() => onAction(sub, 'free_months')} title="Grant free months"
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Gift className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onAction(sub, 'renew')} title="Manual renewal"
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <PermissionGate permission="subscriptions.cancel">
              <button onClick={() => onAction(sub, 'cancel')} title="Cancel"
                className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Ban className="h-3.5 w-3.5" />
              </button>
            </PermissionGate>
          </div>
        </PermissionGate>
      </td>
    </tr>
  )
}

// ── Subscriber table component ────────────────────────────────────────────────

function SubTable({ queryKey, statuses, plans }: {
  queryKey: string
  statuses: string | string[]
  plans: SubscriptionPlan[]
}) {
  const [page, setPage] = useState(0)
  const [actionTarget, setActionTarget] = useState<FullSubscription | null>(null)
  const [currentAction, setCurrentAction] = useState<ActionType>(null)

  const { data, isLoading } = useQuery({
    queryKey: [queryKey, page],
    queryFn: () => fetchSubscriptionsByStatus(statuses, page, PAGE_SIZE),
    placeholderData: (p) => p,
  })

  const handleAction = (sub: FullSubscription, action: ActionType) => {
    setActionTarget(sub)
    setCurrentAction(action)
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!data?.data.length) return <p className="text-sm text-muted-foreground py-8 text-center">No subscriptions found</p>

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Period end</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.data.map((s) => (
              <SubRow key={s.id} sub={s} plans={plans} onAction={handleAction} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
      <ActionModal sub={actionTarget} action={currentAction} plans={plans}
        onClose={() => { setActionTarget(null); setCurrentAction(null) }} />
    </div>
  )
}

// ── Plans tab ─────────────────────────────────────────────────────────────────

function PlansTab({ plans, onRefresh }: { plans: SubscriptionPlan[]; onRefresh: () => void }) {
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState<SubscriptionPlan | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      const { error } = await supabase.from('subscription_plans').update({
        max_ai_calls_day: editTarget.max_ai_calls_day,
        max_devices: editTarget.max_devices,
        is_active: editTarget.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', editTarget.id)
      if (error) throw error
      toast.success('Plan updated')
      qc.invalidateQueries({ queryKey: ['all-plans'] })
      setEditTarget(null)
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{plan.name}</h3>
              <Badge variant={plan.is_active ? 'success' : 'outline'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">${plan.price_monthly_usd}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground">${plan.price_yearly_usd}/yr</p>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>AI calls/day</span><span className="font-medium text-foreground">{plan.max_ai_calls_day}</span></div>
              <div className="flex justify-between"><span>Devices</span><span className="font-medium text-foreground">{plan.max_devices}</span></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(plan.features).map(([k, v]) => (
                <Badge key={k} variant={v ? 'success' : 'outline'} className="text-[10px]">{k}</Badge>
              ))}
            </div>
            <PermissionGate permission="settings.edit">
              <Button size="sm" variant="outline" className="w-full" onClick={() => setEditTarget({ ...plan })}>Edit limits</Button>
            </PermissionGate>
          </div>
        ))}
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.name} limits`} size="sm">
        {editTarget && (
          <div className="space-y-4">
            <Input label="AI calls per day" type="number" min="0" value={editTarget.max_ai_calls_day}
              onChange={(e) => setEditTarget({ ...editTarget, max_ai_calls_day: parseInt(e.target.value) || 0 })} />
            <Input label="Max devices" type="number" min="1" value={editTarget.max_devices}
              onChange={(e) => setEditTarget({ ...editTarget, max_devices: parseInt(e.target.value) || 1 })} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editTarget.is_active}
                onChange={(e) => setEditTarget({ ...editTarget, is_active: e.target.checked })} />
              Plan is active (visible to users)
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} loading={saving}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Renewal calendar tab ──────────────────────────────────────────────────────

function RenewalsTab({ plans }: { plans: SubscriptionPlan[] }) {
  const [days, setDays] = useState(30)
  const { data: renewals = [], isLoading } = useQuery({
    queryKey: ['sub-renewals', days],
    queryFn: () => fetchUpcomingRenewals(days),
  })
  const [actionTarget, setActionTarget] = useState<FullSubscription | null>(null)
  const [currentAction, setCurrentAction] = useState<ActionType>(null)

  const renewalAsSub = (r: typeof renewals[0]): FullSubscription => ({
    id: r.id, user_id: r.user_id, user_name: r.user_name,
    plan_id: '', plan_name: r.plan_name, plan_tier: r.plan_tier,
    price_monthly_usd: 0, status: r.status, provider: '',
    provider_sub_id: null, current_period_start: null,
    current_period_end: r.current_period_end,
    cancel_at_period_end: r.cancel_at_period_end,
    trial_start: null, trial_end: null,
    cancelled_at: null, paused_at: null,
    created_at: '', updated_at: null,
  })

  return (
    <div className="space-y-4 pt-5">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Show renewals in next</span>
        {[7, 14, 30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
            {d}d
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> :
        renewals.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">No renewals in the next {days} days</p> : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Renews on</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Note</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {renewals.map((r) => {
                  const daysLeft = Math.ceil((new Date(r.current_period_end).getTime() - Date.now()) / 86400_000)
                  return (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">{r.user_name ?? <span className="italic text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={r.plan_tier === 'free' ? 'outline' : 'info'}>{r.plan_name}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{formatDate(r.current_period_end)}</div>
                        <div className={`text-xs ${daysLeft <= 3 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {daysLeft <= 0 ? 'Today' : `in ${daysLeft}d`}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {r.cancel_at_period_end
                          ? <Badge variant="warning">Will cancel</Badge>
                          : <Badge variant="success">Will renew</Badge>}
                      </td>
                      <td className="px-4 py-2.5">
                        <PermissionGate permission="subscriptions.edit">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setActionTarget(renewalAsSub(r)); setCurrentAction('renew') }}
                              title="Manual renewal" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => { setActionTarget(renewalAsSub(r)); setCurrentAction('free_months') }}
                              title="Grant free month" className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                              <Gift className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </PermissionGate>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      <ActionModal sub={actionTarget} action={currentAction} plans={plans}
        onClose={() => { setActionTarget(null); setCurrentAction(null) }} />
    </div>
  )
}

// ── Revenue tab ───────────────────────────────────────────────────────────────

function RevenueTab() {
  const { data: revenue = [], isLoading } = useQuery({
    queryKey: ['sub-revenue'],
    queryFn: () => fetchRevenueSummary(12),
  })

  const totalGross = revenue.reduce((s, r) => s + r.gross, 0)
  const totalNet = revenue.reduce((s, r) => s + r.net, 0)
  const totalFee = revenue.reduce((s, r) => s + r.fee, 0)

  return (
    <div className="space-y-5 pt-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total gross (12mo)', value: formatCurrency(totalGross) },
          { label: 'Total net (12mo)', value: formatCurrency(totalNet) },
          { label: 'Total fees (12mo)', value: formatCurrency(totalFee) },
          { label: 'Transactions', value: revenue.reduce((s, r) => s + r.count, 0).toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Monthly Revenue Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenue} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }}
                  formatter={(v: number, name: string) => [formatCurrency(v), name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="gross" name="Gross" fill="hsl(84 81% 44%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="net" name="Net" fill="hsl(217 91% 60%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="fee" name="Fees" fill="hsl(0 72% 50%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Revenue table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Month</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Transactions</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Fees</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...revenue].reverse().map((r) => (
              <tr key={r.month} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium">{r.month_label}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{r.count}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{formatCurrency(r.gross)}</td>
                <td className="px-4 py-2.5 text-right text-red-400 tabular-nums">{formatCurrency(r.fee)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-400 font-medium tabular-nums">{formatCurrency(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Payment history tab ───────────────────────────────────────────────────────

function PaymentHistoryTab() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['sub-payments', page, statusFilter],
    queryFn: async () => {
      const from = page * PAGE_SIZE; const to = from + PAGE_SIZE - 1
      let q = supabase.from('payments')
        .select('id, user_id, amount_usd, fee_usd, net_usd, status, provider, created_at', { count: 'exact' })
        .order('created_at', { ascending: false }).range(from, to)
      if (statusFilter) q = q.eq('status', statusFilter)
      const { data: pays, error, count } = await q
      if (error) throw error
      const userIds = [...new Set((pays ?? []).map((p) => p.user_id))]
      const userMap: Record<string, string> = {}
      if (userIds.length) {
        const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
        for (const u of users ?? []) userMap[u.id] = u.name
      }
      return { data: (pays ?? []).map((p) => ({ ...p, user_name: userMap[p.user_id] ?? null })), total: count ?? 0 }
    },
    placeholderData: (p) => p,
  })

  const PAY_BADGE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'outline'> = {
    succeeded: 'success', failed: 'danger', pending: 'warning', refunded: 'info', disputed: 'danger',
  }

  return (
    <div className="space-y-4 pt-5">
      <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <option value="">All statuses</option>
        {['succeeded', 'pending', 'failed', 'refunded', 'disputed'].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      {isLoading ? <div className="flex justify-center py-12"><Spinner /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Net</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium truncate max-w-[130px]">{p.user_name ?? <span className="italic text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatCurrency(Number(p.amount_usd))}</td>
                    <td className="px-4 py-2.5"><Badge variant={PAY_BADGE[p.status] ?? 'outline'}>{p.status}</Badge></td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{p.provider}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">{p.net_usd ? formatCurrency(Number(p.net_usd)) : '—'}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ── Overview stats tab ────────────────────────────────────────────────────────

function OverviewTab({ plans }: { plans: SubscriptionPlan[] }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['sub-stats'],
    queryFn: fetchSubscriptionStats,
  })
  const { data: revenue = [] } = useQuery({
    queryKey: ['sub-revenue'],
    queryFn: () => fetchRevenueSummary(6),
  })

  const planDistData = plans.map((p) => ({ name: p.name, value: 0 })) // placeholder — real data from stats

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>

  return (
    <div className="space-y-5 pt-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Active', value: stats?.active ?? 0, color: 'text-emerald-400' },
          { label: 'Trialing', value: stats?.trialing ?? 0, color: 'text-blue-400' },
          { label: 'Paused', value: stats?.paused ?? 0, color: 'text-slate-400' },
          { label: 'Past due', value: stats?.past_due ?? 0, color: 'text-amber-400' },
          { label: 'Cancelled', value: stats?.cancelled ?? 0, color: 'text-orange-400' },
          { label: 'Expired', value: stats?.expired ?? 0, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />Revenue trend — last 6 months</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={revenue} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }}
                formatter={(v: number) => [formatCurrency(v), 'Net revenue']} />
              <Line type="monotone" dataKey="net" stroke="hsl(84 81% 44%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview',     icon: CreditCard },
  { id: 'plans',     label: 'Plans',        icon: DollarSign },
  { id: 'active',    label: 'Active',       icon: Play },
  { id: 'trials',    label: 'Trials',       icon: Clock },
  { id: 'expired',   label: 'Expired',      icon: AlertCircle },
  { id: 'renewals',  label: 'Renewals',     icon: CalendarDays },
  { id: 'revenue',   label: 'Revenue',      icon: DollarSign },
  { id: 'payments',  label: 'Payments',     icon: CreditCard },
]

export function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const { data: plans = [], isLoading: plansLoading, refetch } = useQuery({
    queryKey: ['all-plans'],
    queryFn: fetchAllPlans,
  })

  return (
    <PageShell
      title="Subscriptions"
      description="Full subscription lifecycle management with provider integration hooks."
      icon={CreditCard}
      actions={
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={plansLoading} onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <TabPanel id="overview"  active={activeTab}><OverviewTab plans={plans} /></TabPanel>
      <TabPanel id="plans"     active={activeTab}><PlansTab plans={plans} onRefresh={refetch} /></TabPanel>
      <TabPanel id="active"    active={activeTab}><SubTable queryKey="sub-active"   statuses={['active']}   plans={plans} /></TabPanel>
      <TabPanel id="trials"    active={activeTab}><SubTable queryKey="sub-trialing" statuses={['trialing']} plans={plans} /></TabPanel>
      <TabPanel id="expired"   active={activeTab}><SubTable queryKey="sub-expired"  statuses={['expired', 'cancelled', 'past_due']} plans={plans} /></TabPanel>
      <TabPanel id="renewals"  active={activeTab}><RenewalsTab plans={plans} /></TabPanel>
      <TabPanel id="revenue"   active={activeTab}><RevenueTab /></TabPanel>
      <TabPanel id="payments"  active={activeTab}><PaymentHistoryTab /></TabPanel>
    </PageShell>
  )
}
