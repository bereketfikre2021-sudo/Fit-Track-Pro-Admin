/**
 * ai.queries.ts
 * All Supabase queries for the AI Administration module.
 */

import { supabase } from './supabase'

export const AI_FEATURES  = ['exercise_recommendation','meal_recommendation','shopping_recommendation','chat','analysis','form_check','other'] as const
export const AI_PROVIDERS = ['gemini','openai','anthropic','local','other'] as const

export type AiFeature  = typeof AI_FEATURES[number]
export type AiProvider = typeof AI_PROVIDERS[number]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiLog {
  id: string
  user_id: string
  feature: string
  provider: string
  model: string | null
  prompt_tokens: number | null
  completion_tokens: number | null
  total_tokens: number | null
  latency_ms: number | null
  success: boolean
  error_message: string | null
  request_hash: string | null
  created_at: string
  // joined
  user_name?: string | null
  plan_tier?: string | null
}

export interface AiFilters {
  search: string        // user name search
  feature: string
  provider: string
  success: string       // 'true' | 'false' | ''
  date_from: string
  date_to: string
  plan_tier: string
}

export interface DailyStats {
  date: string
  requests: number
  successes: number
  failures: number
  total_tokens: number
  avg_latency: number
}

export interface MonthlyStats {
  month: string
  month_label: string
  requests: number
  successes: number
  failures: number
  total_tokens: number
  avg_latency: number
}

export interface FeatureBreakdown {
  feature: string
  count: number
  successes: number
  total_tokens: number
  avg_latency: number
}

export interface ProviderBreakdown {
  provider: string
  count: number
  total_tokens: number
  avg_latency: number
}

export interface TopUser {
  user_id: string
  user_name: string | null
  count: number
  total_tokens: number
}

// ── Log list ──────────────────────────────────────────────────────────────────

export async function fetchAiLogs(
  page: number,
  pageSize: number,
  filters: AiFilters,
): Promise<{ data: AiLog[]; total: number }> {
  const from = page * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('ai_usage_logs')
    .select('id, user_id, feature, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, success, error_message, request_hash, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.feature)   q = q.eq('feature', filters.feature)
  if (filters.provider)  q = q.eq('provider', filters.provider)
  if (filters.success !== '') q = q.eq('success', filters.success === 'true')
  if (filters.date_from) q = q.gte('created_at', new Date(filters.date_from).toISOString())
  if (filters.date_to)   q = q.lte('created_at', new Date(filters.date_to + 'T23:59:59').toISOString())

  const { data, error, count } = await q
  if (error) throw error
  if (!data?.length) return { data: [], total: count ?? 0 }

  // Resolve user names
  const userIds = [...new Set(data.map((r) => r.user_id))]
  const [userRes, subRes] = await Promise.all([
    supabase.from('users').select('id, name').in('id', userIds),
    supabase.from('user_subscriptions').select('user_id, status, plan_id').in('user_id', userIds).in('status', ['active', 'trialing']),
  ])

  const planIds = [...new Set((subRes.data ?? []).map((s) => s.plan_id))]
  const planMap: Record<string, string> = {}
  if (planIds.length) {
    const { data: plans } = await supabase.from('subscription_plans').select('id, tier').in('id', planIds)
    for (const p of plans ?? []) planMap[p.id] = p.tier
  }

  const userMap: Record<string, string | null> = {}
  for (const u of userRes.data ?? []) userMap[u.id] = u.name

  const tierByUser: Record<string, string> = {}
  for (const s of subRes.data ?? []) tierByUser[s.user_id] = planMap[s.plan_id] ?? 'free'

  // Apply tier filter client-side (no join available)
  let logs = data.map((r) => ({
    ...r,
    user_name: userMap[r.user_id] ?? null,
    plan_tier: tierByUser[r.user_id] ?? 'free',
  })) as AiLog[]

  if (filters.plan_tier) logs = logs.filter((l) => l.plan_tier === filters.plan_tier)
  if (filters.search.trim()) {
    const s = filters.search.toLowerCase()
    logs = logs.filter((l) => l.user_name?.toLowerCase().includes(s))
  }

  return { data: logs, total: count ?? 0 }
}

// ── Overview stats ────────────────────────────────────────────────────────────

export async function fetchAiOverviewStats() {
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)

  const [total, todayRes, monthRes, failRes, tokenRes] = await Promise.all([
    supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }),
    supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }).gte('created_at', monthStart.toISOString()),
    supabase.from('ai_usage_logs').select('id', { count: 'exact', head: true }).eq('success', false),
    supabase.from('ai_usage_logs').select('total_tokens, latency_ms').limit(1000).order('created_at', { ascending: false }),
  ])

  const tokens = (tokenRes.data ?? []).reduce((s, r) => s + (r.total_tokens ?? 0), 0)
  const latencies = (tokenRes.data ?? []).filter((r) => r.latency_ms).map((r) => r.latency_ms as number)
  const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0

  return {
    total:       total.count ?? 0,
    today:       todayRes.count ?? 0,
    thisMonth:   monthRes.count ?? 0,
    failures:    failRes.count ?? 0,
    totalTokens: tokens,
    avgLatency,
    successRate: total.count ? Math.round(((total.count - (failRes.count ?? 0)) / total.count) * 100) : 0,
  }
}

// ── Chart data ────────────────────────────────────────────────────────────────

export async function fetchDailyStats(days = 30): Promise<DailyStats[]> {
  const since = new Date(Date.now() - (days - 1) * 86400_000)
  since.setUTCHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('created_at, success, total_tokens, latency_ms')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })
    .limit(50000)  // prevent unbounded scan
  if (error) throw error

  const buckets: Record<string, { requests: number; successes: number; tokens: number; latencies: number[] }> = {}

  for (const r of data ?? []) {
    const d = (r.created_at as string).slice(0, 10)
    if (!buckets[d]) buckets[d] = { requests: 0, successes: 0, tokens: 0, latencies: [] }
    buckets[d].requests++
    if (r.success) buckets[d].successes++
    buckets[d].tokens += r.total_tokens ?? 0
    if (r.latency_ms) buckets[d].latencies.push(r.latency_ms)
  }

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400_000)
    const key = d.toISOString().slice(0, 10)
    const b = buckets[key]
    const lats = b?.latencies ?? []
    return {
      date: key,
      requests: b?.requests ?? 0,
      successes: b?.successes ?? 0,
      failures: (b?.requests ?? 0) - (b?.successes ?? 0),
      total_tokens: b?.tokens ?? 0,
      avg_latency: lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0,
    }
  })
}

export async function fetchMonthlyStats(months = 12): Promise<MonthlyStats[]> {
  const since = new Date(); since.setMonth(since.getMonth() - (months - 1)); since.setDate(1); since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('created_at, success, total_tokens, latency_ms')
    .gte('created_at', since.toISOString())
    .limit(200000)
  if (error) throw error

  const buckets: Record<string, { requests: number; successes: number; tokens: number; latencies: number[] }> = {}

  for (const r of data ?? []) {
    const d = new Date(r.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!buckets[key]) buckets[key] = { requests: 0, successes: 0, tokens: 0, latencies: [] }
    buckets[key].requests++
    if (r.success) buckets[key].successes++
    buckets[key].tokens += r.total_tokens ?? 0
    if (r.latency_ms) buckets[key].latencies.push(r.latency_ms)
  }

  return Array.from({ length: months }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (months - 1 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const b = buckets[key]
    const lats = b?.latencies ?? []
    return {
      month: key, month_label: label,
      requests: b?.requests ?? 0, successes: b?.successes ?? 0,
      failures: (b?.requests ?? 0) - (b?.successes ?? 0),
      total_tokens: b?.tokens ?? 0,
      avg_latency: lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0,
    }
  })
}

export async function fetchFeatureBreakdown(days = 90): Promise<FeatureBreakdown[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('feature, success, total_tokens, latency_ms')
    .gte('created_at', since)
    .limit(100000)
  if (error) throw error

  const map: Record<string, { count: number; successes: number; tokens: number; latencies: number[] }> = {}
  for (const r of data ?? []) {
    if (!map[r.feature]) map[r.feature] = { count: 0, successes: 0, tokens: 0, latencies: [] }
    map[r.feature].count++
    if (r.success) map[r.feature].successes++
    map[r.feature].tokens += r.total_tokens ?? 0
    if (r.latency_ms) map[r.feature].latencies.push(r.latency_ms)
  }

  return Object.entries(map).map(([feature, v]) => ({
    feature,
    count: v.count,
    successes: v.successes,
    total_tokens: v.tokens,
    avg_latency: v.latencies.length ? Math.round(v.latencies.reduce((a, b) => a + b, 0) / v.latencies.length) : 0,
  })).sort((a, b) => b.count - a.count)
}

export async function fetchProviderBreakdown(days = 90): Promise<ProviderBreakdown[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('provider, total_tokens, latency_ms')
    .gte('created_at', since)
    .limit(100000)
  if (error) throw error

  const map: Record<string, { count: number; tokens: number; latencies: number[] }> = {}
  for (const r of data ?? []) {
    if (!map[r.provider]) map[r.provider] = { count: 0, tokens: 0, latencies: [] }
    map[r.provider].count++
    map[r.provider].tokens += r.total_tokens ?? 0
    if (r.latency_ms) map[r.provider].latencies.push(r.latency_ms)
  }

  return Object.entries(map).map(([provider, v]) => ({
    provider,
    count: v.count,
    total_tokens: v.tokens,
    avg_latency: v.latencies.length ? Math.round(v.latencies.reduce((a, b) => a + b, 0) / v.latencies.length) : 0,
  })).sort((a, b) => b.count - a.count)
}

export async function fetchTopUsers(limit = 10, days = 90): Promise<TopUser[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('user_id, total_tokens')
    .gte('created_at', since)
    .limit(100000)
  if (error) throw error

  const map: Record<string, { count: number; tokens: number }> = {}
  for (const r of data ?? []) {
    if (!map[r.user_id]) map[r.user_id] = { count: 0, tokens: 0 }
    map[r.user_id].count++
    map[r.user_id].tokens += r.total_tokens ?? 0
  }

  const sorted = Object.entries(map)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, limit)

  if (!sorted.length) return []

  const userIds = sorted.map(([id]) => id)
  const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
  const userMap: Record<string, string | null> = {}
  for (const u of users ?? []) userMap[u.id] = u.name

  return sorted.map(([user_id, v]) => ({
    user_id,
    user_name: userMap[user_id] ?? null,
    count: v.count,
    total_tokens: v.tokens,
  }))
}

export async function fetchErrorLogs(limit = 50): Promise<AiLog[]> {
  // Cap at 500 to prevent unbounded query
  const safeLimit = Math.min(limit, 500)
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('id, user_id, feature, provider, model, error_message, created_at, total_tokens, latency_ms, success, prompt_tokens, completion_tokens, request_hash')
    .eq('success', false)
    .order('created_at', { ascending: false })
    .limit(safeLimit)
  if (error) throw error

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))]
  const userMap: Record<string, string | null> = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.name
  }

  return (data ?? []).map((r) => ({ ...r, user_name: userMap[r.user_id] ?? null })) as AiLog[]
}
