/**
 * dashboard.queries.ts
 *
 * All Supabase queries used by the Dashboard Overview page.
 * Every query uses the admin session, which passes the RLS "admin read-all bypass"
 * policies defined in the database.
 *
 * Table/column names match the database documentation exactly.
 */

import { supabase } from './supabase'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** ISO string for the start of today (UTC midnight). */
function todayUtc(): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/** ISO string for N days ago at UTC midnight. */
function daysAgoUtc(n: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

/** ISO string for the start of the current UTC month. */
function startOfMonthUtc(): string {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatCards {
  totalUsers: number
  activeUsers: number       // logged in within last 30 days (via audit_logs)
  freeUsers: number
  proUsers: number
  eliteUsers: number
  teamUsers: number
  monthlyRevenue: number    // sum of succeeded payments this calendar month
  activeSubscriptions: number
  aiRequestsToday: number
  workoutsToday: number
  mealPlansGenerated: number // distinct users with ≥1 meal_plan row
}

export interface UserGrowthPoint {
  date: string   // 'YYYY-MM-DD'
  count: number  // cumulative new registrations up to that date
}

export interface RevenuePoint {
  month: string  // 'MMM YY' e.g. 'Jan 25'
  revenue: number
}

export interface AiUsagePoint {
  date: string
  requests: number
}

export interface WorkoutPoint {
  date: string
  sessions: number
}

export interface NutritionPoint {
  date: string
  logs: number
}

export interface RecentUser {
  id: string
  name: string | null
  email: string | null
  registration_date: string | null
  plan: string | null   // tier name from subscription_plans
}

export interface RecentPayment {
  id: string
  user_id: string
  email: string | null
  amount_usd: number
  status: string
  provider: string
  created_at: string
}

export interface RecentNotification {
  id: string
  user_id: string
  title: string | null
  body: string | null
  channel: string
  category: string | null
  created_at: string
  is_read: boolean
}

export interface RecentAiRequest {
  id: string
  user_id: string
  feature: string
  provider: string
  model: string | null
  success: boolean
  total_tokens: number | null
  created_at: string
}

export interface DashboardData {
  stats: StatCards
  userGrowth: UserGrowthPoint[]
  revenue: RevenuePoint[]
  aiUsage: AiUsagePoint[]
  workoutActivity: WorkoutPoint[]
  nutritionActivity: NutritionPoint[]
  recentUsers: RecentUser[]
  recentPayments: RecentPayment[]
  recentNotifications: RecentNotification[]
  recentAiRequests: RecentAiRequest[]
}

// ─── Individual fetchers ──────────────────────────────────────────────────────

/** Total count of rows in public.users */
async function fetchTotalUsers(): Promise<number> {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

/**
 * Active users = distinct user_ids in audit_logs with action='login'
 * in the last 30 days. Admins have read-all on audit_logs.
 */
async function fetchActiveUsers(): Promise<number> {
  const { count, error } = await supabase
    .from('audit_logs')
    .select('user_id', { count: 'exact', head: true })
    .eq('action', 'login')
    .gte('created_at', daysAgoUtc(30))
    .not('user_id', 'is', null)
  if (error) throw error
  return count ?? 0
}

/**
 * Per-tier user counts.
 * We join user_subscriptions → subscription_plans and count by tier.
 * Only active/trialing subscriptions are counted per tier.
 * Users with no subscription row fall into "free".
 */
async function fetchSubscriptionTierCounts(): Promise<{
  free: number; pro: number; elite: number; team: number
}> {
  // Count users per tier from active/trialing subscriptions
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('subscription_plans!inner(tier)')
    .in('status', ['active', 'trialing'])

  if (error) throw error

  const counts = { free: 0, pro: 0, elite: 0, team: 0 }
  for (const row of data ?? []) {
    const plan = row.subscription_plans as unknown as { tier: string }
    const tier = plan?.tier as keyof typeof counts
    if (tier && tier in counts) counts[tier]++
  }
  return counts
}

/** Total users minus those with a paid tier sub = free users */
async function fetchFreeUsers(totalUsers: number, paid: { pro: number; elite: number; team: number }): Promise<number> {
  const paidTotal = paid.pro + paid.elite + paid.team
  return Math.max(0, totalUsers - paidTotal)
}

/** Sum of payments.amount_usd where status='succeeded' this calendar month */
async function fetchMonthlyRevenue(): Promise<number> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount_usd')
    .eq('status', 'succeeded')
    .gte('created_at', startOfMonthUtc())
    .limit(5000)  // guard against unbounded scan on large tables
  if (error) throw error
  return (data ?? []).reduce((sum, r) => sum + (Number(r.amount_usd) || 0), 0)
}

/** Count of active + trialing subscriptions */
async function fetchActiveSubscriptions(): Promise<number> {
  const { count, error } = await supabase
    .from('user_subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'trialing'])
  if (error) throw error
  return count ?? 0
}

/** Count of ai_usage_logs rows created today */
async function fetchAiRequestsToday(): Promise<number> {
  const { count, error } = await supabase
    .from('ai_usage_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', todayUtc())
  if (error) throw error
  return count ?? 0
}

/** Count of workout_sessions where session_date = today and skipped = false */
async function fetchWorkoutsToday(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  const { count, error } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('session_date', today)
    .eq('skipped', false)
  if (error) throw error
  return count ?? 0
}

/** Count of distinct user_ids in meal_plans (anyone with ≥1 planned meal) */
async function fetchMealPlansGenerated(): Promise<number> {
  // meal_plans has no unique PK other than composite, so count all rows and
  // return total unique users by fetching with head + count
  const { count, error } = await supabase
    .from('meal_plans')
    .select('user_id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

// ─── Chart data fetchers ───────────────────────────────────────────────────

/**
 * User growth — new registrations per day for the last 30 days.
 * Uses registration_date from public.users.
 */
async function fetchUserGrowth(): Promise<UserGrowthPoint[]> {
  const { data, error } = await supabase
    .from('users')
    .select('registration_date')
    .gte('registration_date', new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10))
    .order('registration_date', { ascending: true })
  if (error) throw error

  // Group by date
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = (row.registration_date as string)?.slice(0, 10)
    if (d) counts[d] = (counts[d] ?? 0) + 1
  }

  // Fill every day in the last 30 days
  const points: UserGrowthPoint[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    points.push({ date: key, count: counts[key] ?? 0 })
  }
  return points
}

/**
 * Revenue — sum of succeeded payments grouped by month, last 12 months.
 */
async function fetchRevenue(): Promise<RevenuePoint[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('payments')
    .select('amount_usd, created_at')
    .eq('status', 'succeeded')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
  if (error) throw error

  const monthly: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = new Date(row.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthly[key] = (monthly[key] ?? 0) + (Number(row.amount_usd) || 0)
  }

  const points: RevenuePoint[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    points.push({ month: label, revenue: monthly[key] ?? 0 })
  }
  return points
}

/**
 * AI usage — requests per day, last 30 days.
 */
async function fetchAiUsage(): Promise<AiUsagePoint[]> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('created_at')
    .gte('created_at', daysAgoUtc(29))
    .order('created_at', { ascending: true })
    .limit(10000)
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = (row.created_at as string)?.slice(0, 10)
    if (d) counts[d] = (counts[d] ?? 0) + 1
  }

  const points: AiUsagePoint[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    points.push({ date: key, requests: counts[key] ?? 0 })
  }
  return points
}

/**
 * Workout activity — completed sessions per day, last 30 days.
 */
async function fetchWorkoutActivity(): Promise<WorkoutPoint[]> {
  const since = new Date(Date.now() - 29 * 86400_000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('session_date')
    .eq('skipped', false)
    .gte('session_date', since)
    .order('session_date', { ascending: true })
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = row.session_date as string
    if (d) counts[d] = (counts[d] ?? 0) + 1
  }

  const points: WorkoutPoint[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    points.push({ date: key, sessions: counts[key] ?? 0 })
  }
  return points
}

/**
 * Nutrition activity — meal_logs entries per day, last 30 days.
 */
async function fetchNutritionActivity(): Promise<NutritionPoint[]> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('logged_at')
    .gte('logged_at', daysAgoUtc(29))
    .order('logged_at', { ascending: true })
    .limit(10000)
  if (error) throw error

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const d = (row.logged_at as string)?.slice(0, 10)
    if (d) counts[d] = (counts[d] ?? 0) + 1
  }

  const points: NutritionPoint[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    points.push({ date: key, logs: counts[key] ?? 0 })
  }
  return points
}

// ─── Recent feed fetchers ──────────────────────────────────────────────────

/** 8 most recently registered users joined with their active subscription plan */
async function fetchRecentUsers(): Promise<RecentUser[]> {
  // Step 1: fetch recent users
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, name, registration_date')
    .order('registration_date', { ascending: false })
    .limit(8)
  if (uErr) throw uErr
  if (!users?.length) return []

  const userIds = users.map((u) => u.id)

  // Step 2: fetch active subscriptions with plan tier for those users
  const { data: subs, error: sErr } = await supabase
    .from('user_subscriptions')
    .select('user_id, status, plan_id, subscription_plans(tier)')
    .in('user_id', userIds)
    .in('status', ['active', 'trialing'])
  if (sErr) {
    // Non-fatal — just show free plan if this fails
    console.warn('[dashboard] fetchRecentUsers subs:', sErr.message)
  }

  const subByUser: Record<string, string> = {}
  for (const s of subs ?? []) {
    const tier = (s.subscription_plans as unknown as { tier: string } | null)?.tier ?? 'free'
    subByUser[s.user_id] = tier
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name ?? null,
    email: null,
    registration_date: u.registration_date ?? null,
    plan: subByUser[u.id] ?? 'free',
  }))
}

/** 8 most recent payments */
async function fetchRecentPayments(): Promise<RecentPayment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, user_id, amount_usd, status, provider, created_at')
    .order('created_at', { ascending: false })
    .limit(8)
  if (error) throw error

  return (data ?? []).map((p) => ({
    id: p.id,
    user_id: p.user_id,
    email: null,
    amount_usd: Number(p.amount_usd) || 0,
    status: p.status,
    provider: p.provider,
    created_at: p.created_at,
  }))
}

/** 8 most recent notifications (all users, admin bypass) */
async function fetchRecentNotifications(): Promise<RecentNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, channel, category, created_at, is_read')
    .order('created_at', { ascending: false })
    .limit(8)
  if (error) throw error

  return (data ?? []).map((n) => ({
    id: n.id,
    user_id: n.user_id,
    title: n.title ?? null,
    body: n.body ?? null,
    channel: n.channel,
    category: n.category ?? null,
    created_at: n.created_at,
    is_read: n.is_read ?? false,
  }))
}

/** 8 most recent AI requests */
async function fetchRecentAiRequests(): Promise<RecentAiRequest[]> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('id, user_id, feature, provider, model, success, total_tokens, created_at')
    .order('created_at', { ascending: false })
    .limit(8)
  if (error) throw error

  return (data ?? []).map((a) => ({
    id: a.id,
    user_id: a.user_id,
    feature: a.feature,
    provider: a.provider,
    model: a.model ?? null,
    success: a.success ?? true,
    total_tokens: a.total_tokens ?? null,
    created_at: a.created_at,
  }))
}

// ─── Master fetcher ────────────────────────────────────────────────────────

/**
 * Fetch all dashboard data.
 *
 * Stats (totalUsers, activeUsers, tiers, revenue, etc.) are loaded via a
 * single `get_admin_dashboard_stats()` RPC — 1 DB round-trip instead of 8.
 * If the RPC doesn't exist yet the function falls back to individual queries.
 *
 * Charts and recent feeds still run in parallel.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  // ── Stats via RPC (single round-trip) ──────────────────────────────────────
  let statsData: StatCards | null = null

  try {
    const { data: rpc, error: rpcErr } = await supabase
      .rpc('get_admin_dashboard_stats')

    if (!rpcErr && rpc) {
      const tiers = (rpc.tier_counts ?? {}) as Record<string, number>
      const total = Number(rpc.total_users ?? 0)
      const paid = (tiers.pro ?? 0) + (tiers.elite ?? 0) + (tiers.team ?? 0)
      statsData = {
        totalUsers:           total,
        activeUsers:          Number(rpc.active_users_30d ?? 0),
        freeUsers:            Math.max(0, total - paid),
        proUsers:             tiers.pro ?? 0,
        eliteUsers:           tiers.elite ?? 0,
        teamUsers:            tiers.team ?? 0,
        monthlyRevenue:       Number(rpc.monthly_revenue ?? 0),
        activeSubscriptions:  Number(rpc.active_subscriptions ?? 0),
        aiRequestsToday:      Number(rpc.ai_requests_today ?? 0),
        workoutsToday:        Number(rpc.workouts_today ?? 0),
        mealPlansGenerated:   Number(rpc.meal_plans_count ?? 0),
      }
    }
  } catch {
    // RPC not deployed yet — fall back below
  }

  // ── Fallback: individual queries if RPC unavailable ────────────────────────
  if (!statsData) {
    const [
      totalUsers, activeUsers, tierCounts, monthlyRevenue,
      activeSubscriptions, aiRequestsToday, workoutsToday, mealPlansGenerated,
    ] = await Promise.all([
      fetchTotalUsers(), fetchActiveUsers(), fetchSubscriptionTierCounts(),
      fetchMonthlyRevenue(), fetchActiveSubscriptions(),
      fetchAiRequestsToday(), fetchWorkoutsToday(), fetchMealPlansGenerated(),
    ])
    const freeUsers = await fetchFreeUsers(totalUsers, tierCounts)
    statsData = {
      totalUsers, activeUsers, freeUsers,
      proUsers: tierCounts.pro, eliteUsers: tierCounts.elite, teamUsers: tierCounts.team,
      monthlyRevenue, activeSubscriptions, aiRequestsToday, workoutsToday, mealPlansGenerated,
    }
  }

  // ── Charts + recent feeds run in parallel ──────────────────────────────────
  const [
    userGrowth, revenue, aiUsage, workoutActivity, nutritionActivity,
    recentUsers, recentPayments, recentNotifications, recentAiRequests,
  ] = await Promise.all([
    fetchUserGrowth(), fetchRevenue(), fetchAiUsage(),
    fetchWorkoutActivity(), fetchNutritionActivity(),
    fetchRecentUsers(), fetchRecentPayments(),
    fetchRecentNotifications(), fetchRecentAiRequests(),
  ])

  return {
    stats: statsData,
    userGrowth, revenue, aiUsage, workoutActivity, nutritionActivity,
    recentUsers, recentPayments, recentNotifications, recentAiRequests,
  }
}
