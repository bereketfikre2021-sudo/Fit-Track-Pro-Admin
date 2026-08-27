/**
 * PaymentVerificationPage.tsx
 * Admin — Payments
 *
 * 3 top-level tabs:
 *   submissions   → Subscription payment submissions
 *   wallets       → All wallet management (inner sub-tabs)
 *   methods       → Payment method configuration
 *
 * "User Wallets" inner sub-tabs:
 *   topups        → Wallet top-up verification (approve / reject)
 *   balances      → All user wallets + ledger + adjustment
 *   autorenewal   → Auto-renewal monitor
 *   options       → Subscription pricing options
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Search, RefreshCw, Clock, CheckCircle2, XCircle,
  AlertTriangle, Eye, Plus, Pencil, Trash2, ArrowUp, ArrowDown,
  EyeOff, CreditCard, Wallet, RotateCcw, Tag, Users, TrendingUp,
  TrendingDown, AlertCircle, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { PageShell }     from '@/components/layout/PageShell'
import { Badge }         from '@/components/ui/Badge'
import { Button }        from '@/components/ui/Button'
import { Spinner }       from '@/components/ui/Spinner'
import { Pagination }    from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Modal }         from '@/components/ui/Modal'
import { Input }         from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PermissionGate } from '@/components/guards/PermissionGate'
import { formatDate }    from '@/lib/utils'
import { toast }         from 'sonner'
import { supabase }      from '@/lib/supabase'
import { useAuth }       from '@/contexts/AuthContext'
import {
  fetchSubmissions, fetchPaymentMethods, fetchPaymentStats,
  upsertPaymentMethod, deletePaymentMethod,
  type SubmissionFilters, type AppPaymentMethod,
} from '@/lib/payment-verification.queries'
import {
  fetchTopUpSubmissions, fetchTopUpSubmissionById,
  approveTopUp, rejectTopUp, getTopUpProofUrl,
  fetchAllWallets, fetchUserWalletLedger,
  fetchWalletDashboardStats, fetchAutoRenewalMonitor,
  fetchAllPurchaseOptions, upsertPurchaseOption, togglePurchaseOptionActive,
  createWalletAdjustment,
  type TopUpFilters, type SubscriptionPurchaseOption,
} from '@/lib/wallet.queries'

// ── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger' | 'outline' | 'info'> = {
  pending_verification: 'warning',
  approved:  'success',
  rejected:  'danger',
  cancelled: 'outline',
  expired:   'info',
}

const PAGE_SIZE = 25

const fmtEtb = (n: number | null | undefined) =>
  n == null ? '—' : `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`

const fmtSigned = (n: number) => {
  const abs = `ETB ${Math.abs(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
  return n >= 0 ? `+${abs}` : `−${abs}`
}

// ── Outer tab definitions ─────────────────────────────────────────────────────

const OUTER_TABS = [
  { id: 'submissions', label: 'Submissions',   icon: ShieldCheck },
  { id: 'wallets',     label: 'User Wallets',  icon: Wallet },
  { id: 'methods',     label: 'Pay Methods',   icon: CreditCard },
]

// ── Inner (wallet) sub-tab definitions ───────────────────────────────────────

const WALLET_TABS = [
  { id: 'topups',      label: 'Top-Up Verification', icon: ShieldCheck },
  { id: 'balances',    label: 'Wallets',              icon: Users },
  { id: 'autorenewal', label: 'Auto-Renewal',         icon: RotateCcw },
  { id: 'options',     label: 'Pricing Options',      icon: Tag },
]

// ═════════════════════════════════════════════════════════════════════════════
// Wallet stats bar (shown above the inner wallet tabs)
// ═════════════════════════════════════════════════════════════════════════════

function WalletStatsBar() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['wallet-stats'],
    queryFn:  fetchWalletDashboardStats,
    staleTime: 1000 * 60,
  })
  if (isLoading) return <div className="h-20 flex items-center justify-center"><Spinner /></div>
  if (!stats) return null

  const cards = [
    { label: 'Total Balances',   value: fmtEtb(stats.totalWalletBalance),  icon: Wallet,       color: 'text-primary' },
    { label: 'Approved Top-Ups', value: fmtEtb(stats.totalApprovedTopups), icon: TrendingUp,   color: 'text-emerald-400' },
    { label: 'Wallet Spending',  value: fmtEtb(stats.totalWalletSpending), icon: TrendingDown, color: 'text-blue-400' },
    { label: 'Pending Top-Ups',  value: stats.pendingTopups,               icon: Clock,        color: 'text-amber-400' },
    { label: 'Users w/ Wallet',  value: stats.usersWithWallet,             icon: Users,        color: 'text-muted-foreground' },
    { label: 'Auto-Renew ON',    value: stats.usersWithAutoRenew,          icon: RotateCcw,    color: 'text-primary' },
    { label: 'Low Balance',      value: stats.usersWithLowBalance,         icon: AlertCircle,  color: 'text-orange-400' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1.5">
          <c.icon className={`h-4 w-4 ${c.color} opacity-80`} />
          <p className={`text-sm font-bold tabular-nums ${c.color}`}>{c.value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// OUTER TAB 1 — Subscription Submissions
// ═════════════════════════════════════════════════════════════════════════════

function SubmissionsTab() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<SubmissionFilters>({})
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(0)
  const activeFilters: SubmissionFilters = { ...filters, search: search || undefined }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payment-submissions', activeFilters, page],
    queryFn:  () => fetchSubmissions(activeFilters, page, PAGE_SIZE),
    placeholderData: p => p,
  })
  const { data: methods = [] } = useQuery({ queryKey: ['app-payment-methods'], queryFn: fetchPaymentMethods })
  const { data: plans   = [] } = useQuery({
    queryKey: ['subscription-plans-list'],
    queryFn:  async () => {
      const { data } = await supabase.from('subscription_plans').select('id,name').eq('is_active', true).order('name')
      return data ?? []
    },
  })
  const { data: stats } = useQuery({ queryKey: ['payment-stats'], queryFn: fetchPaymentStats, staleTime: 1000 * 60 })

  const setFilter = (key: keyof SubmissionFilters, val: string) => {
    setFilters(f => ({ ...f, [key]: val || undefined })); setPage(0)
  }

  return (
    <div className="space-y-5 pt-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending',        value: stats.pending,       icon: Clock,        color: 'text-amber-400' },
            { label: 'Approved Today', value: stats.approvedToday, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Rejected Today', value: stats.rejectedToday, icon: XCircle,      color: 'text-red-400' },
            { label: 'Total Revenue',  value: `ETB ${stats.totalRevenue.toLocaleString('en-ET', { minimumFractionDigits: 0 })}`, icon: ShieldCheck, color: 'text-primary' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <s.icon className={`h-7 w-7 ${s.color} opacity-80`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search name, ref, ID…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <select value={filters.status ?? ''} onChange={e => setFilter('status', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">All statuses</option>
          <option value="pending_verification">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select value={filters.payment_method_id ?? ''} onChange={e => setFilter('payment_method_id', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">All methods</option>
          {methods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filters.plan_id ?? ''} onChange={e => setFilter('plan_id', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="">All plans</option>
          {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <input type="date" value={filters.date_from ?? ''} onChange={e => setFilter('date_from', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" value={filters.date_to ?? ''} onChange={e => setFilter('date_to', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Ref #</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.data ?? []).map(sub => (
                  <tr key={sub.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium truncate max-w-[140px]">{sub.user_name ?? <span className="text-muted-foreground italic">—</span>}</div>
                      <div className="text-xs text-muted-foreground">{sub.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{sub.plan_name}</div>
                      <div className="text-xs text-muted-foreground uppercase">{sub.plan_tier}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      ETB {Number(sub.amount_etb).toLocaleString('en-ET', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{sub.method_name}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground font-mono text-xs">{sub.transaction_ref}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{formatDate(sub.submitted_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <Badge variant={STATUS_BADGE[sub.status] ?? 'outline'}>{sub.status.replace('_', ' ')}</Badge>
                        {sub.is_duplicate_suspect && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" /> Duplicate?
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => navigate(`/payments/review/${sub.id}`)}>Review</Button>
                    </td>
                  </tr>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No submissions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// OUTER TAB 2 — User Wallets (with inner sub-tabs)
// ═════════════════════════════════════════════════════════════════════════════

// ── Inner sub-tab A: Top-Up Verification ────────────────────────────────────

function TopUpsSubTab() {
  const { user: admin } = useAuth()
  const qc = useQueryClient()
  const [filters, setFilters] = useState<TopUpFilters>({})
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(0)

  const [reviewId,      setReviewId]      = useState<string | null>(null)
  const [reviewSub,     setReviewSub]     = useState<any>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [proofUrl,      setProofUrl]      = useState<string | null>(null)
  const [approveNote,   setApproveNote]   = useState('')
  const [rejectReason,  setRejectReason]  = useState('')
  const [actioning,     setActioning]     = useState<'approve' | 'reject' | null>(null)

  const activeFilters = { ...filters, search: search || undefined }
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['wallet-topups', activeFilters, page],
    queryFn:  () => fetchTopUpSubmissions(activeFilters, page, PAGE_SIZE),
    placeholderData: p => p,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['wallet-topups'] })
    qc.invalidateQueries({ queryKey: ['wallet-stats'] })
    qc.invalidateQueries({ queryKey: ['payment-stats'] })
    qc.invalidateQueries({ queryKey: ['wallet-list'] })
  }

  const openReview = async (id: string) => {
    setReviewId(id); setReviewSub(null); setProofUrl(null)
    setApproveNote(''); setRejectReason(''); setReviewLoading(true)
    try {
      const sub = await fetchTopUpSubmissionById(id)
      setReviewSub(sub)
      if (sub?.proof_path) setProofUrl(await getTopUpProofUrl(sub.proof_path))
    } catch { /* ignore */ }
    finally { setReviewLoading(false) }
  }

  const handleApprove = async () => {
    if (!admin?.id || !reviewId) return
    setActioning('approve')
    try {
      await approveTopUp(reviewId, admin.id, approveNote || undefined)
      toast.success('Top-up approved — wallet credited')
      invalidate(); setReviewId(null)
    } catch (e) { toast.error((e as Error).message) }
    finally { setActioning(null) }
  }

  const handleReject = async () => {
    if (!admin?.id || !reviewId) return
    if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return }
    setActioning('reject')
    try {
      await rejectTopUp(reviewId, admin.id, rejectReason)
      toast.success('Top-up rejected')
      invalidate(); setReviewId(null)
    } catch (e) { toast.error((e as Error).message) }
    finally { setActioning(null) }
  }

  const isPending = reviewSub?.status === 'pending_verification'

  return (
    <div className="space-y-5">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search user, reference…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <select value={filters.status ?? ''}
          onChange={e => { setFilters(f => ({ ...f, status: e.target.value || undefined })); setPage(0) }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none">
          <option value="">All statuses</option>
          <option value="pending_verification">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex items-center gap-1">
          <input type="date" value={filters.date_from ?? ''}
            onChange={e => setFilters(f => ({ ...f, date_from: e.target.value || undefined }))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none" />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" value={filters.date_to ?? ''}
            onChange={e => setFilters(f => ({ ...f, date_to: e.target.value || undefined }))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none" />
        </div>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Submitted</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.data ?? []).map(sub => (
                  <tr key={sub.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium truncate max-w-[140px]">{sub.user_name ?? <span className="italic text-muted-foreground">—</span>}</div>
                      <div className="text-xs text-muted-foreground">{sub.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-primary">{fmtEtb(sub.topup_amount_etb)}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{sub.method_name}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground font-mono text-xs">{sub.transaction_ref}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{formatDate(sub.submitted_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <Badge variant={STATUS_BADGE[sub.status] ?? 'outline'}>{sub.status.replace('_', ' ')}</Badge>
                        {sub.is_duplicate_suspect && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Duplicate?</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => openReview(sub.id)}>Review</Button>
                    </td>
                  </tr>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No wallet top-up submissions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}

      {/* Review modal */}
      <Modal open={!!reviewId} onClose={() => setReviewId(null)} title="Review Wallet Top-Up" size="sm">
        {reviewLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : !reviewSub ? (
          <p className="text-sm text-muted-foreground text-center py-8">Submission not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_BADGE[reviewSub.status] ?? 'outline'}>{reviewSub.status.replace('_', ' ')}</Badge>
              {reviewSub.is_duplicate_suspect && (
                <span className="text-xs text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Possible duplicate</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm rounded-xl bg-muted/30 p-3">
              <div><p className="text-xs text-muted-foreground">User</p><p className="font-semibold">{reviewSub.user_name ?? reviewSub.user_id?.slice(0, 12)}</p></div>
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-primary">{fmtEtb(reviewSub.topup_amount_etb)}</p></div>
              <div><p className="text-xs text-muted-foreground">Method</p><p className="font-semibold">{reviewSub.method_name ?? '—'}</p></div>
              <div><p className="text-xs text-muted-foreground">Reference</p><p className="font-mono text-xs font-semibold">{reviewSub.transaction_ref}</p></div>
              <div><p className="text-xs text-muted-foreground">Payment Date</p><p className="font-semibold">{formatDate(reviewSub.payment_date)}</p></div>
              <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-semibold">{formatDate(reviewSub.submitted_at)}</p></div>
              {reviewSub.note && <div className="col-span-2"><p className="text-xs text-muted-foreground">Note</p><p className="text-sm italic">{reviewSub.note}</p></div>}
            </div>
            {reviewSub.proof_path && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Payment Screenshot</p>
                {proofUrl ? (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <img src={proofUrl} alt="proof" className="w-full max-h-72 object-contain" />
                    <a href={proofUrl} target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 text-xs text-primary hover:underline border-t border-border/50">
                      <Eye className="h-3.5 w-3.5" /> Open full size
                    </a>
                  </div>
                ) : <p className="text-xs text-muted-foreground">Loading screenshot…</p>}
              </div>
            )}
            {isPending ? (
              <>
                <Input label="Verification note (optional)" value={approveNote}
                  onChange={e => setApproveNote(e.target.value)} placeholder="e.g. Verified with CBE portal" />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Rejection reason (required to reject)</label>
                  <textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                    placeholder="e.g. Screenshot unclear, amount mismatch…"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none resize-none" />
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-400 flex items-start gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Approving will immediately credit {fmtEtb(reviewSub.topup_amount_etb)} to the user's wallet.
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setReviewId(null)} disabled={!!actioning}>Cancel</Button>
                  <Button variant="destructive" onClick={handleReject} loading={actioning === 'reject'} disabled={actioning === 'approve'}>Reject</Button>
                  <Button onClick={handleApprove} loading={actioning === 'approve'} disabled={actioning === 'reject'}>
                    Approve — Credit {fmtEtb(reviewSub.topup_amount_etb)}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {reviewSub.verification_note && <p className="text-sm text-muted-foreground"><span className="font-medium">Note:</span> {reviewSub.verification_note}</p>}
                {reviewSub.rejection_reason && <p className="text-sm text-destructive"><span className="font-medium">Rejection:</span> {reviewSub.rejection_reason}</p>}
                <div className="flex justify-end"><Button variant="outline" onClick={() => setReviewId(null)}>Close</Button></div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Inner sub-tab B: Wallet Balances ─────────────────────────────────────────

function AdjustmentModal({ userId, userName, onClose }: {
  userId: string | null; userName: string | null; onClose: () => void
}) {
  const { user: admin } = useAuth()
  const qc = useQueryClient()
  const [amount, setAmount]           = useState('')
  const [type, setType]               = useState<'ADJUSTMENT' | 'REVERSAL' | 'REFUND'>('ADJUSTMENT')
  const [description, setDescription] = useState('')
  const [saving, setSaving]           = useState(false)

  const handle = async () => {
    if (!admin?.id || !userId) return
    const n = parseFloat(amount)
    if (isNaN(n) || n === 0) { toast.error('Enter a non-zero amount (negative = debit)'); return }
    if (!description.trim()) { toast.error('Description is required'); return }
    setSaving(true)
    try {
      await createWalletAdjustment({ adminId: admin.id, userId, amount: n, type, description: description.trim() })
      toast.success(`${type} applied: ${fmtSigned(n)}`)
      qc.invalidateQueries({ queryKey: ['wallet-list'] })
      qc.invalidateQueries({ queryKey: ['wallet-stats'] })
      qc.invalidateQueries({ queryKey: ['user-wallet-ledger', userId] })
      onClose()
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={!!userId} onClose={onClose} title="Wallet Adjustment" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">User: <strong className="text-foreground">{userName ?? userId}</strong></p>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400 flex items-start gap-2">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Adjustments are immutable and create a full audit trail. Negative amounts debit the balance.
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <select value={type} onChange={e => setType(e.target.value as any)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none">
            <option value="ADJUSTMENT">ADJUSTMENT (balance correction)</option>
            <option value="REFUND">REFUND (manual refund credit)</option>
            <option value="REVERSAL">REVERSAL (reverses prior transaction)</option>
          </select>
        </div>
        <Input label="Amount (ETB, negative for debit)" type="number" step="0.01"
          value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 100 or -50" />
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description *</label>
          <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Reason for this adjustment…"
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none resize-none" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handle} loading={saving}>Apply {type}</Button>
        </div>
      </div>
    </Modal>
  )
}

function BalancesSubTab() {
  const [page, setPage]   = useState(0)
  const [search, setSearch] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<{ userId: string; name: string | null } | null>(null)
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['wallet-list', page, search],
    queryFn:  () => fetchAllWallets(page, PAGE_SIZE, search || undefined),
    placeholderData: p => p,
  })
  const { data: ledger } = useQuery({
    queryKey: ['user-wallet-ledger', ledgerUserId],
    queryFn:  () => fetchUserWalletLedger(ledgerUserId!, 0, 20),
    enabled:  !!ledgerUserId,
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search by user name or ID…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Balance</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Currency</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.data ?? []).map(w => (
                  <tr key={w.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{w.user_name ?? <span className="italic text-muted-foreground">—</span>}</div>
                      <div className="text-xs text-muted-foreground">{w.user_id.slice(0, 10)}…</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-primary">{fmtEtb(w.balance)}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{w.currency}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant={w.status === 'active' ? 'success' : w.status === 'frozen' ? 'warning' : 'outline'}>{w.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{formatDate(w.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <PermissionGate permission="payments.verify">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setLedgerUserId(w.user_id)} title="View ledger"
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setAdjustTarget({ userId: w.user_id, name: w.user_name ?? null })} title="Adjust balance"
                            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No wallets found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}

      {/* Ledger mini-panel */}
      {ledgerUserId && ledger && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Ledger — {ledgerUserId.slice(0, 12)}…</p>
            <button onClick={() => setLedgerUserId(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground">Balance After</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {ledger.data.map(tx => (
                  <tr key={tx.id} className={tx.status === 'REVERSED' ? 'opacity-50' : ''}>
                    <td className="px-3 py-2">
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${tx.amount > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary'}`}>
                        {tx.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-foreground'}`}>{fmtSigned(tx.amount)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtEtb(tx.balance_after)}</td>
                    <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground truncate max-w-[180px]">{tx.description ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDate(tx.created_at)}</td>
                  </tr>
                ))}
                {ledger.data.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No ledger entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {ledger.total > 20 && (
            <p className="text-xs text-center text-muted-foreground py-2 border-t border-border">Showing 20 of {ledger.total} entries</p>
          )}
        </div>
      )}

      <AdjustmentModal userId={adjustTarget?.userId ?? null} userName={adjustTarget?.name ?? null} onClose={() => setAdjustTarget(null)} />
    </div>
  )
}

// ── Inner sub-tab C: Auto-Renewal ─────────────────────────────────────────────

function AutoRenewalSubTab() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['auto-renewal-monitor', page],
    queryFn:  () => fetchAutoRenewalMonitor(page, PAGE_SIZE),
    placeholderData: p => p,
  })
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Users with auto-renewal enabled, sorted by nearest renewal date. Red rows have insufficient balance.</p>
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Renewal Due</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Renewal Price</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Wallet Balance</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.data ?? []).map(r => (
                  <tr key={r.subscription_id} className={`hover:bg-muted/20 ${r.balance_status === 'insufficient' ? 'bg-destructive/5' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.user_id.slice(0, 10)}…</td>
                    <td className="px-4 py-2.5 font-medium">{r.plan_name}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{formatDate(r.renewal_due)}</div>
                      <div className={`text-xs ${r.days_until_renewal <= 3 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {r.days_until_renewal <= 0 ? 'Today' : `in ${r.days_until_renewal}d`}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">{fmtEtb(r.renewal_price_etb)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={r.balance_status === 'insufficient' ? 'text-destructive font-semibold' : 'text-emerald-400 font-semibold'}>{fmtEtb(r.wallet_balance)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.balance_status === 'insufficient'
                        ? <Badge variant="danger">Low Balance</Badge>
                        : <Badge variant="success">Ready</Badge>}
                    </td>
                  </tr>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No auto-renewal subscriptions.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ── Inner sub-tab D: Pricing Options ─────────────────────────────────────────

const DURATION_LABELS: Record<string, string> = {
  '1_month': '1 Month', '3_months': '3 Months',
  '6_months': '6 Months', '12_months': '12 Months',
}

function PricingSubTab() {
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState<SubscriptionPurchaseOption | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: options = [], isLoading } = useQuery({ queryKey: ['purchase-options-admin'], queryFn: fetchAllPurchaseOptions })
  const refresh = () => qc.invalidateQueries({ queryKey: ['purchase-options-admin'] })

  const handleToggle = async (opt: SubscriptionPurchaseOption) => {
    try { await togglePurchaseOptionActive(opt.id, !opt.is_active); await refresh(); toast.success(`Option ${opt.is_active ? 'disabled' : 'enabled'}`) }
    catch (e) { toast.error((e as Error).message) }
  }

  const handleSave = async () => {
    if (!editTarget) return
    setSaving(true)
    try { await upsertPurchaseOption(editTarget); await refresh(); setEditTarget(null); toast.success('Option updated') }
    catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const byPlan: Record<string, SubscriptionPurchaseOption[]> = {}
  for (const opt of options) {
    if (!byPlan[opt.plan_id]) byPlan[opt.plan_id] = []
    byPlan[opt.plan_id].push(opt)
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Purchasable subscription options shown to users. Prices are read from this table — never hardcoded.</p>
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="space-y-6">
          {Object.entries(byPlan).map(([planId, opts]) => (
            <div key={planId}>
              <h3 className="text-sm font-semibold mb-2">{opts[0].plan_name ?? planId} Plan</h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Duration</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Price (ETB)</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Discount</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Per Month</th>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {opts.map(opt => (
                      <tr key={opt.id} className={`hover:bg-muted/20 ${!opt.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5 font-medium">{DURATION_LABELS[opt.duration] ?? opt.duration}</td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-primary">{fmtEtb(opt.price_etb)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {opt.discount_pct ? <span className="text-emerald-400 font-semibold">-{opt.discount_pct}%</span> : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                          {fmtEtb(Math.round((opt.price_etb / opt.duration_months) * 100) / 100)}/mo
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={opt.is_active ? 'success' : 'outline'}>{opt.is_active ? 'Active' : 'Inactive'}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <PermissionGate permission="settings.edit">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleToggle(opt)} title={opt.is_active ? 'Disable' : 'Enable'}
                                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
                                {opt.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                              </button>
                              <button onClick={() => setEditTarget({ ...opt })} title="Edit"
                                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </PermissionGate>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {options.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No pricing options found. Apply Phase 14.5 migrations to populate them.</p>}
        </div>
      )}

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Pricing Option" size="sm">
        {editTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{editTarget.plan_name} — {DURATION_LABELS[editTarget.duration] ?? editTarget.duration}</p>
            <Input label="Price (ETB)" type="number" min="0" step="0.01" value={editTarget.price_etb}
              onChange={e => setEditTarget({ ...editTarget, price_etb: parseFloat(e.target.value) || 0 })} />
            <Input label="Discount % (0 = no badge)" type="number" min="0" max="99" value={editTarget.discount_pct ?? 0}
              onChange={e => setEditTarget({ ...editTarget, discount_pct: parseInt(e.target.value) || 0 })} />
            <Input label="Display order" type="number" min="1" value={editTarget.display_order}
              onChange={e => setEditTarget({ ...editTarget, display_order: parseInt(e.target.value) || 1 })} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editTarget.is_active}
                onChange={e => setEditTarget({ ...editTarget, is_active: e.target.checked })} />
              Active (visible to users)
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Outer tab 2: User Wallets wrapper (with inner sub-tabs) ──────────────────

function WalletsTab() {
  const [innerTab, setInnerTab] = useState('topups')
  return (
    <div className="pt-4 space-y-4">
      <WalletStatsBar />
      {/* Inner sub-tab bar — visually lighter than outer tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 w-fit">
        {WALLET_TABS.map(t => (
          <button key={t.id} onClick={() => setInnerTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              innerTab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {innerTab === 'topups'      && <TopUpsSubTab />}
      {innerTab === 'balances'    && <BalancesSubTab />}
      {innerTab === 'autorenewal' && <AutoRenewalSubTab />}
      {innerTab === 'options'     && <PricingSubTab />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// OUTER TAB 3 — Payment Methods
// ═════════════════════════════════════════════════════════════════════════════

const EMPTY_METHOD: Omit<AppPaymentMethod, 'created_at' | 'updated_at'> = {
  id: '', name: '', type: 'bank', account_name: '', account_number: '',
  phone_number: '', instructions: '', logo_url: null, is_active: true, display_order: 0,
}

function MethodsTab() {
  const qc = useQueryClient()
  const [editTarget,   setEditTarget]   = useState<Omit<AppPaymentMethod, 'created_at' | 'updated_at'> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppPaymentMethod | null>(null)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: methods = [], isLoading } = useQuery({ queryKey: ['app-payment-methods'], queryFn: fetchPaymentMethods })
  const refresh = () => qc.refetchQueries({ queryKey: ['app-payment-methods'] })

  const handleSave = async () => {
    if (!editTarget?.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload = { ...editTarget }
      if (!payload.id) payload.id = crypto.randomUUID()
      await upsertPaymentMethod(payload); await refresh(); setEditTarget(null)
      toast.success('Payment method saved')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deletePaymentMethod(deleteTarget.id); await refresh(); setDeleteTarget(null); toast.success('Deleted') }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false) }
  }

  const moveOrder  = async (m: AppPaymentMethod, dir: -1 | 1) => { await upsertPaymentMethod({ ...m, display_order: m.display_order + dir }); await refresh() }
  const toggleActive = async (m: AppPaymentMethod) => { await upsertPaymentMethod({ ...m, is_active: !m.is_active }); await refresh() }

  const typeColors: Record<string, string> = {
    bank:         'border-blue-500/30 bg-blue-500/10 text-blue-400',
    mobile_money: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    other:        'border-muted text-muted-foreground',
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Configure payment options shown to users (CBE, Awash, Telebirr).</p>
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setEditTarget({ ...EMPTY_METHOD, display_order: methods.length + 1 })}>
          Add Method
        </Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="space-y-3">
          {methods.map((m, idx) => (
            <div key={m.id} className={`rounded-xl border ${m.is_active ? 'border-border' : 'border-border/40 opacity-60'} bg-card overflow-hidden`}>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <button disabled={idx === 0} onClick={() => moveOrder(m, -1)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-colors">
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button disabled={idx === methods.length - 1} onClick={() => moveOrder(m, 1)}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-colors">
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{m.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${typeColors[m.type] ?? typeColors.other}`}>
                      {m.type === 'bank' ? 'Bank' : m.type === 'mobile_money' ? 'Mobile Money' : 'Other'}
                    </span>
                    <Badge variant={m.is_active ? 'success' : 'outline'} className="text-[10px]">
                      {m.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-x-6 text-xs text-muted-foreground">
                    {m.account_name   && <span>Name: {m.account_name}</span>}
                    {m.account_number && <span>Acct: {m.account_number}</span>}
                    {m.phone_number   && <span>Phone: {m.phone_number}</span>}
                  </div>
                  {m.instructions && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">{m.instructions}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(m)} title={m.is_active ? 'Deactivate' : 'Activate'}
                    className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    {m.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => setEditTarget({ ...m })}
                    className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(m)}
                    className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {methods.length === 0 && (
            <div className="text-center py-12 text-sm text-muted-foreground">No payment methods yet. Click "Add Method" to create one.</div>
          )}
        </div>
      )}

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)}
        title={editTarget?.id ? 'Edit Payment Method' : 'Add Payment Method'} size="sm">
        {editTarget && (
          <div className="space-y-4">
            <Input label="Name *" value={editTarget.name}
              onChange={e => setEditTarget(t => t && ({ ...t, name: e.target.value }))}
              placeholder="e.g. Commercial Bank of Ethiopia" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select value={editTarget.type} onChange={e => setEditTarget(t => t && ({ ...t, type: e.target.value as any }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="bank">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input label="Account Name"   value={editTarget.account_name ?? ''} onChange={e => setEditTarget(t => t && ({ ...t, account_name: e.target.value }))} />
            <Input label="Account Number" value={editTarget.account_number ?? ''} onChange={e => setEditTarget(t => t && ({ ...t, account_number: e.target.value }))} />
            <Input label="Phone Number"   value={editTarget.phone_number ?? ''} onChange={e => setEditTarget(t => t && ({ ...t, phone_number: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Instructions shown to user</label>
              <textarea rows={3} value={editTarget.instructions ?? ''}
                onChange={e => setEditTarget(t => t && ({ ...t, instructions: e.target.value }))}
                placeholder="e.g. Transfer to the account number above and include your name as reference."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editTarget.is_active}
                onChange={e => setEditTarget(t => t && ({ ...t, is_active: e.target.checked }))} />
              Active (visible to users)
            </label>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} loading={saving}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Payment Method" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete" variant="danger" loading={deleting} />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page — 3 outer tabs
// ═════════════════════════════════════════════════════════════════════════════

export function PaymentVerificationPage() {
  const [tab, setTab] = useState('submissions')
  return (
    <PageShell
      title="Payments"
      description="Verify subscription payments, manage wallets, and configure payment methods."
      icon={ShieldCheck}
    >
      <Tabs tabs={OUTER_TABS} active={tab} onChange={setTab} />
      <TabPanel id="submissions" active={tab}><SubmissionsTab /></TabPanel>
      <TabPanel id="wallets"     active={tab}><WalletsTab /></TabPanel>
      <TabPanel id="methods"     active={tab}><MethodsTab /></TabPanel>
    </PageShell>
  )
}
