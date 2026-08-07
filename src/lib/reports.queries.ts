/**
 * reports.queries.ts
 * Data fetchers for all 7 report types.
 * All exports are typed and use only existing Supabase tables.
 */

import { supabase } from './supabase'

// ── Date helpers ──────────────────────────────────────────────────────────────

export interface DateRange { from: string; to: string }

export function defaultRange(months = 3): DateRange {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - months)
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  }
}

function toISO(date: string, end = false): string {
  return end ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`
}

// ── CSV / PDF helpers ─────────────────────────────────────────────────────────

export function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

export async function downloadPdf(title: string, rows: (string | number)[][], headers: string[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 20)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28)
  doc.setTextColor(0)

  // Table
  let y = 36
  const colW = Math.min(40, (pageW - 28) / headers.length)
  const rowH = 7

  // Header row
  doc.setFillColor(40, 40, 40)
  doc.setTextColor(255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.rect(14, y, pageW - 28, rowH, 'F')
  headers.forEach((h, i) => doc.text(h.slice(0, 18), 15 + i * colW, y + 4.8))
  y += rowH

  // Data rows
  doc.setTextColor(30)
  doc.setFont('helvetica', 'normal')
  rows.forEach((row, ri) => {
    if (y > 190) {
      doc.addPage()
      y = 20
    }
    if (ri % 2 === 0) { doc.setFillColor(248, 248, 248); doc.rect(14, y, pageW - 28, rowH, 'F') }
    row.forEach((cell, i) => doc.text(String(cell ?? '').slice(0, 20), 15 + i * colW, y + 4.8))
    y += rowH
  })

  doc.save(`${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ════════════════════════════════════════════════════════════════════
// REVENUE REPORT
// ════════════════════════════════════════════════════════════════════

export interface RevenueRow {
  date: string
  month_label: string
  gross: number
  net: number
  fees: number
  transactions: number
  refunds: number
}

export interface RevenueSummary {
  totalGross: number
  totalNet: number
  totalFees: number
  totalTransactions: number
  avgMonthly: number
  byProvider: Record<string, number>
  byMonth: RevenueRow[]
}

export async function fetchRevenueReport(range: DateRange): Promise<RevenueSummary> {
  const { data, error } = await supabase
    .from('payments')
    .select('amount_usd, fee_usd, net_usd, status, provider, created_at')
    .gte('created_at', toISO(range.from))
    .lte('created_at', toISO(range.to, true))
    .order('created_at', { ascending: true })
    .limit(100000)
  if (error) throw error

  const succeeded = (data ?? []).filter((p) => p.status === 'succeeded')
  const refunded  = (data ?? []).filter((p) => p.status === 'refunded')

  const byMonth: Record<string, RevenueRow> = {}
  for (const p of succeeded) {
    const d = new Date(p.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { date: key, month_label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), gross: 0, net: 0, fees: 0, transactions: 0, refunds: 0 }
    byMonth[key].gross += Number(p.amount_usd) || 0
    byMonth[key].net   += Number(p.net_usd) || 0
    byMonth[key].fees  += Number(p.fee_usd) || 0
    byMonth[key].transactions++
  }
  for (const p of refunded) {
    const d = new Date(p.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (byMonth[key]) byMonth[key].refunds++
  }

  const byProvider: Record<string, number> = {}
  for (const p of succeeded) byProvider[p.provider] = (byProvider[p.provider] ?? 0) + (Number(p.amount_usd) || 0)

  const rows = Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date))
  const totalGross = rows.reduce((s, r) => s + r.gross, 0)
  const totalNet   = rows.reduce((s, r) => s + r.net, 0)
  const totalFees  = rows.reduce((s, r) => s + r.fees, 0)
  const totalTx    = rows.reduce((s, r) => s + r.transactions, 0)

  return { totalGross, totalNet, totalFees, totalTransactions: totalTx, avgMonthly: rows.length ? totalGross / rows.length : 0, byProvider, byMonth: rows }
}

// ════════════════════════════════════════════════════════════════════
// SUBSCRIPTION REPORT
// ════════════════════════════════════════════════════════════════════

export interface SubReportRow {
  date: string
  label: string
  new_subs: number
  cancellations: number
  net: number
  active_total: number
}

export interface SubReport {
  activeNow: number
  trialNow: number
  cancelledRange: number
  newRange: number
  churnRate: number
  byTier: Record<string, number>
  timeline: SubReportRow[]
}

export async function fetchSubscriptionReport(range: DateRange): Promise<SubReport> {
  const [activeRes, eventsRes] = await Promise.all([
    supabase.from('user_subscriptions').select('status, plan_id').in('status', ['active', 'trialing']).limit(50000),
    supabase.from('subscription_events')
      .select('event_type, created_at')
      .gte('created_at', toISO(range.from))
      .lte('created_at', toISO(range.to, true))
      .order('created_at', { ascending: true })
      .limit(50000),
  ])

  const planIds = [...new Set((activeRes.data ?? []).map((s) => s.plan_id))]
  const planMap: Record<string, string> = {}
  if (planIds.length) {
    const { data: plans } = await supabase.from('subscription_plans').select('id, tier').in('id', planIds)
    for (const p of plans ?? []) planMap[p.id] = p.tier
  }

  const byTier: Record<string, number> = {}
  let activeNow = 0, trialNow = 0
  for (const s of activeRes.data ?? []) {
    const tier = planMap[s.plan_id] ?? 'free'
    byTier[tier] = (byTier[tier] ?? 0) + 1
    if (s.status === 'active') activeNow++
    else trialNow++
  }

  const monthly: Record<string, { new_subs: number; cancellations: number }> = {}
  let newRange = 0, cancelledRange = 0
  for (const e of eventsRes.data ?? []) {
    const d = new Date(e.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthly[key]) monthly[key] = { new_subs: 0, cancellations: 0 }
    if (e.event_type === 'created') { monthly[key].new_subs++; newRange++ }
    if (e.event_type === 'cancelled') { monthly[key].cancellations++; cancelledRange++ }
  }

  let cumulative = activeNow - newRange + cancelledRange
  const timeline: SubReportRow[] = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
    const d = new Date(key + '-01')
    cumulative += v.new_subs - v.cancellations
    return { date: key, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), new_subs: v.new_subs, cancellations: v.cancellations, net: v.new_subs - v.cancellations, active_total: Math.max(0, cumulative) }
  })

  const churnRate = newRange > 0 ? Math.round((cancelledRange / newRange) * 100) : 0
  return { activeNow, trialNow, cancelledRange, newRange, churnRate, byTier, timeline }
}

// ════════════════════════════════════════════════════════════════════
// WORKOUT REPORT
// ════════════════════════════════════════════════════════════════════

export interface WorkoutReportRow { date: string; label: string; completed: number; skipped: number; calories: number; avg_effort: number }

export interface WorkoutReport {
  totalCompleted: number; totalSkipped: number; totalCalories: number; avgEffort: number
  completionRate: number; activeUsers: number; timeline: WorkoutReportRow[]
}

export async function fetchWorkoutReport(range: DateRange): Promise<WorkoutReport> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('session_date, skipped, calories_burned, perceived_effort, user_id')
    .gte('session_date', range.from)
    .lte('session_date', range.to)
    .order('session_date', { ascending: true })
    .limit(100000)
  if (error) throw error

  const rows = data ?? []
  const byWeek: Record<string, WorkoutReportRow> = {}
  for (const s of rows) {
    const d = new Date(s.session_date as string)
    d.setDate(d.getDate() - d.getDay())
    const key = d.toISOString().slice(0, 10)
    if (!byWeek[key]) byWeek[key] = { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), completed: 0, skipped: 0, calories: 0, avg_effort: 0 }
    if (s.skipped) byWeek[key].skipped++
    else { byWeek[key].completed++; byWeek[key].calories += s.calories_burned ?? 0; byWeek[key].avg_effort += s.perceived_effort ?? 0 }
  }

  const timeline = Object.values(byWeek).sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({
    ...r, avg_effort: r.completed > 0 ? parseFloat((r.avg_effort / r.completed).toFixed(1)) : 0,
  }))

  const completed = rows.filter((s) => !s.skipped)
  const totalCalories = completed.reduce((s, r) => s + (r.calories_burned ?? 0), 0)
  const effortRows = completed.filter((s) => s.perceived_effort)
  const avgEffort = effortRows.length ? parseFloat((effortRows.reduce((s, r) => s + (r.perceived_effort ?? 0), 0) / effortRows.length).toFixed(1)) : 0

  return {
    totalCompleted: completed.length, totalSkipped: rows.filter((s) => s.skipped).length,
    totalCalories, avgEffort, completionRate: rows.length ? Math.round((completed.length / rows.length) * 100) : 0,
    activeUsers: new Set(completed.map((s) => s.user_id)).size, timeline,
  }
}

// ════════════════════════════════════════════════════════════════════
// NUTRITION REPORT
// ════════════════════════════════════════════════════════════════════

export interface NutritionReportRow { date: string; label: string; entries: number; calories: number; protein: number; carbs: number; fat: number }
export interface NutritionReport { totalEntries: number; avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number; activeUsers: number; timeline: NutritionReportRow[] }

export async function fetchNutritionReport(range: DateRange): Promise<NutritionReport> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select('log_date, calories, protein_g, carbs_g, fat_g, user_id')
    .gte('log_date', range.from).lte('log_date', range.to)
    .order('log_date', { ascending: true })
    .limit(100000)
  if (error) throw error

  const rows = data ?? []
  const byWeek: Record<string, NutritionReportRow & { _users: Set<string> }> = {}
  for (const l of rows) {
    const d = new Date(l.log_date as string)
    d.setDate(d.getDate() - d.getDay())
    const key = d.toISOString().slice(0, 10)
    if (!byWeek[key]) byWeek[key] = { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), entries: 0, calories: 0, protein: 0, carbs: 0, fat: 0, _users: new Set() }
    byWeek[key].entries++
    byWeek[key].calories += Number(l.calories) || 0
    byWeek[key].protein  += Number(l.protein_g) || 0
    byWeek[key].carbs    += Number(l.carbs_g) || 0
    byWeek[key].fat      += Number(l.fat_g) || 0
    byWeek[key]._users.add(l.user_id)
  }

  const timeline = Object.values(byWeek).sort((a, b) => a.date.localeCompare(b.date))
    .map(({ _users, ...r }) => ({ ...r, calories: Math.round(r.calories), protein: Math.round(r.protein), carbs: Math.round(r.carbs), fat: Math.round(r.fat) }))

  const n = rows.length || 1
  return {
    totalEntries: rows.length,
    avgCalories: Math.round(rows.reduce((s, r) => s + (Number(r.calories) || 0), 0) / n),
    avgProtein:  Math.round(rows.reduce((s, r) => s + (Number(r.protein_g) || 0), 0) / n),
    avgCarbs:    Math.round(rows.reduce((s, r) => s + (Number(r.carbs_g) || 0), 0) / n),
    avgFat:      Math.round(rows.reduce((s, r) => s + (Number(r.fat_g) || 0), 0) / n),
    activeUsers: new Set(rows.map((r) => r.user_id)).size, timeline,
  }
}

// ════════════════════════════════════════════════════════════════════
// AI USAGE REPORT
// ════════════════════════════════════════════════════════════════════

export interface AiReportRow { date: string; label: string; requests: number; successes: number; failures: number; tokens: number }
export interface AiReport { totalRequests: number; totalSuccesses: number; totalTokens: number; avgLatency: number; successRate: number; byFeature: Record<string, number>; byProvider: Record<string, number>; timeline: AiReportRow[] }

export async function fetchAiReport(range: DateRange): Promise<AiReport> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('created_at, success, total_tokens, latency_ms, feature, provider')
    .gte('created_at', toISO(range.from)).lte('created_at', toISO(range.to, true))
    .order('created_at', { ascending: true })
    .limit(200000)
  if (error) throw error

  const rows = data ?? []
  const byWeek: Record<string, AiReportRow & { _latencies: number[] }> = {}
  const byFeature: Record<string, number> = {}
  const byProvider: Record<string, number> = {}

  for (const r of rows) {
    const d = new Date(r.created_at as string)
    d.setDate(d.getDate() - d.getDay())
    const key = d.toISOString().slice(0, 10)
    if (!byWeek[key]) byWeek[key] = { date: key, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), requests: 0, successes: 0, failures: 0, tokens: 0, _latencies: [] }
    byWeek[key].requests++
    if (r.success) byWeek[key].successes++; else byWeek[key].failures++
    byWeek[key].tokens += r.total_tokens ?? 0
    if (r.latency_ms) byWeek[key]._latencies.push(r.latency_ms)
    byFeature[r.feature]  = (byFeature[r.feature] ?? 0) + 1
    byProvider[r.provider] = (byProvider[r.provider] ?? 0) + 1
  }

  const timeline = Object.values(byWeek).sort((a, b) => a.date.localeCompare(b.date)).map(({ _latencies, ...r }) => r)
  const totalSuccesses = rows.filter((r) => r.success).length
  const lats = rows.filter((r) => r.latency_ms).map((r) => r.latency_ms as number)

  return {
    totalRequests: rows.length, totalSuccesses, totalTokens: rows.reduce((s, r) => s + (r.total_tokens ?? 0), 0),
    avgLatency: lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0,
    successRate: rows.length ? Math.round((totalSuccesses / rows.length) * 100) : 0,
    byFeature, byProvider, timeline,
  }
}

// ════════════════════════════════════════════════════════════════════
// RETENTION REPORT
// ════════════════════════════════════════════════════════════════════

export interface RetentionBucket { label: string; registered: number; active_day7: number; active_day30: number; retention_day7: number; retention_day30: number }
export interface RetentionReport { overall7day: number; overall30day: number; buckets: RetentionBucket[] }

export async function fetchRetentionReport(range: DateRange): Promise<RetentionReport> {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, registration_date')
    .gte('registration_date', range.from).lte('registration_date', range.to)
    .order('registration_date', { ascending: true })
    .limit(50000)
  if (error) throw error

  if (!users?.length) return { overall7day: 0, overall30day: 0, buckets: [] }

  const userIds = users.map((u) => u.id)
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('user_id, session_date')
    .in('user_id', userIds)
    .limit(100000)

  const sessionsByUser: Record<string, Date[]> = {}
  for (const s of sessions ?? []) {
    if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = []
    sessionsByUser[s.user_id].push(new Date(s.session_date as string))
  }

  const byMonth: Record<string, { registered: number; active7: number; active30: number }> = {}
  for (const u of users) {
    const regDate = new Date(u.registration_date as string)
    const key = `${regDate.getFullYear()}-${String(regDate.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { registered: 0, active7: 0, active30: 0 }
    byMonth[key].registered++

    const userSessions = sessionsByUser[u.id] ?? []
    const cutoff7  = new Date(regDate.getTime() + 7 * 86400_000)
    const cutoff30 = new Date(regDate.getTime() + 30 * 86400_000)
    if (userSessions.some((d) => d >= regDate && d <= cutoff7))  byMonth[key].active7++
    if (userSessions.some((d) => d >= regDate && d <= cutoff30)) byMonth[key].active30++
  }

  const buckets: RetentionBucket[] = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => {
    const d = new Date(key + '-01')
    return {
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      registered: v.registered, active_day7: v.active7, active_day30: v.active30,
      retention_day7:  v.registered ? Math.round((v.active7  / v.registered) * 100) : 0,
      retention_day30: v.registered ? Math.round((v.active30 / v.registered) * 100) : 0,
    }
  })

  const totalReg   = buckets.reduce((s, b) => s + b.registered, 0)
  const totalA7    = buckets.reduce((s, b) => s + b.active_day7, 0)
  const totalA30   = buckets.reduce((s, b) => s + b.active_day30, 0)

  return {
    overall7day:  totalReg ? Math.round((totalA7  / totalReg) * 100) : 0,
    overall30day: totalReg ? Math.round((totalA30 / totalReg) * 100) : 0,
    buckets,
  }
}

// ════════════════════════════════════════════════════════════════════
// GROWTH REPORT
// ════════════════════════════════════════════════════════════════════

export interface GrowthRow { date: string; label: string; new_users: number; cumulative: number; new_subs: number; mrr: number }
export interface GrowthReport { totalNewUsers: number; totalNewSubs: number; totalMrr: number; peakMonth: string; timeline: GrowthRow[] }

export async function fetchGrowthReport(range: DateRange): Promise<GrowthReport> {
  const [usersRes, subsRes] = await Promise.all([
    supabase.from('users').select('id, registration_date').gte('registration_date', range.from).lte('registration_date', range.to).order('registration_date').limit(50000),
    supabase.from('user_subscriptions').select('user_id, created_at, status, plan_id').gte('created_at', toISO(range.from)).lte('created_at', toISO(range.to, true)).in('status', ['active', 'trialing']).limit(50000),
  ])

  const planIds = [...new Set((subsRes.data ?? []).map((s) => s.plan_id))]
  const planPrices: Record<string, number> = {}
  if (planIds.length) {
    const { data: plans } = await supabase.from('subscription_plans').select('id, price_monthly_usd').in('id', planIds)
    for (const p of plans ?? []) planPrices[p.id] = Number(p.price_monthly_usd)
  }

  const byMonth: Record<string, GrowthRow & { _users: number }> = {}

  for (const u of usersRes.data ?? []) {
    const d = new Date(u.registration_date as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { date: key, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), new_users: 0, cumulative: 0, new_subs: 0, mrr: 0, _users: 0 }
    byMonth[key].new_users++
  }

  for (const s of subsRes.data ?? []) {
    const d = new Date(s.created_at as string)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { date: key, label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), new_users: 0, cumulative: 0, new_subs: 0, mrr: 0, _users: 0 }
    byMonth[key].new_subs++
    byMonth[key].mrr += planPrices[s.plan_id] ?? 0
  }

  let cum = 0
  const timeline = Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date)).map(({ _users, ...r }) => { cum += r.new_users; return { ...r, cumulative: cum, mrr: Math.round(r.mrr) } })
  const peakRow   = timeline.reduce((a, b) => (b.new_users > a.new_users ? b : a), timeline[0] ?? { label: '—' })

  return {
    totalNewUsers: timeline.reduce((s, r) => s + r.new_users, 0),
    totalNewSubs:  timeline.reduce((s, r) => s + r.new_subs, 0),
    totalMrr:      timeline.length > 0 ? timeline[timeline.length - 1].mrr : 0,
    peakMonth:     peakRow?.label ?? '—', timeline,
  }
}
