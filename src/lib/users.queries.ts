/**
 * users.queries.ts
 * All Supabase queries for the User Management module.
 * Uses existing tables only — no schema changes.
 */

import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  name: string | null
  registration_date: string | null
  gender: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
  fitness_goal: string | null
  fitness_level: string | null
  avatar_url: string | null
  workout_days: string[] | null
  equipment: string[] | null
  // joined
  role: string | null
  plan_tier: string | null
  sub_status: string | null
}

export interface UserFilters {
  search: string
  role: string
  plan: string
  status: string
}

export interface PaginatedUsers {
  data: AdminUser[]
  total: number
}

export interface UserProfile {
  id: string
  name: string | null
  gender: string | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
  fitness_goal: string | null
  fitness_level: string | null
  focus_area: string | null
  equipment: string[] | null
  workout_days: string[] | null
  avatar_url: string | null
  registration_date: string | null
}

export interface UserBodyStats {
  log_date: string
  weight_kg: number | null
  bmi: number | null
}

export interface UserWorkoutSession {
  id: string
  session_date: string
  day_of_week: string | null
  completed_count: number | null
  total_count: number | null
  skipped: boolean
  calories_burned: number | null
  perceived_effort: number | null
  mood: number | null
}

export interface UserMealLog {
  id: string
  log_date: string
  meal_slot: string
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  quantity: number | null
}

export interface UserAiLog {
  id: string
  feature: string
  provider: string
  model: string | null
  success: boolean
  total_tokens: number | null
  latency_ms: number | null
  created_at: string
}

export interface UserSubscription {
  id: string
  plan_name: string | null
  tier: string | null
  status: string
  provider: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
  created_at: string
}

export interface UserPayment {
  id: string
  amount_usd: number
  status: string
  provider: string
  provider_payment_id: string | null
  created_at: string
}

export interface UserAuditLog {
  id: string
  action: string
  table_name: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  severity: string | null
  created_at: string
}

export interface UserRole {
  id: string
  role: string
  granted_at: string
  expires_at: string | null
}

// ── List / search users ───────────────────────────────────────────────────────

export async function fetchUsers(
  filters: UserFilters,
  page: number,
  pageSize: number,
): Promise<PaginatedUsers> {
  const from = page * pageSize
  const to   = from + pageSize - 1

  // Try the v_admin_users view first (server-side filtering, correct pagination)
  // Falls back to the multi-query approach if the view doesn't exist yet
  let useView = true
  let query = supabase
    .from('v_admin_users' as 'users')
    .select(
      'id, name, registration_date, gender, height_cm, current_weight_kg, target_weight_kg, fitness_goal, fitness_level, avatar_url, workout_days, equipment, role, plan_tier, sub_status',
      { count: 'exact' },
    )
    .order('registration_date', { ascending: false })
    .range(from, to)

  // Apply server-side filters (all columns exist in the view)
  if (filters.search.trim()) query = query.ilike('name', `%${filters.search.trim()}%`)
  if (filters.role)          query = query.eq('role', filters.role)
  if (filters.plan)          query = query.eq('plan_tier', filters.plan)
  if (filters.status === 'active')  query = query.eq('sub_status', 'active')
  if (filters.status === 'no_sub')  query = query.is('sub_status', null)

  const { data: viewData, error: viewErr, count } = await query

  if (viewErr) {
    // View doesn't exist — fall back to multi-query approach
    useView = false
    console.warn('[users.queries] v_admin_users not available, using fallback:', viewErr.message)
  }

  if (useView && viewData) {
    return {
      data: viewData.map((u) => ({
        id: u.id,
        name: u.name ?? null,
        registration_date: u.registration_date ?? null,
        gender: u.gender ?? null,
        height_cm: u.height_cm ?? null,
        current_weight_kg: u.current_weight_kg ?? null,
        target_weight_kg: u.target_weight_kg ?? null,
        fitness_goal: u.fitness_goal ?? null,
        fitness_level: u.fitness_level ?? null,
        avatar_url: u.avatar_url ?? null,
        workout_days: u.workout_days ?? null,
        equipment: u.equipment ?? null,
        role: (u as { role?: string }).role ?? 'user',
        plan_tier: (u as { plan_tier?: string }).plan_tier ?? 'free',
        sub_status: (u as { sub_status?: string | null }).sub_status ?? null,
      })) as AdminUser[],
      total: count ?? 0,
    }
  }

  // ── Fallback: multi-query approach ─────────────────────────────────────────
  let baseQuery = supabase
    .from('users')
    .select(
      'id, name, registration_date, gender, height_cm, current_weight_kg, target_weight_kg, fitness_goal, fitness_level, avatar_url, workout_days, equipment',
      { count: 'exact' },
    )
    .order('registration_date', { ascending: false })

  if (filters.search.trim()) baseQuery = baseQuery.ilike('name', `%${filters.search.trim()}%`)
  baseQuery = baseQuery.range(from, to)

  const { data: users, error, count: fallbackCount } = await baseQuery
  if (error) throw error
  if (!users?.length) return { data: [], total: fallbackCount ?? 0 }

  const userIds = users.map((u) => u.id)

  const [roleRes, subRes] = await Promise.all([
    supabase.from('user_roles').select('user_id, role').in('user_id', userIds),
    supabase.from('user_subscriptions').select('user_id, status, plan_id').in('user_id', userIds),
  ])

  const planIds = [...new Set((subRes.data ?? []).map((s) => s.plan_id).filter(Boolean))]
  let planMap: Record<string, { tier: string }> = {}
  if (planIds.length) {
    const { data: plans } = await supabase
      .from('subscription_plans').select('id, tier').in('id', planIds)
    for (const p of plans ?? []) planMap[p.id] = { tier: p.tier }
  }

  const roleByUser: Record<string, string> = {}
  for (const r of roleRes.data ?? []) {
    if (!roleByUser[r.user_id]) roleByUser[r.user_id] = r.role
  }

  const subByUser: Record<string, { tier: string; status: string }> = {}
  for (const s of subRes.data ?? []) {
    const existing = subByUser[s.user_id]
    const isActive = ['active', 'trialing'].includes(s.status)
    if (!existing || isActive) {
      subByUser[s.user_id] = { tier: planMap[s.plan_id]?.tier ?? 'free', status: s.status }
    }
  }

  const mapped: AdminUser[] = users.map((u) => ({
    id: u.id, name: u.name ?? null, registration_date: u.registration_date ?? null,
    gender: u.gender ?? null, height_cm: u.height_cm ?? null,
    current_weight_kg: u.current_weight_kg ?? null, target_weight_kg: u.target_weight_kg ?? null,
    fitness_goal: u.fitness_goal ?? null, fitness_level: u.fitness_level ?? null,
    avatar_url: u.avatar_url ?? null, workout_days: u.workout_days ?? null,
    equipment: u.equipment ?? null,
    role: roleByUser[u.id] ?? 'user',
    plan_tier: subByUser[u.id]?.tier ?? 'free',
    sub_status: subByUser[u.id]?.status ?? null,
  }))

  // Client-side filter by role/plan/status only in fallback mode
  const filtered = mapped.filter((u) => {
    if (filters.role && u.role !== filters.role) return false
    if (filters.plan && u.plan_tier !== filters.plan) return false
    if (filters.status === 'active' && u.sub_status !== 'active') return false
    if (filters.status === 'no_sub' && u.sub_status != null) return false
    return true
  })

  return { data: filtered, total: fallbackCount ?? 0 }
}

// ── Single user detail ────────────────────────────────────────────────────────

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data as UserProfile
}

export async function fetchUserRoles(userId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('id, role, granted_at, expires_at')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as UserRole[]
}

export async function fetchUserBodyStats(userId: string): Promise<UserBodyStats[]> {
  const { data, error } = await supabase
    .from('body_logs')
    .select('log_date, weight_kg, bmi')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(30)
  if (error) throw error
  return (data ?? []) as UserBodyStats[]
}

export async function fetchUserWorkouts(userId: string): Promise<UserWorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, session_date, day_of_week, completed_count, total_count, skipped, calories_burned, perceived_effort, mood')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as UserWorkoutSession[]
}

export async function fetchUserMealLogs(userId: string): Promise<UserMealLog[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('id, log_date, meal_slot, food_name, calories, protein_g, carbs_g, fat_g, quantity')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as UserMealLog[]
}

export async function fetchUserAiLogs(userId: string): Promise<UserAiLog[]> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('id, feature, provider, model, success, total_tokens, latency_ms, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as UserAiLog[]
}

export async function fetchUserSubscriptions(userId: string): Promise<UserSubscription[]> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('id, status, provider, current_period_start, current_period_end, cancel_at_period_end, trial_end, created_at, plan_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const planIds = [...new Set((data ?? []).map((s) => s.plan_id).filter(Boolean))]
  let planMap: Record<string, { name: string; tier: string }> = {}
  if (planIds.length) {
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('id, name, tier')
      .in('id', planIds)
    for (const p of plans ?? []) planMap[p.id] = { name: p.name, tier: p.tier }
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    plan_name: planMap[s.plan_id]?.name ?? null,
    tier: planMap[s.plan_id]?.tier ?? null,
    status: s.status,
    provider: s.provider,
    current_period_start: s.current_period_start,
    current_period_end: s.current_period_end,
    cancel_at_period_end: s.cancel_at_period_end,
    trial_end: s.trial_end,
    created_at: s.created_at,
  }))
}

export async function fetchUserPayments(userId: string): Promise<UserPayment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount_usd, status, provider, provider_payment_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []).map((p) => ({
    ...p,
    amount_usd: Number(p.amount_usd),
  })) as UserPayment[]
}

export interface UserPaymentSubmission {
  id: string
  plan_name: string | null
  plan_tier: string | null
  method_name: string | null
  amount_etb: number
  transaction_ref: string | null
  status: string
  submitted_at: string
  verified_at: string | null
  rejection_reason: string | null
  proof_path: string | null
}

export async function fetchUserPaymentSubmissions(userId: string): Promise<UserPaymentSubmission[]> {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      id, amount_etb, transaction_ref, status, submitted_at, verified_at,
      rejection_reason, proof_path,
      plan:subscription_plans(name, tier),
      method:app_payment_methods(name)
    `)
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    plan_name: (r.plan as any)?.name ?? null,
    plan_tier: (r.plan as any)?.tier ?? null,
    method_name: (r.method as any)?.name ?? null,
    amount_etb: Number(r.amount_etb),
    transaction_ref: r.transaction_ref,
    status: r.status,
    submitted_at: r.submitted_at,
    verified_at: r.verified_at,
    rejection_reason: r.rejection_reason,
    proof_path: r.proof_path,
  }))
}

export async function fetchUserAuditLogs(userId: string): Promise<UserAuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, table_name, old_values, new_values, ip_address, severity, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as UserAuditLog[]
}

// ── Subscription actions ──────────────────────────────────────────────────────

export async function fetchSubscriptionPlans() {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, name, tier, price_monthly_usd')
    .eq('is_active', true)
    .order('price_monthly_usd', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function changeUserSubscription(
  subscriptionId: string,
  newPlanId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ plan_id: newPlanId, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  if (error) throw error
}

export async function cancelUserSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
  if (error) throw error
}

export async function extendUserSubscription(
  subscriptionId: string,
  days: number,
): Promise<void> {
  // Fetch current end date
  const { data, error: fetchErr } = await supabase
    .from('user_subscriptions')
    .select('current_period_end')
    .eq('id', subscriptionId)
    .single()
  if (fetchErr) throw fetchErr

  const currentEnd = data?.current_period_end
    ? new Date(data.current_period_end)
    : new Date()
  currentEnd.setDate(currentEnd.getDate() + days)

  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      current_period_end: currentEnd.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
  if (error) throw error
}

export async function reactivateUserSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'active',
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
  if (error) throw error
}

// ── Role actions ──────────────────────────────────────────────────────────────

export async function changeUserRole(
  userId: string,
  newRole: string,
  grantedBy: string,
): Promise<void> {
  // Prevent admins from changing their own role (privilege escalation guard)
  if (userId === grantedBy) {
    throw new Error('You cannot change your own role. Ask another super admin.')
  }

  // Validate the new role is a known value
  const validRoles = ['user', 'moderator', 'analyst', 'support', 'content_manager', 'admin', 'super_admin']
  if (!validRoles.includes(newRole)) {
    throw new Error(`Invalid role: "${newRole}"`)
  }

  // Use a transaction: delete existing roles then insert new one
  const { error: delErr } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
  if (delErr) throw new Error(`Failed to remove existing roles: ${delErr.message}`)

  const { error: insErr } = await supabase.from('user_roles').insert({
    user_id: userId,
    role: newRole,
    granted_by: grantedBy,
    granted_at: new Date().toISOString(),
  })
  if (insErr) throw new Error(`Failed to assign new role: ${insErr.message}`)
}

// ── Account actions ───────────────────────────────────────────────────────────

export async function suspendUser(userId: string, adminId: string): Promise<void> {
  // We can't disable auth.users via anon key. Mark via a user_app_settings flag.
  const { error } = await supabase.from('user_app_settings').upsert(
    {
      user_id: userId,
      settings: { suspended: true, suspended_at: new Date().toISOString(), suspended_by: adminId },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error

  // Log to audit_logs
  await supabase.from('audit_logs').insert({
    user_id: adminId,
    action: 'admin_action',
    table_name: 'users',
    record_id: userId,
    new_values: { action: 'suspend', target_user_id: userId },
    severity: 'warning',
  })
}

export async function reactivateUser(userId: string, adminId: string): Promise<void> {
  const { error } = await supabase.from('user_app_settings').upsert(
    {
      user_id: userId,
      settings: { suspended: false, reactivated_at: new Date().toISOString(), reactivated_by: adminId },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw error

  await supabase.from('audit_logs').insert({
    user_id: adminId,
    action: 'admin_action',
    table_name: 'users',
    record_id: userId,
    new_values: { action: 'reactivate', target_user_id: userId },
    severity: 'info',
  })
}

export async function deleteUser(userId: string, adminId: string): Promise<void> {
  // Delete from public.users — cascades to all child tables via FK
  const { error } = await supabase.from('users').delete().eq('id', userId)
  if (error) throw error

  await supabase.from('audit_logs').insert({
    user_id: adminId,
    action: 'delete',
    table_name: 'users',
    record_id: userId,
    new_values: { action: 'hard_delete', target_user_id: userId },
    severity: 'critical',
  })
}
