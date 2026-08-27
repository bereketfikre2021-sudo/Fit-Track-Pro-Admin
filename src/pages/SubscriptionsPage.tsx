/**
 * SubscriptionsPage.tsx — Subscription Management
 * Tabs: Plans | Active | Trials | Expired | Renewals | Payments
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CreditCard, RefreshCw, ArrowUp, ArrowDown, Ban, Pause, Play,
  Gift, RotateCcw, CalendarDays, DollarSign, Clock, AlertCircle,
  Sparkles, Zap, Shield, Users as UsersIcon, CheckCircle2,
  Star, Infinity,
} from 'lucide-react'
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
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGate } from '@/components/guards/PermissionGate'
import {
  fetchAllPlans, fetchSubscriptionsByStatus,
  fetchUpcomingRenewals,
  upgradeSubscription, downgradeSubscription, cancelSubscription,
  pauseSubscription, resumeSubscription, grantFreeMonths, manualRenewal,
  type FullSubscription, type SubscriptionPlan,
} from '@/lib/subscriptions.queries'

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

const TIER_CONFIG: Record<string, {
  gradient: string
  border: string
  iconBg: string
  iconColor: string
  priceCls: string
  btnCls: string
  icon: React.ElementType
  tagline: string
  popular?: boolean
}> = {
  free: {
    gradient:  'bg-gradient-to-br from-slate-900/60 via-card to-card',
    border:    'border-slate-700/50',
    iconBg:    'bg-slate-700/30',
    iconColor: 'text-slate-400',
    priceCls:  'text-slate-300',
    btnCls:    'bg-slate-700 hover:bg-slate-600 text-white',
    icon:      Zap,
    tagline:   'Get started for free',
  },
  pro: {
    gradient:  'bg-gradient-to-br from-primary/20 via-primary/5 to-card',
    border:    'border-primary/60',
    iconBg:    'bg-primary/20',
    iconColor: 'text-primary',
    priceCls:  'text-primary',
    btnCls:    'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20',
    icon:      Sparkles,
    tagline:   'For dedicated athletes',
    popular:   true,
  },
  elite: {
    gradient:  'bg-gradient-to-br from-violet-900/40 via-violet-950/20 to-card',
    border:    'border-violet-500/50',
    iconBg:    'bg-violet-500/20',
    iconColor: 'text-violet-400',
    priceCls:  'text-violet-400',
    btnCls:    'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20',
    icon:      Shield,
    tagline:   'For serious performers',
  },
  team: {
    gradient:  'bg-gradient-to-br from-amber-900/40 via-amber-950/20 to-card',
    border:    'border-amber-500/50',
    iconBg:    'bg-amber-500/20',
    iconColor: 'text-amber-400',
    priceCls:  'text-amber-400',
    btnCls:    'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20',
    icon:      UsersIcon,
    tagline:   'For teams & studios',
  },
}

function PlansTab({ plans, onRefresh }: { plans: SubscriptionPlan[]; onRefresh: () => void }) {
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState<SubscriptionPlan | null>(null)
  const [saving, setSaving] = useState(false)

  // Duration pricing state — keyed by duration string
  const [durationPrices, setDurationPrices] = useState<Record<string, { price_etb: string; discount_pct: string; id?: string }>>({})
  const [durationPricesLoading, setDurationPricesLoading] = useState(false)

  const DURATIONS = [
    { duration: '1_month',   months: 1,  label: '1 Month' },
    { duration: '3_months',  months: 3,  label: '3 Months' },
    { duration: '6_months',  months: 6,  label: '6 Months' },
    { duration: '12_months', months: 12, label: '12 Months (1 Year)' },
  ]

  const fmtEtb = (n: number) => `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 0 })}`

  // Load existing duration prices when edit modal opens
  const openEdit = async (plan: SubscriptionPlan) => {
    setEditTarget({ ...plan })
    setDurationPricesLoading(true)
    setDurationPrices({})
    try {
      const { data } = await supabase
        .from('subscription_purchase_options')
        .select('id, duration, duration_months, price_etb, discount_pct')
        .eq('plan_id', plan.id)
        .order('display_order')

      const priceMap: Record<string, { price_etb: string; discount_pct: string; id?: string }> = {}

      // Pre-fill from DB rows
      for (const row of data ?? []) {
        priceMap[row.duration] = {
          id:           row.id,
          price_etb:    String(row.price_etb ?? ''),
          discount_pct: String(row.discount_pct ?? '0'),
        }
      }

      // Fill in missing durations with calculated defaults (monthly × months × discount)
      const monthly = Number(plan.price_monthly_usd)
      for (const d of DURATIONS) {
        if (!priceMap[d.duration]) {
          const discountMap: Record<string, number> = {
            '1_month': 0, '3_months': 5, '6_months': 10, '12_months': 15
          }
          const disc = discountMap[d.duration] ?? 0
          priceMap[d.duration] = {
            price_etb:    String(Math.round(monthly * d.months * (1 - disc / 100) * 100) / 100),
            discount_pct: String(disc),
          }
        }
      }
      setDurationPrices(priceMap)
    } catch {
      // If table doesn't exist yet, still open modal with calculated defaults
      const monthly = Number(plan.price_monthly_usd)
      const defaults: Record<string, { price_etb: string; discount_pct: string }> = {
        '1_month':   { price_etb: String(monthly),       discount_pct: '0' },
        '3_months':  { price_etb: String(Math.round(monthly * 3 * 0.95 * 100)/100), discount_pct: '5' },
        '6_months':  { price_etb: String(Math.round(monthly * 6 * 0.90 * 100)/100), discount_pct: '10' },
        '12_months': { price_etb: String(Math.round(monthly * 12 * 0.85 * 100)/100), discount_pct: '15' },
      }
      setDurationPrices(defaults)
    } finally {
      setDurationPricesLoading(false)
    }
  }

  const save = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      // 1. Update base plan
      const { error: planErr } = await supabase.from('subscription_plans').update({
        price_monthly_usd: editTarget.price_monthly_usd,
        price_yearly_usd:  editTarget.price_yearly_usd,
        max_ai_calls_day:  editTarget.max_ai_calls_day,
        max_devices:       editTarget.max_devices,
        is_active:         editTarget.is_active,
        updated_at:        new Date().toISOString(),
      }).eq('id', editTarget.id)
      if (planErr) throw planErr

      // 2. Upsert duration pricing into subscription_purchase_options
      //    (table may not exist if migration hasn't run — skip gracefully)
      try {
        const discountOrder: Record<string, number> = {
          '1_month': 1, '3_months': 2, '6_months': 3, '12_months': 4
        }
        const monthsMap: Record<string, number> = {
          '1_month': 1, '3_months': 3, '6_months': 6, '12_months': 12
        }

        for (const d of DURATIONS) {
          const entry = durationPrices[d.duration]
          if (!entry) continue
          const priceVal = parseFloat(entry.price_etb)
          const discVal  = parseInt(entry.discount_pct) || 0
          if (isNaN(priceVal) || priceVal < 0) continue

          const upsertRow = {
            plan_id:        editTarget.id,
            duration:       d.duration,
            duration_months: monthsMap[d.duration],
            price_etb:      priceVal,
            discount_pct:   discVal,
            currency:       'ETB',
            is_active:      true,
            display_order:  discountOrder[d.duration] ?? 1,
            updated_at:     new Date().toISOString(),
          }

          // If we have an existing id, include it for upsert
          if (entry.id) {
            await supabase.from('subscription_purchase_options')
              .upsert({ id: entry.id, ...upsertRow }, { onConflict: 'id' })
          } else {
            await supabase.from('subscription_purchase_options')
              .upsert(upsertRow, { onConflict: 'plan_id,duration' })
          }
        }
      } catch {
        // Table may not exist yet — base plan was still saved
        console.warn('subscription_purchase_options not available yet')
      }

      toast.success('Plan and pricing updated')
      qc.invalidateQueries({ queryKey: ['all-plans'] })
      qc.invalidateQueries({ queryKey: ['purchase-options-admin'] })
      setEditTarget(null)
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 pt-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const cfg = TIER_CONFIG[plan.tier] ?? TIER_CONFIG.free
          const Icon = cfg.icon

          // Feature list
          const features = [
            `${plan.max_ai_calls_day} AI coaching calls/day`,
            `${plan.max_devices === 1 ? '1 device' : `Up to ${plan.max_devices} devices`}`,
            ...(plan.features as Record<string, boolean>)?.export  ? ['PDF & JSON export'] : [],
            ...(plan.features as Record<string, boolean>)?.ads === false ? ['Ad-free experience'] : [],
            ...(plan.features as Record<string, boolean>)?.priority_support ? ['Priority support'] : [],
            ...(plan.features as Record<string, boolean>)?.team ? ['Team management'] : [],
          ]

          return (
            <div key={plan.id} className="relative flex flex-col">
              {/* Popular badge */}
              {cfg.popular && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center z-10">
                  <span className="flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full shadow-md shadow-primary/30">
                    <Star className="h-2.5 w-2.5 fill-current" /> MOST POPULAR
                  </span>
                </div>
              )}

              <div className={`relative flex flex-col flex-1 rounded-2xl border-2 overflow-hidden ${cfg.border} ${cfg.gradient} ${cfg.popular ? 'mt-3.5 shadow-xl shadow-primary/10' : 'shadow-md'}`}>

                {/* Inactive overlay */}
                {!plan.is_active && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10 rounded-2xl">
                    <Badge variant="outline" className="text-xs">Inactive</Badge>
                  </div>
                )}

                {/* Card body */}
                <div className="p-5 flex flex-col flex-1 space-y-4">

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
                      <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
                    </div>
                    <Badge variant={plan.is_active ? 'success' : 'outline'} className="text-[10px]">
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {/* Plan name + tagline */}
                  <div>
                    <p className="font-bold text-base leading-tight">{plan.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{cfg.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-1 pb-1 border-b border-border/40">
                    {plan.price_monthly_usd === 0 ? (
                      <span className={`text-2xl font-black ${cfg.priceCls}`}>Free</span>
                    ) : (
                      <>
                        <span className={`text-2xl font-black tabular-nums leading-none ${cfg.priceCls}`}>
                          {fmtEtb(plan.price_monthly_usd)}
                        </span>
                        <span className="text-[11px] text-muted-foreground mb-0.5">/mo</span>
                      </>
                    )}
                  </div>

                  {/* Feature checklist */}
                  <ul className="space-y-2 flex-1">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cfg.iconColor}`} />
                        <span className="text-foreground/75">{f}</span>
                      </li>
                    ))}
                    {plan.price_monthly_usd === 0 && (
                      <li className="flex items-start gap-2 text-xs">
                        <Infinity className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span className="text-foreground/75">Forever free</span>
                      </li>
                    )}
                  </ul>

                  {/* Edit button */}
                  <PermissionGate permission="settings.edit">
                    <button
                      onClick={() => openEdit(plan)}
                      className={`w-full h-9 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${cfg.btnCls}`}
                    >
                      Edit Plan
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.name} Plan`} size="sm">
        {editTarget && (
          <div className="space-y-5">

            {/* Base plan settings */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan Settings</p>
              <Input label="Base monthly price (ETB)" type="number" min="0" value={editTarget.price_monthly_usd}
                onChange={(e) => setEditTarget({ ...editTarget, price_monthly_usd: parseFloat(e.target.value) || 0 })} />
              <Input label="AI calls per day" type="number" min="0" value={editTarget.max_ai_calls_day}
                onChange={(e) => setEditTarget({ ...editTarget, max_ai_calls_day: parseInt(e.target.value) || 0 })} />
              <Input label="Max devices" type="number" min="1" value={editTarget.max_devices}
                onChange={(e) => setEditTarget({ ...editTarget, max_devices: parseInt(e.target.value) || 1 })} />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editTarget.is_active}
                  onChange={(e) => setEditTarget({ ...editTarget, is_active: e.target.checked })} />
                Plan is active (visible to users)
              </label>
            </div>

            {/* Duration pricing */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Duration Pricing
                <span className="ml-1 font-normal normal-case text-muted-foreground/60">— shown to users as billing options</span>
              </p>

              {durationPricesLoading ? (
                <div className="space-y-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />)}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Duration</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Total Price (ETB)</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Discount %</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Per Month</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {DURATIONS.map(d => {
                        const entry = durationPrices[d.duration] ?? { price_etb: '', discount_pct: '0' }
                        const priceNum = parseFloat(entry.price_etb) || 0
                        const perMonth = d.months > 0 ? Math.round((priceNum / d.months) * 100) / 100 : priceNum
                        return (
                          <tr key={d.duration} className="hover:bg-muted/10">
                            <td className="px-3 py-2.5 font-medium text-xs whitespace-nowrap">{d.label}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={entry.price_etb}
                                onChange={e => setDurationPrices(prev => ({
                                  ...prev,
                                  [d.duration]: { ...prev[d.duration], price_etb: e.target.value }
                                }))}
                                className="w-28 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  step="1"
                                  value={entry.discount_pct}
                                  onChange={e => setDurationPrices(prev => ({
                                    ...prev,
                                    [d.duration]: { ...prev[d.duration], discount_pct: e.target.value }
                                  }))}
                                  className="w-16 h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
                                />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-xs text-muted-foreground tabular-nums">
                              {priceNum > 0 ? `ETB ${perMonth.toLocaleString('en-ET', { minimumFractionDigits: 2 })}` : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                These prices are shown to users in the app. The discount % is purely informational (displayed as a badge).
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} loading={saving}>Save Changes</Button>
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

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'plans',    label: 'Plans',    icon: DollarSign },
  { id: 'active',   label: 'Active',   icon: Play },
  { id: 'trials',   label: 'Trials',   icon: Clock },
  { id: 'expired',  label: 'Expired',  icon: AlertCircle },
  { id: 'renewals', label: 'Renewals', icon: CalendarDays },
]

export function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('plans')

  const { data: plans = [], isLoading: plansLoading, refetch } = useQuery({
    queryKey: ['all-plans'],
    queryFn: fetchAllPlans,
  })

  return (
    <PageShell
      title="Subscriptions"
      description="Manage plans, active subscriptions, and renewals."
      icon={CreditCard}
      actions={
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={plansLoading} onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <TabPanel id="plans"    active={activeTab}><PlansTab plans={plans} onRefresh={refetch} /></TabPanel>
      <TabPanel id="active"   active={activeTab}><SubTable queryKey="sub-active"   statuses={['active']}   plans={plans} /></TabPanel>
      <TabPanel id="trials"   active={activeTab}><SubTable queryKey="sub-trialing" statuses={['trialing']} plans={plans} /></TabPanel>
      <TabPanel id="expired"  active={activeTab}><SubTable queryKey="sub-expired"  statuses={['expired', 'cancelled', 'past_due']} plans={plans} /></TabPanel>
      <TabPanel id="renewals" active={activeTab}><RenewalsTab plans={plans} /></TabPanel>
    </PageShell>
  )
}
