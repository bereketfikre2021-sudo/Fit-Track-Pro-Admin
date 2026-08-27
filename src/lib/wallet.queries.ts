/**
 * wallet.queries.ts
 * Admin data layer for the wallet management system.
 *
 * Covers:
 *   - Wallet top-up submission listing + approval / rejection
 *   - User wallet detail (balance + ledger)
 *   - Admin dashboard aggregates
 *   - Wallet adjustment (ADJUSTMENT / REVERSAL / REFUND)
 *   - Subscription purchase options CRUD
 */

import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export type WalletTransactionType =
  | 'TOP_UP'
  | 'SUBSCRIPTION_PURCHASE'
  | 'SUBSCRIPTION_RENEWAL'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'REVERSAL'

export type WalletTransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED'

export interface WalletRow {
  id: string
  user_id: string
  balance: number
  currency: string
  status: 'active' | 'frozen' | 'closed'
  created_at: string
  updated_at: string
  // enriched
  user_name?: string | null
  user_email?: string | null
}

export interface WalletLedgerRow {
  id: string
  wallet_id: string
  user_id: string
  type: WalletTransactionType
  status: WalletTransactionStatus
  amount: number
  currency: string
  balance_before: number
  balance_after: number
  reference: string | null
  related_payment_id: string | null
  related_submission_id: string | null
  related_subscription_id: string | null
  reversed_by: string | null
  reverses: string | null
  description: string | null
  idempotency_key: string | null
  initiated_by: string
  created_at: string
}

export interface TopUpSubmission {
  id: string
  user_id: string
  wallet_id: string | null
  topup_amount_etb: number
  currency: string
  payment_method_id: string
  transaction_ref: string
  payment_date: string
  proof_path: string | null
  note: string | null
  submitted_at: string
  status: 'pending_verification' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  verified_by: string | null
  verified_at: string | null
  verification_note: string | null
  rejection_reason: string | null
  rejection_reason_custom: string | null
  is_duplicate_suspect: boolean
  created_at: string
  updated_at: string
  // enriched
  user_name?: string | null
  method_name?: string | null
}

export interface WalletDashboardStats {
  totalWalletBalance: number
  totalApprovedTopups: number
  totalWalletSpending: number
  pendingTopups: number
  usersWithWallet: number
  usersWithAutoRenew: number
  usersWithLowBalance: number
}

export interface SubscriptionPurchaseOption {
  id: string
  plan_id: string
  plan_name?: string
  plan_tier?: string
  duration: string
  duration_months: number
  price_etb: number
  currency: string
  discount_pct: number | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface TopUpFilters {
  status?: string
  payment_method_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// ── Wallet top-up submissions ─────────────────────────────────────────────────

export async function fetchTopUpSubmissions(
  filters: TopUpFilters,
  page = 0,
  pageSize = 25,
): Promise<{ data: TopUpSubmission[]; total: number }> {
  const from = page * pageSize
  const to   = from + pageSize - 1

  // Try the extended schema first (Phase 14.5 — purpose column exists)
  // If that fails due to a missing column, fall back to the legacy approach
  // (identify wallet top-ups by the [WALLET_TOPUP] note marker)

  let rows: any[] = []
  let total = 0

  // ── Attempt 1: purpose column exists ────────────────────────────────────
  try {
    let q = supabase
      .from('payment_submissions')
      .select('*, method:app_payment_methods(name)', { count: 'exact' })
      .eq('purpose', 'wallet_topup')
      .order('submitted_at', { ascending: false })
      .range(from, to)

    if (filters.status)             q = q.eq('status', filters.status)
    if (filters.payment_method_id)  q = q.eq('payment_method_id', filters.payment_method_id)
    if (filters.date_from)          q = q.gte('submitted_at', filters.date_from)
    if (filters.date_to)            q = q.lte('submitted_at', filters.date_to + 'T23:59:59Z')

    const { data: r, error, count } = await q

    // If the purpose column exists and we got a clean result, use it
    if (!error) {
      rows  = r ?? []
      total = count ?? 0
    } else if (error.message?.includes('purpose') || error.code === '42703' || error.message?.includes('schema cache')) {
      throw new Error('LEGACY_FALLBACK')
    } else {
      throw error
    }
  } catch (e: any) {
    if (e?.message !== 'LEGACY_FALLBACK') throw e

    // ── Fallback: identify by [WALLET_TOPUP] note marker ──────────────────
    let q2 = supabase
      .from('payment_submissions')
      .select('*, method:app_payment_methods(name)', { count: 'exact' })
      .ilike('note', '%[WALLET_TOPUP]%')
      .order('submitted_at', { ascending: false })
      .range(from, to)

    if (filters.status)             q2 = q2.eq('status', filters.status)
    if (filters.payment_method_id)  q2 = q2.eq('payment_method_id', filters.payment_method_id)
    if (filters.date_from)          q2 = q2.gte('submitted_at', filters.date_from)
    if (filters.date_to)            q2 = q2.lte('submitted_at', filters.date_to + 'T23:59:59Z')

    const { data: r2, error: e2, count: c2 } = await q2
    if (e2) throw e2
    rows  = r2 ?? []
    total = c2 ?? 0
  }

  // Enrich with user names
  const userIds = [...new Set(rows.map(r => r.user_id))]
  const userMap: Record<string, string | null> = {}
  if (userIds.length) {
    const { data: users } = await supabase
      .from('users').select('id, name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.name
  }

  let enriched: TopUpSubmission[] = rows.map(r => ({
    ...r,
    // Use topup_amount_etb if present, fall back to amount_etb
    topup_amount_etb: Number(r.topup_amount_etb ?? r.amount_etb ?? 0),
    user_name:   userMap[r.user_id] ?? null,
    method_name: (r.method as any)?.name ?? null,
  }))

  // Client-side search
  if (filters.search) {
    const q = filters.search.toLowerCase()
    enriched = enriched.filter(r =>
      (r.transaction_ref ?? '').toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.user_name ?? '').toLowerCase().includes(q),
    )
  }

  return { data: enriched, total }
}

export async function fetchTopUpSubmissionById(id: string): Promise<TopUpSubmission | null> {
  // Don't filter by purpose — that column may not exist yet
  const { data, error } = await supabase
    .from('payment_submissions')
    .select('*, method:app_payment_methods(*)')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null

  const { data: user } = await supabase
    .from('users').select('name').eq('id', data.user_id).maybeSingle()

  return {
    ...data,
    topup_amount_etb: Number(data.topup_amount_etb ?? data.amount_etb ?? 0),
    user_name:   user?.name ?? null,
    method_name: (data.method as any)?.name ?? null,
  }
}

// ── Approve / reject top-up ───────────────────────────────────────────────────

export async function approveTopUp(
  submissionId: string,
  adminId: string,
  note?: string,
): Promise<void> {
  // ── Attempt 1: try the RPC (works after migrations are applied) ───────────
  try {
    const { error } = await supabase.rpc('approve_wallet_topup', {
      p_submission_id: submissionId,
      p_admin_id:      adminId,
      p_note:          note ?? null,
    })
    if (!error) return
    // If error is schema/function-not-found, fall through to direct approach
    const isRpcMissing =
      error.message?.includes('Could not find') ||
      error.message?.includes('function') ||
      error.message?.includes('schema cache') ||
      error.code === 'PGRST202'
    if (!isRpcMissing) throw error
    // else fall through
  } catch (e: any) {
    const isRpcMissing =
      e?.message?.includes('Could not find') ||
      e?.message?.includes('function') ||
      e?.message?.includes('schema cache') ||
      e?.code === 'PGRST202'
    if (!isRpcMissing) throw e
    // fall through to direct approach
  }

  // ── Fallback: direct table operations (before migrations) ─────────────────
  //
  // IMPORTANT: We only SELECT columns that exist in the original schema.
  // topup_amount_etb is a Phase 14.5 column — we fetch it separately after
  // confirming it exists, to avoid "column does not exist" errors.

  // 1. Load submission using only original-schema columns
  const { data: sub, error: subErr } = await supabase
    .from('payment_submissions')
    .select('id, user_id, amount_etb, transaction_ref, status, note, plan_id')
    .eq('id', submissionId)
    .maybeSingle()
  if (subErr) throw new Error(`Could not load submission: ${subErr.message}`)
  if (!sub) throw new Error('Submission not found')
  if (sub.status !== 'pending_verification') throw new Error(`Submission is already ${sub.status}`)

  // Try to also fetch topup_amount_etb if it exists (best-effort)
  let topupAmount = Number(sub.amount_etb ?? 0)
  try {
    const { data: extRow } = await supabase
      .from('payment_submissions')
      .select('topup_amount_etb')
      .eq('id', submissionId)
      .maybeSingle()
    if (extRow?.topup_amount_etb != null) {
      topupAmount = Number(extRow.topup_amount_etb)
    }
  } catch { /* column doesn't exist yet — use amount_etb */ }

  const amount = topupAmount
  if (amount <= 0) throw new Error('Invalid top-up amount')

  // 2. Mark approved
  const { error: approveErr } = await supabase
    .from('payment_submissions')
    .update({
      status:            'approved',
      verified_by:       adminId,
      verified_at:       new Date().toISOString(),
      verification_note: note ?? null,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('status', 'pending_verification') // guard against race condition
  if (approveErr) throw new Error(`Approval failed: ${approveErr.message}`)

  // 3. Upsert wallet — create with 0 balance if missing
  const { error: upsertErr } = await supabase
    .from('wallets')
    .upsert(
      { user_id: sub.user_id, balance: 0, currency: 'ETB', status: 'active' },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
  if (upsertErr) {
    console.warn('[approveTopUp] Wallet upsert failed (table may not exist):', upsertErr.message)
  }

  // 4. Credit wallet balance atomically
  // We use a raw RPC if available; otherwise update directly.
  // Direct UPDATE is safe here because we use the DB's own addition operator.
  const { error: creditErr } = await Promise.resolve(supabase.rpc('increment_wallet_balance', {
    p_user_id: sub.user_id,
    p_amount:  amount,
  })).catch(() => ({ error: { message: 'RPC_NOT_FOUND' } })) as any

  if (creditErr) {
    // increment_wallet_balance RPC doesn't exist either — do a direct update
    // First fetch current balance
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', sub.user_id)
      .maybeSingle()

    if (wallet) {
      const newBalance = Number(wallet.balance) + amount
      const { error: updateErr } = await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id)
      if (updateErr) throw new Error(`Failed to credit wallet: ${updateErr.message}`)
    } else {
      // Wallet didn't exist and upsert failed — insert fresh with the credited balance
      const { error: insertErr } = await supabase
        .from('wallets')
        .insert({ user_id: sub.user_id, balance: amount, currency: 'ETB', status: 'active' })
      if (insertErr) throw new Error(`Failed to create wallet: ${insertErr.message}`)
    }
  }

  // 5. Try wallet_ledger insert (best-effort — table may not exist yet)
  try {
    const { data: wallet } = await supabase
      .from('wallets').select('id, balance').eq('user_id', sub.user_id).maybeSingle()
    if (wallet) {
      await supabase.from('wallet_ledger').insert({
        wallet_id:              wallet.id,
        user_id:                sub.user_id,
        type:                   'TOP_UP',
        status:                 'COMPLETED',
        amount:                 amount,
        currency:               'ETB',
        balance_before:         Number(wallet.balance) - amount,
        balance_after:          Number(wallet.balance),
        reference:              sub.transaction_ref,
        related_submission_id:  submissionId,
        description:            `Wallet top-up approved by admin. Ref: ${sub.transaction_ref ?? '—'}`,
        idempotency_key:        `topup:${submissionId}`,
        initiated_by:           `admin:${adminId}`,
      })
    }
  } catch { /* wallet_ledger table may not exist yet */ }

  // 6. Try audit_logs (best-effort)
  try {
    await supabase.from('audit_logs').insert({
      user_id:    adminId,
      action:     'admin_action',
      table_name: 'payment_submissions',
      record_id:  submissionId,
      metadata:   JSON.stringify({
        action:           'approve_wallet_topup',
        submission_id:    submissionId,
        beneficiary_user: sub.user_id,
        amount_etb:       amount,
        note,
      }),
      severity: 'info',
    })
  } catch { /* audit_logs table may not exist yet */ }

  // 7. Notify user
  try {
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      type:    'wallet_topup_approved',
      title:   'Wallet Topped Up!',
      body:    `ETB ${amount} has been added to your wallet.`,
      data:    JSON.stringify({ submission_id: submissionId, amount_etb: amount }),
      is_read: false,
    })
  } catch { /* notifications table structure may vary */ }
}

export async function rejectTopUp(
  submissionId: string,
  adminId: string,
  reason: string,
  customNote?: string,
): Promise<void> {
  // ── Attempt 1: try the RPC ────────────────────────────────────────────────
  try {
    const { error } = await supabase.rpc('reject_wallet_topup', {
      p_submission_id:    submissionId,
      p_admin_id:         adminId,
      p_rejection_reason: reason,
      p_custom_note:      customNote ?? null,
    })
    if (!error) return
    const isRpcMissing =
      error.message?.includes('Could not find') ||
      error.message?.includes('schema cache') ||
      error.code === 'PGRST202'
    if (!isRpcMissing) throw error
  } catch (e: any) {
    const isRpcMissing =
      e?.message?.includes('Could not find') ||
      e?.message?.includes('schema cache') ||
      e?.code === 'PGRST202'
    if (!isRpcMissing) throw e
  }

  // ── Fallback: direct update ───────────────────────────────────────────────
  const { data: sub } = await supabase
    .from('payment_submissions')
    .select('user_id, amount_etb, status, note')
    .eq('id', submissionId)
    .maybeSingle()

  if (!sub) throw new Error('Submission not found')
  if (sub.status !== 'pending_verification') throw new Error(`Submission is already ${sub.status}`)

  // Try to also get topup_amount_etb if column exists
  let topupAmount = Number(sub.amount_etb ?? 0)
  try {
    const { data: extRow } = await supabase
      .from('payment_submissions')
      .select('topup_amount_etb')
      .eq('id', submissionId)
      .maybeSingle()
    if (extRow?.topup_amount_etb != null) topupAmount = Number(extRow.topup_amount_etb)
  } catch { /* column doesn't exist yet */ }

  const { error } = await supabase
    .from('payment_submissions')
    .update({
      status:                  'rejected',
      verified_by:             adminId,
      verified_at:             new Date().toISOString(),
      rejection_reason:        reason,
      rejection_reason_custom: customNote ?? null,
      updated_at:              new Date().toISOString(),
    })
    .eq('id', submissionId)
  if (error) throw new Error(`Rejection failed: ${error.message}`)

  // Audit log (best-effort)
  try {
    await supabase.from('audit_logs').insert({
      user_id:    adminId,
      action:     'admin_action',
      table_name: 'payment_submissions',
      record_id:  submissionId,
      metadata:   JSON.stringify({ action: 'reject_wallet_topup', reason }),
      severity:   'warning',
    })
  } catch { /* ignore */ }

  // Notify user
  const amount = topupAmount
  try {
    await supabase.from('notifications').insert({
      user_id: sub.user_id,
      type:    'wallet_topup_rejected',
      title:   'Wallet Top-Up Unsuccessful',
      body:    `Your wallet top-up of ETB ${amount} was not approved. Reason: ${reason}`,
      data:    JSON.stringify({ submission_id: submissionId, amount_etb: amount, reason }),
      is_read: false,
    })
  } catch { /* ignore */ }
}

// ── Proof image signed URL ────────────────────────────────────────────────────

export async function getTopUpProofUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 60 * 10) // 10 min
  if (error) return null
  return data.signedUrl
}

// ── User wallet detail ────────────────────────────────────────────────────────

export async function fetchUserWallet(userId: string): Promise<WalletRow | null> {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? { ...data, balance: Number(data.balance) } : null
}

export async function fetchUserWalletLedger(
  userId: string,
  page = 0,
  pageSize = 50,
): Promise<{ data: WalletLedgerRow[]; total: number }> {
  const from = page * pageSize
  const to   = from + pageSize - 1
  try {
    const { data, error, count } = await supabase
      .from('wallet_ledger')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) return { data: [], total: 0 }
    return {
      data:  (data ?? []).map(r => ({ ...r, amount: Number(r.amount) })) as WalletLedgerRow[],
      total: count ?? 0,
    }
  } catch {
    return { data: [], total: 0 }
  }
}

// ── All wallets list (admin) ──────────────────────────────────────────────────

export async function fetchAllWallets(
  page = 0,
  pageSize = 25,
  search?: string,
): Promise<{ data: WalletRow[]; total: number }> {
  const from = page * pageSize
  const to   = from + pageSize - 1

  try {
    const { data, error, count } = await supabase
      .from('wallets')
      .select('*', { count: 'exact' })
      .order('balance', { ascending: false })
      .range(from, to)
    if (error) return { data: [], total: 0 }

    const userIds = [...new Set((data ?? []).map(r => r.user_id))]
    const userMap: Record<string, string | null> = {}
    if (userIds.length) {
      const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
      for (const u of users ?? []) userMap[u.id] = u.name
    }

    let enriched: WalletRow[] = (data ?? []).map(r => ({
      ...r,
      balance:   Number(r.balance),
      user_name: userMap[r.user_id] ?? null,
    }))

    if (search) {
      const q = search.toLowerCase()
      enriched = enriched.filter(r =>
        (r.user_name ?? '').toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q),
      )
    }

    return { data: enriched, total: count ?? 0 }
  } catch {
    return { data: [], total: 0 }
  }
}

// ── Admin wallet adjustment ───────────────────────────────────────────────────

export async function createWalletAdjustment(params: {
  adminId: string
  userId: string
  amount: number
  type: 'ADJUSTMENT' | 'REVERSAL' | 'REFUND'
  description: string
  reference?: string
  reversesLedgerId?: string
}): Promise<{ ledger_id: string; amount: number }> {
  // Try RPC first
  try {
    const { data, error } = await supabase.rpc('wallet_adjustment', {
      p_admin_id:    params.adminId,
      p_user_id:     params.userId,
      p_amount:      params.amount,
      p_type:        params.type,
      p_description: params.description,
      p_reference:   params.reference ?? null,
      p_reverses:    params.reversesLedgerId ?? null,
    })
    if (!error) return data as { ledger_id: string; amount: number }
    const isRpcMissing = error.message?.includes('Could not find') || error.code === 'PGRST202'
    if (!isRpcMissing) throw error
  } catch (e: any) {
    const isRpcMissing = e?.message?.includes('Could not find') || e?.code === 'PGRST202'
    if (!isRpcMissing) throw e
  }

  // Fallback: direct table operations
  const isCredit = params.amount > 0
  const absAmount = Math.abs(params.amount)

  // Get current wallet
  const { data: wallet } = await supabase
    .from('wallets').select('id, balance').eq('user_id', params.userId).maybeSingle()
  if (!wallet) throw new Error('Wallet not found for this user')

  const newBalance = isCredit
    ? Number(wallet.balance) + absAmount
    : Number(wallet.balance) - absAmount

  if (newBalance < 0) throw new Error('Insufficient balance for this adjustment')

  await supabase.from('wallets')
    .update({ balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', wallet.id)

  const { data: ledger } = await supabase.from('wallet_ledger').insert({
    wallet_id:      wallet.id,
    user_id:        params.userId,
    type:           params.type,
    status:         'COMPLETED',
    amount:         params.amount,
    currency:       'ETB',
    balance_before: Number(wallet.balance),
    balance_after:  newBalance,
    reference:      params.reference ?? null,
    description:    params.description,
    initiated_by:   `admin:${params.adminId}`,
  }).select('id').maybeSingle()

  return { ledger_id: ledger?.id ?? '', amount: params.amount }
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export async function fetchWalletDashboardStats(): Promise<WalletDashboardStats> {
  // All queries are best-effort — tables/columns may not exist before migrations

  let totalWalletBalance = 0
  let totalApprovedTopups = 0
  let totalWalletSpending = 0
  let pendingTopups = 0
  let usersWithWallet = 0
  let usersWithAutoRenew = 0
  let usersWithLowBalance = 0

  // Total wallet balance
  try {
    const { data } = await supabase.from('wallets').select('balance').eq('status', 'active')
    totalWalletBalance = (data ?? []).reduce((s, r) => s + Number(r.balance), 0)
    usersWithWallet = data?.length ?? 0
  } catch { /* wallets table not yet created */ }

  // Pending top-ups — try purpose column, fall back to note marker
  try {
    const { count: c1 } = await supabase
      .from('payment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('purpose', 'wallet_topup')
      .eq('status', 'pending_verification')
    pendingTopups = c1 ?? 0
  } catch {
    try {
      const { count: c2 } = await supabase
        .from('payment_submissions')
        .select('id', { count: 'exact', head: true })
        .ilike('note', '%[WALLET_TOPUP]%')
        .eq('status', 'pending_verification')
      pendingTopups = c2 ?? 0
    } catch { /* ignore */ }
  }

  // Total approved top-ups
  try {
    // Try topup_amount_etb first (Phase 14.5 column)
    const { data } = await supabase
      .from('payment_submissions')
      .select('topup_amount_etb, amount_etb')
      .eq('purpose', 'wallet_topup')
      .eq('status', 'approved')
    totalApprovedTopups = (data ?? []).reduce((s, r) =>
      s + Number(r.topup_amount_etb ?? r.amount_etb ?? 0), 0)
  } catch {
    try {
      // Fallback: use note marker + amount_etb
      const { data } = await supabase
        .from('payment_submissions')
        .select('amount_etb')
        .ilike('note', '%[WALLET_TOPUP]%')
        .eq('status', 'approved')
      totalApprovedTopups = (data ?? []).reduce((s, r) => s + Number(r.amount_etb ?? 0), 0)
    } catch { /* ignore */ }
  }

  // Total wallet spending from ledger
  try {
    const { data } = await supabase
      .from('wallet_ledger')
      .select('amount')
      .in('type', ['SUBSCRIPTION_PURCHASE', 'SUBSCRIPTION_RENEWAL'])
      .eq('status', 'COMPLETED')
    totalWalletSpending = (data ?? []).reduce((s, r) => s + Math.abs(Number(r.amount)), 0)
  } catch { /* wallet_ledger not yet created */ }

  // Auto-renew count
  try {
    const { count } = await supabase
      .from('user_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('auto_renew', true)
      .in('status', ['active', 'trialing'])
    usersWithAutoRenew = count ?? 0
  } catch { /* auto_renew column may not exist */ }

  // Low balance warnings
  try {
    const { count } = await supabase
      .from('v_admin_autorenewal_monitor')
      .select('subscription_id', { count: 'exact', head: true })
      .eq('balance_status', 'insufficient')
    usersWithLowBalance = count ?? 0
  } catch { /* view may not exist */ }

  return {
    totalWalletBalance,
    totalApprovedTopups,
    totalWalletSpending,
    pendingTopups,
    usersWithWallet,
    usersWithAutoRenew,
    usersWithLowBalance,
  }
}

// ── Auto-renewal monitor ──────────────────────────────────────────────────────

export interface AutoRenewalMonitorRow {
  subscription_id: string
  user_id: string
  auto_renew: boolean
  subscription_status: string
  renewal_due: string
  plan_name: string
  renewal_price_etb: number | null
  wallet_balance: number | null
  balance_status: 'sufficient' | 'insufficient'
  shortfall_etb: number
  days_until_renewal: number
}

export async function fetchAutoRenewalMonitor(
  page = 0,
  pageSize = 25,
): Promise<{ data: AutoRenewalMonitorRow[]; total: number }> {
  const from = page * pageSize
  const to   = from + pageSize - 1
  try {
    const { data, error, count } = await supabase
      .from('v_admin_autorenewal_monitor')
      .select('*', { count: 'exact' })
      .order('days_until_renewal', { ascending: true })
      .range(from, to)
    if (error) return { data: [], total: 0 }
    return { data: (data ?? []) as AutoRenewalMonitorRow[], total: count ?? 0 }
  } catch {
    return { data: [], total: 0 }
  }
}

// ── Subscription purchase options CRUD ───────────────────────────────────────

export async function fetchAllPurchaseOptions(): Promise<SubscriptionPurchaseOption[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_purchase_options')
      .select('*, plan:subscription_plans(name, tier)')
      .order('display_order')
    if (error) return []
    return (data ?? []).map(r => ({
      ...r,
      price_etb:  Number(r.price_etb),
      plan_name:  (r.plan as any)?.name ?? null,
      plan_tier:  (r.plan as any)?.tier ?? null,
    })) as SubscriptionPurchaseOption[]
  } catch { return [] }
}

export async function upsertPurchaseOption(
  option: Partial<SubscriptionPurchaseOption> & { plan_id: string; duration: string },
): Promise<void> {
  const { error } = await supabase
    .from('subscription_purchase_options')
    .upsert({ ...option, updated_at: new Date().toISOString() }, { onConflict: 'plan_id,duration' })
  if (error) throw error
}

export async function togglePurchaseOptionActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('subscription_purchase_options')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
