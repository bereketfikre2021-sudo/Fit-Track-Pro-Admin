/**
 * subscriptions.queries.ts
 *
 * All data fetchers and mutation helpers for the Subscription Management module.
 * No schema changes — uses existing tables only.
 *
 * Provider integration hooks are defined at the bottom of this file.
 * Each hook is a stub that can be wired to Stripe / Chapa / Telebirr
 * without touching the rest of the codebase.
 */

import { supabase } from './supabase'

// ── Shared types ───────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string
  name: string
  tier: string
  price_monthly_usd: number
  price_yearly_usd: number
  max_ai_calls_day: number
  max_devices: number
  features: Record<string, unknown>
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FullSubscription {
  id: string
  user_id: string
  user_name: string | null
  plan_id: string
  plan_name: string
  plan_tier: string
  price_monthly_usd: number
  status: string
  provider: string
  provider_sub_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_start: string | null
  trial_end: string | null
  cancelled_at: string | null
  paused_at: string | null
  created_at: string
  updated_at: string | null
}

export interface RevenuePoint {
  month: string       // 'YYYY-MM'
  month_label: string // 'Jan 25'
  gross: number
  net: number
  fee: number
  count: number
}

export interface RenewalItem {
  id: string
  user_id: string
  user_name: string | null
  plan_name: string
  plan_tier: string
  current_period_end: string
  cancel_at_period_end: boolean
  status: string
}

export interface SubscriptionEvent {
  id: string
  subscription_id: string
  user_id: string
  event_type: string
  old_plan_id: string | null
  new_plan_id: string | null
  triggered_by: string
  created_at: string
  old_plan_name?: string | null
  new_plan_name?: string | null
}

// ── Subscription Plans ────────────────────────────────────────────────────────

export async function fetchAllPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly_usd', { ascending: true })
  if (error) throw error
  return (data ?? []).map((p) => ({
    ...p,
    price_monthly_usd: Number(p.price_monthly_usd),
    price_yearly_usd: Number(p.price_yearly_usd),
    features: p.features as Record<string, unknown>,
  })) as SubscriptionPlan[]
}

export async function updatePlan(
  planId: string,
  updates: Partial<Pick<SubscriptionPlan, 'name' | 'price_monthly_usd' | 'price_yearly_usd' | 'max_ai_calls_day' | 'max_devices' | 'features' | 'is_active'>>,
): Promise<void> {
  const { error } = await supabase
    .from('subscription_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', planId)
  if (error) throw error
}

// ── Subscriber lists ──────────────────────────────────────────────────────────

export async function fetchSubscriptionsByStatus(
  status: string | string[],
  page: number,
  pageSize: number,
): Promise<{ data: FullSubscription[]; total: number }> {
  const from = page * pageSize
  const to = from + pageSize - 1

  const statuses = Array.isArray(status) ? status : [status]

  const { data: subs, error, count } = await supabase
    .from('user_subscriptions')
    .select(
      'id, user_id, plan_id, status, provider, provider_sub_id, current_period_start, current_period_end, cancel_at_period_end, trial_start, trial_end, cancelled_at, paused_at, created_at, updated_at',
      { count: 'exact' },
    )
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error
  if (!subs?.length) return { data: [], total: count ?? 0 }

  // Resolve plans + users in parallel
  const planIds = [...new Set(subs.map((s) => s.plan_id))]
  const userIds = [...new Set(subs.map((s) => s.user_id))]

  const [planRes, userRes] = await Promise.all([
    supabase.from('subscription_plans').select('id, name, tier, price_monthly_usd').in('id', planIds),
    supabase.from('users').select('id, name').in('id', userIds),
  ])

  const planMap: Record<string, { name: string; tier: string; price_monthly_usd: number }> = {}
  for (const p of planRes.data ?? []) {
    planMap[p.id] = { name: p.name, tier: p.tier, price_monthly_usd: Number(p.price_monthly_usd) }
  }

  const userMap: Record<string, string | null> = {}
  for (const u of userRes.data ?? []) userMap[u.id] = u.name

  return {
    data: subs.map((s) => ({
      ...s,
      user_name: userMap[s.user_id] ?? null,
      plan_name: planMap[s.plan_id]?.name ?? '—',
      plan_tier: planMap[s.plan_id]?.tier ?? 'free',
      price_monthly_usd: planMap[s.plan_id]?.price_monthly_usd ?? 0,
    })) as FullSubscription[],
    total: count ?? 0,
  }
}

// ── Stats overview ────────────────────────────────────────────────────────────

export async function fetchSubscriptionStats() {
  // Single query — group by status to get all counts in one round-trip
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('status')
    .limit(100000)

  if (error) throw error

  const counts: Record<string, number> = {
    active: 0, trialing: 0, expired: 0, cancelled: 0, paused: 0, past_due: 0,
  }
  for (const row of data ?? []) {
    const s = row.status as string
    if (s in counts) counts[s]++
  }
  return counts
}

// ── Renewal calendar ──────────────────────────────────────────────────────────

/** Subscriptions renewing in the next N days */
export async function fetchUpcomingRenewals(days = 30): Promise<RenewalItem[]> {
  const now = new Date().toISOString()
  const future = new Date(Date.now() + days * 86400_000).toISOString()

  const { data: subs, error } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan_id, status, current_period_end, cancel_at_period_end')
    .in('status', ['active', 'trialing'])
    .gte('current_period_end', now)
    .lte('current_period_end', future)
    .order('current_period_end', { ascending: true })
    .limit(500)
  if (error) throw error

  if (!subs?.length) return []

  const planIds = [...new Set(subs.map((s) => s.plan_id))]
  const userIds = [...new Set(subs.map((s) => s.user_id))]

  const [planRes, userRes] = await Promise.all([
    supabase.from('subscription_plans').select('id, name, tier').in('id', planIds),
    supabase.from('users').select('id, name').in('id', userIds),
  ])

  const planMap: Record<string, { name: string; tier: string }> = {}
  for (const p of planRes.data ?? []) planMap[p.id] = p
  const userMap: Record<string, string | null> = {}
  for (const u of userRes.data ?? []) userMap[u.id] = u.name

  return subs.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    user_name: userMap[s.user_id] ?? null,
    plan_name: planMap[s.plan_id]?.name ?? '—',
    plan_tier: planMap[s.plan_id]?.tier ?? 'free',
    current_period_end: s.current_period_end,
    cancel_at_period_end: s.cancel_at_period_end,
    status: s.status,
  }))
}

// ── Revenue summary ────────────────────────────────────────────────────────────

export async function fetchRevenueSummary(months = 12): Promise<RevenuePoint[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - (months - 1))
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('payments')
    .select('amount_usd, fee_usd, net_usd, status, created_at')
    .eq('status', 'succeeded')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(100000)
  if (error) throw error

  const monthly: Record<string, { gross: number; net: number; fee: number; count: number }> = {}

  for (const p of data ?? []) {
    const d = new Date(p.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthly[key]) monthly[key] = { gross: 0, net: 0, fee: 0, count: 0 }
    monthly[key].gross += Number(p.amount_usd) || 0
    monthly[key].net += Number(p.net_usd) || 0
    monthly[key].fee += Number(p.fee_usd) || 0
    monthly[key].count++
  }

  return Array.from({ length: months }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (months - 1 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    return { month: key, month_label: label, ...(monthly[key] ?? { gross: 0, net: 0, fee: 0, count: 0 }) }
  })
}

// ── Subscription timeline / events ────────────────────────────────────────────

export async function fetchSubscriptionEvents(
  subscriptionId: string,
): Promise<SubscriptionEvent[]> {
  const { data, error } = await supabase
    .from('subscription_events')
    .select('id, subscription_id, user_id, event_type, old_plan_id, new_plan_id, triggered_by, created_at')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const planIds = [
    ...new Set([
      ...(data ?? []).map((e) => e.old_plan_id).filter(Boolean),
      ...(data ?? []).map((e) => e.new_plan_id).filter(Boolean),
    ]),
  ] as string[]

  const planMap: Record<string, string> = {}
  if (planIds.length) {
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id, name')
      .in('id', planIds)
    for (const p of plans ?? []) planMap[p.id] = p.name
  }

  return (data ?? []).map((e) => ({
    ...e,
    old_plan_name: e.old_plan_id ? planMap[e.old_plan_id] ?? null : null,
    new_plan_name: e.new_plan_id ? planMap[e.new_plan_id] ?? null : null,
  }))
}

// ── Mutation helpers ──────────────────────────────────────────────────────────

export async function upgradeSubscription(
  subscriptionId: string,
  newPlanId: string,
  adminId: string,
): Promise<void> {
  const { data: sub, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('plan_id, user_id')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ plan_id: newPlanId, status: 'active', cancel_at_period_end: false, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  if (error) throw error

  // Record lifecycle event
  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: sub.user_id,
    event_type: 'upgraded',
    old_plan_id: sub.plan_id,
    new_plan_id: newPlanId,
    triggered_by: 'admin',
    metadata: { admin_id: adminId },
  })

  // Fire provider hook (no-op if not configured)
  await providerHook('onUpgrade', { subscriptionId, oldPlanId: sub.plan_id, newPlanId, adminId })
}

export async function downgradeSubscription(
  subscriptionId: string,
  newPlanId: string,
  adminId: string,
): Promise<void> {
  const { data: sub, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('plan_id, user_id')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ plan_id: newPlanId, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  if (error) throw error

  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: sub.user_id,
    event_type: 'downgraded',
    old_plan_id: sub.plan_id,
    new_plan_id: newPlanId,
    triggered_by: 'admin',
  })

  await providerHook('onDowngrade', { subscriptionId, oldPlanId: sub.plan_id, newPlanId, adminId })
}

export async function cancelSubscription(
  subscriptionId: string,
  immediate: boolean,
  adminId: string,
): Promise<void> {
  const { data: sub, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_id')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const updates = immediate
    ? { status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    : { cancel_at_period_end: true, updated_at: new Date().toISOString() }

  const { error } = await supabase.from('user_subscriptions').update(updates).eq('id', subscriptionId)
  if (error) throw error

  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: sub.user_id,
    event_type: 'cancelled',
    old_plan_id: sub.plan_id,
    new_plan_id: null,
    triggered_by: 'admin',
    metadata: { immediate, admin_id: adminId },
  })

  await providerHook('onCancel', { subscriptionId, immediate, adminId })
}

export async function pauseSubscription(subscriptionId: string, adminId: string): Promise<void> {
  const { data: sub, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_id')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'paused', paused_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  if (error) throw error

  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: sub.user_id,
    event_type: 'paused',
    old_plan_id: sub.plan_id,
    new_plan_id: sub.plan_id,
    triggered_by: 'admin',
    metadata: { admin_id: adminId },
  })

  await providerHook('onPause', { subscriptionId, adminId })
}

export async function resumeSubscription(subscriptionId: string, adminId: string): Promise<void> {
  const { data: sub, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('user_id, plan_id')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status: 'active', paused_at: null, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  if (error) throw error

  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: sub.user_id,
    event_type: 'resumed',
    old_plan_id: sub.plan_id,
    new_plan_id: sub.plan_id,
    triggered_by: 'admin',
    metadata: { admin_id: adminId },
  })

  await providerHook('onResume', { subscriptionId, adminId })
}

export async function grantFreeMonths(
  subscriptionId: string,
  months: number,
  adminId: string,
): Promise<void> {
  const { data: sub, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('current_period_end, user_id, plan_id')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const end = sub?.current_period_end ? new Date(sub.current_period_end) : new Date()
  end.setMonth(end.getMonth() + months)

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      cancel_at_period_end: false,
      current_period_end: end.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
  if (error) throw error

  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: sub.user_id,
    event_type: 'renewed',
    old_plan_id: sub.plan_id,
    new_plan_id: sub.plan_id,
    triggered_by: 'admin',
    metadata: { free_months: months, admin_id: adminId },
  })

  await providerHook('onGrantFreeMonths', { subscriptionId, months, adminId })
}

export async function manualRenewal(
  subscriptionId: string,
  adminId: string,
): Promise<void> {
  const { data: sub, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('current_period_end, user_id, plan_id')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const end = sub?.current_period_end ? new Date(sub.current_period_end) : new Date()
  end.setMonth(end.getMonth() + 1)

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: end.toISOString(),
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
  if (error) throw error

  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    user_id: sub.user_id,
    event_type: 'renewed',
    old_plan_id: sub.plan_id,
    new_plan_id: sub.plan_id,
    triggered_by: 'admin',
    metadata: { manual: true, admin_id: adminId },
  })

  await providerHook('onManualRenewal', { subscriptionId, adminId })
}

// ── Provider integration hooks ─────────────────────────────────────────────────
//
// These are NO-OP stubs. Wire them to your payment provider SDKs
// without touching the business logic above.
//
// How to implement:
//   1. Register handlers in PROVIDER_HOOKS below
//   2. Each handler receives context (subscriptionId, planId, adminId, etc.)
//   3. Call your provider SDK (Stripe, Chapa, Telebirr) from the handler
//   4. On success, the DB is already updated — just sync the provider state
//
// Example Stripe integration:
//   PROVIDER_HOOKS.onCancel = async ({ subscriptionId }) => {
//     const sub = await stripe.subscriptions.cancel(stripeSubId)
//   }
//
// ──────────────────────────────────────────────────────────────────────────────

export type ProviderHookEvent =
  | 'onUpgrade'
  | 'onDowngrade'
  | 'onCancel'
  | 'onPause'
  | 'onResume'
  | 'onGrantFreeMonths'
  | 'onManualRenewal'

export type ProviderHookPayload = Record<string, unknown>
export type ProviderHookFn = (payload: ProviderHookPayload) => Promise<void>

/**
 * Register your provider hooks here.
 * Keys match ProviderHookEvent values.
 * Leave empty to run admin-only (no provider sync).
 */
const PROVIDER_HOOKS: Partial<Record<ProviderHookEvent, ProviderHookFn>> = {
  // ── Stripe ──────────────────────────────────────────────────────────────────
  // onUpgrade: stripeHooks.onUpgrade,
  // onDowngrade: stripeHooks.onDowngrade,
  // onCancel: stripeHooks.onCancel,

  // ── Chapa ────────────────────────────────────────────────────────────────────
  // onManualRenewal: chapaHooks.onManualRenewal,

  // ── Telebirr ─────────────────────────────────────────────────────────────────
  // onManualRenewal: telebirrHooks.onManualRenewal,
}

/**
 * Internal dispatcher — calls the registered hook if one exists.
 * Failures are logged as warnings and never bubble up to the UI.
 */
async function providerHook(event: ProviderHookEvent, payload: ProviderHookPayload): Promise<void> {
  const fn = PROVIDER_HOOKS[event]
  if (!fn) return
  try {
    await fn(payload)
  } catch (err) {
    console.warn(`[ProviderHook] ${event} failed:`, (err as Error).message)
    // Don't throw — DB is already updated, provider sync is best-effort
  }
}

// ── Provider hook factory helpers ─────────────────────────────────────────────
//
// Use these to build provider-specific hook modules.
// Import and register in PROVIDER_HOOKS above.

export function createProviderHooks(config: {
  name: string
  onUpgrade?: ProviderHookFn
  onDowngrade?: ProviderHookFn
  onCancel?: ProviderHookFn
  onPause?: ProviderHookFn
  onResume?: ProviderHookFn
  onGrantFreeMonths?: ProviderHookFn
  onManualRenewal?: ProviderHookFn
}): Partial<Record<ProviderHookEvent, ProviderHookFn>> {
  return {
    onUpgrade: config.onUpgrade,
    onDowngrade: config.onDowngrade,
    onCancel: config.onCancel,
    onPause: config.onPause,
    onResume: config.onResume,
    onGrantFreeMonths: config.onGrantFreeMonths,
    onManualRenewal: config.onManualRenewal,
  }
}
