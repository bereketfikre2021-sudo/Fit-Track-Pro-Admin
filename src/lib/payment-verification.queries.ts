/**
 * payment-verification.queries.ts
 * Admin data layer for the manual payment verification system.
 */

import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubmissionStatus =
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired'

export interface AppPaymentMethod {
  id: string
  name: string
  type: 'bank' | 'mobile_money' | 'other'
  account_name: string | null
  account_number: string | null
  phone_number: string | null
  instructions: string | null
  logo_url: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface PaymentSubmission {
  id: string
  user_id: string
  plan_id: string
  payment_method_id: string
  amount_etb: number
  currency: string
  transaction_ref: string
  payment_date: string
  proof_path: string | null
  note: string | null
  submitted_at: string
  status: SubmissionStatus
  verified_by: string | null
  verified_at: string | null
  verification_note: string | null
  rejection_reason: string | null
  rejection_reason_custom: string | null
  subscription_id: string | null
  is_duplicate_suspect: boolean
  duplicate_of: string | null
  created_at: string
  updated_at: string
  // joined
  user_name?: string | null
  user_email?: string | null
  plan_name?: string | null
  plan_tier?: string | null
  method_name?: string | null
}

export interface SubmissionFilters {
  status?: SubmissionStatus | ''
  payment_method_id?: string
  plan_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// ── Payment methods CRUD ──────────────────────────────────────────────────────

export async function fetchPaymentMethods(): Promise<AppPaymentMethod[]> {
  const { data, error } = await supabase
    .from('app_payment_methods')
    .select('*')
    .order('display_order')
  if (error) throw error
  return data ?? []
}

export async function upsertPaymentMethod(
  method: Omit<AppPaymentMethod, 'created_at' | 'updated_at'>
): Promise<void> {
  const { error } = await supabase
    .from('app_payment_methods')
    .upsert({ ...method, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw error
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const { error } = await supabase.from('app_payment_methods').delete().eq('id', id)
  if (error) throw error
}

// ── Payment submissions ───────────────────────────────────────────────────────

export async function fetchSubmissions(
  filters: SubmissionFilters,
  page = 0,
  pageSize = 25
): Promise<{ data: PaymentSubmission[]; total: number }> {
  const from = page * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('payment_submissions')
    .select(
      `*, 
       plan:subscription_plans(name,tier),
       method:app_payment_methods(name)`,
      { count: 'exact' }
    )
    .order('submitted_at', { ascending: false })
    .range(from, to)

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.payment_method_id) q = q.eq('payment_method_id', filters.payment_method_id)
  if (filters.plan_id) q = q.eq('plan_id', filters.plan_id)
  if (filters.date_from) q = q.gte('submitted_at', filters.date_from)
  if (filters.date_to) q = q.lte('submitted_at', filters.date_to + 'T23:59:59Z')

  const { data: rows, error, count } = await q
  if (error) throw error

  // Enrich with user info
  const userIds = [...new Set((rows ?? []).map(r => r.user_id))]
  const userMap: Record<string, { name: string; email: string }> = {}
  if (userIds.length) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = { name: u.name, email: '' }
  }

  const enriched: PaymentSubmission[] = (rows ?? []).map(r => ({
    ...r,
    plan_name: (r.plan as any)?.name ?? null,
    plan_tier: (r.plan as any)?.tier ?? null,
    method_name: (r.method as any)?.name ?? null,
    user_name: userMap[r.user_id]?.name ?? null,
    user_email: userMap[r.user_id]?.email ?? null,
  }))

  // Apply search filter client-side (name/email/ref/id)
  const filtered = filters.search
    ? enriched.filter(r => {
        const q = filters.search!.toLowerCase()
        return (
          r.transaction_ref.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          (r.user_name ?? '').toLowerCase().includes(q) ||
          (r.user_email ?? '').toLowerCase().includes(q)
        )
      })
    : enriched

  return { data: filtered, total: count ?? 0 }
}

export async function fetchSubmissionById(id: string): Promise<PaymentSubmission | null> {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`*, plan:subscription_plans(name,tier,price_monthly_usd), method:app_payment_methods(*)`)
    .eq('id', id)
    .single()
  if (error) return null

  const { data: user } = await supabase
    .from('users')
    .select('name')
    .eq('id', data.user_id)
    .single()

  return {
    ...data,
    plan_name: (data.plan as any)?.name,
    plan_tier: (data.plan as any)?.tier,
    method_name: (data.method as any)?.name,
    user_name: user?.name ?? null,
  }
}

// ── Admin actions (call RPCs) ─────────────────────────────────────────────────

export async function approveSubmission(
  submissionId: string,
  adminId: string,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc('approve_payment_submission', {
    p_submission_id: submissionId,
    p_admin_id: adminId,
    p_note: note ?? null,
  })
  if (error) throw error
}

export async function rejectSubmission(
  submissionId: string,
  adminId: string,
  reason: string,
  customNote?: string
): Promise<void> {
  const { error } = await supabase.rpc('reject_payment_submission', {
    p_submission_id: submissionId,
    p_admin_id: adminId,
    p_rejection_reason: reason,
    p_custom_note: customNote ?? null,
  })
  if (error) throw error
}

export async function cancelSubmission(submissionId: string, adminId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_payment_submission', {
    p_submission_id: submissionId,
    p_admin_id: adminId,
  })
  if (error) throw error
}

// ── Get signed URL for a private proof screenshot ────────────────────────────
export async function getProofSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 10) // 10 min expiry
  if (error) return null
  return data.signedUrl
}

// ── Admin statistics ──────────────────────────────────────────────────────────
export interface PaymentStats {
  pending: number
  approvedToday: number
  rejectedToday: number
  totalApproved: number
  totalRevenue: number
  revenueByMethod: { name: string; total: number }[]
  revenueByPlan: { name: string; total: number }[]
}

export async function fetchPaymentStats(): Promise<PaymentStats> {
  const today = new Date().toISOString().slice(0, 10)

  const [pendingRes, approvedTodayRes, rejectedTodayRes, totalApprovedRes, revenueRes] =
    await Promise.all([
      supabase.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending_verification'),
      supabase.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('verified_at', today),
      supabase.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'rejected').gte('verified_at', today),
      supabase.from('payment_submissions').select('id,amount_etb,plan_id,payment_method_id,plan:subscription_plans(name),method:app_payment_methods(name)').eq('status', 'approved'),
      // Revenue comes from confirmed payments table only (status=succeeded)
      supabase.from('payments').select('amount_usd,currency').eq('status', 'succeeded'),
    ])

  const approved = totalApprovedRes.data ?? []
  // Authoritative revenue: sum from payments table (succeeded only)
  const totalRevenue = (revenueRes.data ?? []).reduce((s, r) => s + Number(r.amount_usd), 0)

  const byMethod: Record<string, number> = {}
  const byPlan: Record<string, number> = {}
  for (const r of approved) {
    const mn = (r.method as any)?.name ?? 'Unknown'
    const pn = (r.plan as any)?.name ?? 'Unknown'
    byMethod[mn] = (byMethod[mn] ?? 0) + Number(r.amount_etb)
    byPlan[pn] = (byPlan[pn] ?? 0) + Number(r.amount_etb)
  }

  return {
    pending: pendingRes.count ?? 0,
    approvedToday: approvedTodayRes.count ?? 0,
    rejectedToday: rejectedTodayRes.count ?? 0,
    totalApproved: approved.length,
    totalRevenue,
    revenueByMethod: Object.entries(byMethod).map(([name, total]) => ({ name, total })),
    revenueByPlan: Object.entries(byPlan).map(([name, total]) => ({ name, total })),
  }
}
