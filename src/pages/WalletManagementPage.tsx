/**
 * WalletManagementPage.tsx
 * Admin — Wallet Management
 *
 * Tabs:
 *   top-ups      → Top-Up Verification (approve / reject pending submissions)
 *   wallets      → All user wallets with balances
 *   auto-renewal → Auto-renewal monitor (balance status per user)
 *   options      → Subscription purchase options (price/duration matrix)
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, RefreshCw, Search, Clock, CheckCircle2, XCircle,
  Eye, AlertTriangle, TrendingUp, TrendingDown, Users,
  RotateCcw, Plus, Pencil, ToggleLeft, ToggleRight,
  AlertCircle, ShieldCheck, DollarSign, Tag,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PermissionGate } from '@/components/guards/PermissionGate'
import {
  fetchTopUpSubmissions, fetchTopUpSubmissionById,
  fetchAllWallets, fetchUserWalletLedger,
  fetchWalletDashboardStats, fetchAutoRenewalMonitor,
  fetchAllPurchaseOptions, upsertPurchaseOption, togglePurchaseOptionActive,
  approveTopUp, rejectTopUp, getTopUpProofUrl, createWalletAdjustment,
  type TopUpSubmission, type TopUpFilters, type WalletRow,
  type AutoRenewalMonitorRow, type SubscriptionPurchaseOption,
} from '@/lib/wallet.queries'

const PAGE_SIZE = 25

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger' | 'outline'> = {
  pending_verification: 'warning',
  approved:   'success',
  rejected:   'danger',
  cancelled:  'outline',
  expired:    'outline',
}

const PAGE_TABS = [
  { id: 'top-ups',      label: 'Top-Up Verification', icon: ShieldCheck },
  { id: 'wallets',      label: 'User Wallets',         icon: Wallet },
  { id: 'auto-renewal', label: 'Auto-Renewal',         icon: RotateCcw },
  { id: 'options',      label: 'Pricing Options',      icon: Tag },
]

// ── Format ETB ────────────────────────────────────────────────────────────────
function fmtEtb(n: number | null | undefined) {
  if (n == null) return '—'
  return `ETB ${Number(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
}
function fmtSigned(n: number) {
  const abs = `ETB ${Math.abs(n).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`
  return n >= 0 ? `+${abs}` : `−${abs}`
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Stats Row
// ═══════════════════════════════════════════════════════════════════════════
function StatsRow() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['wallet-stats'],
    queryFn: fetchWalletDashboardStats,
    staleTime: 1000 * 60,
  })

  if (isLoading) return <div className="h-24 flex items-center justify-center"><Spinner /></div>
  if (!stats) return null

  const cards = [
    { label: 'Total Wallet Balances',   value: fmtEtb(stats.totalWalletBalance),  icon: Wallet,       color: 'text-primary' },
    { label: 'Total Approved Top-Ups',  value: fmtEtb(stats.totalApprovedTopups), icon: TrendingUp,   color: 'text-emerald-400' },
    { label: 'Total Wallet Spending',   value: fmtEtb(stats.totalWalletSpending), icon: TrendingDown, color: 'text-blue-400' },
    { label: 'Pending Top-Ups',         value: stats.pendingTopups,               icon: Clock,        color: 'text-amber-400' },
    { label: 'Users with Wallet',       value: stats.usersWithWallet,             icon: Users,        color: 'text-muted-foreground' },
    { label: 'Auto-Renew Enabled',      value: stats.usersWithAutoRenew,          icon: RotateCcw,    color: 'text-primary' },
    { label: 'Low Balance Warnings',    value: stats.usersWithLowBalance,         icon: AlertCircle,  color: 'text-orange-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-4">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1.5">
          <c.icon className={`h-5 w-5 ${c.color} opacity-80`} />
          <p className={`text-base font-bold tabular-nums ${c.color}`}>{c.value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Top-Up Review Modal
// ═══════════════════════════════════════════════════════════════════════════
function TopUpReviewModal({
  submissionId,
  onClose,
}: { submissionId: string | null; onClose: () => void }) {
  const { user: admin } = useAuth()
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [proofLoading, setProofLoading] = useState(false)

  const { data: sub, isLoading } = useQuery({
    queryKey: ['topup-detail', submissionId],
    queryFn: () => fetchTopUpSubmissionById(submissionId!),
    enabled: !!submissionId,
  })

  // Load proof URL when sub loads
  const loadProof = async (path: string) => {
    setProofLoading(true)
    const url = await getTopUpProofUrl(path)
    setProofUrl(url)
    setProofLoading(false)
  }

  if (sub?.proof_path && !proofUrl && !proofLoading) {
    loadProof(sub.proof_path)
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['wallet-topups'] })
    qc.invalidateQueries({ queryKey: ['wallet-stats'] })
    qc.invalidateQueries({ queryKey: ['topup-detail', submissionId] })
  }

  const handleApprove = async () => {
    if (!admin?.id || !submissionId) return
    setApproving(true)
    try {
      await approveTopUp(submissionId, admin.id, note || undefined)
      toast.success('Top-up approved — wallet credited')
      invalidate()
      onClose()
    } catch (e) { toast.error((e as Error).message) }
    finally { setApproving(false) }
  }

  const handleReject = async () => {
    if (!admin?.id || !submissionId || !rejectReason.trim()) {
      toast.error('Please enter a rejection reason'); return
    }
    setRejecting(true)
    try {
      await rejectTopUp(submissionId, admin.id, rejectReason)
      toast.success('Top-up rejected')
      invalidate()
      onClose()
    } catch (e) { toast.error((e as Error).message) }
    finally { setRejecting(false) }
  }

  const isPending = sub?.status === 'pending_verification'

  return (
    <Modal open={!!submissionId} onClose={onClose} title="Review Wallet Top-Up" size="sm">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : !sub ? (
        <p className="text-sm text-muted-foreground text-center py-8">Submission not found.</p>
      ) : (
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE[sub.status] ?? 'outline'}>
              {sub.status.replace('_', ' ')}
            </Badge>
            {sub.is_duplicate_suspect && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Possible duplicate
              </span>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm rounded-xl bg-muted/30 p-3">
            <div><p className="text-xs text-muted-foreground">User</p><p className="font-semibold">{sub.user_name ?? sub.user_id.slice(0, 12)}</p></div>
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-primary">{fmtEtb(sub.topup_amount_etb)}</p></div>
            <div><p className="text-xs text-muted-foreground">Method</p><p className="font-semibold">{sub.method_name}</p></div>
            <div><p className="text-xs text-muted-foreground">Reference</p><p className="font-mono text-xs font-semibold">{sub.transaction_ref}</p></div>
            <div><p className="text-xs text-muted-foreground">Payment Date</p><p className="font-semibold">{formatDate(sub.payment_date)}</p></div>
            <div><p className="text-xs text-muted-foreground">Submitted</p><p className="font-semibold">{formatDate(sub.submitted_at)}</p></div>
            {sub.note && <div className="col-span-2"><p className="text-xs text-muted-foreground">User Note</p><p className="text-sm italic">{sub.note}</p></div>}
          </div>

          {/* Proof screenshot */}
          {sub.proof_path && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Payment Screenshot</p>
              {proofLoading ? (
                <div className="h-32 flex items-center justify-center rounded-xl border border-border"><Spinner /></div>
              ) : proofUrl ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <img src={proofUrl} alt="Payment proof" className="w-full max-h-64 object-contain" />
                  <a href={proofUrl} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 text-xs text-primary hover:underline border-t border-border/50">
                    <Eye className="h-3.5 w-3.5" /> Open full size
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Could not load screenshot.</p>
              )}
            </div>
          )}

          {/* Approve / reject actions (only for pending) */}
          {isPending && (
            <>
              <Input
                label="Verification note (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Verified with CBE portal"
              />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Rejection reason (required to reject)</p>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Screenshot unclear, amount mismatch…"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-400 flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Approving will immediately credit {fmtEtb(sub.topup_amount_etb)} to the user's wallet. This action creates an immutable ledger entry.
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose} disabled={approving || rejecting}>Cancel</Button>
                <Button variant="destructive" onClick={handleReject} loading={rejecting} disabled={approving}>
                  Reject
                </Button>
                <Button variant="primary" onClick={handleApprove} loading={approving} disabled={rejecting}>
                  Approve — Credit {fmtEtb(sub.topup_amount_etb)}
                </Button>
              </div>
            </>
          )}

          {/* Already processed */}
          {!isPending && (
            <div className="flex flex-col gap-2">
              {sub.verification_note && <p className="text-sm text-muted-foreground"><span className="font-medium">Note:</span> {sub.verification_note}</p>}
              {sub.rejection_reason && <p className="text-sm text-destructive"><span className="font-medium">Rejection:</span> {sub.rejection_reason}</p>}
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Top-Ups Tab
// ═══════════════════════════════════════════════════════════════════════════
function TopUpsTab() {
  const [filters, setFilters] = useState<TopUpFilters>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [reviewId, setReviewId] = useState<string | null>(null)

  const activeFilters = { ...filters, search: search || undefined }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['wallet-topups', activeFilters, page],
    queryFn: () => fetchTopUpSubmissions(activeFilters, page, PAGE_SIZE),
    placeholderData: p => p,
  })

  const setFilter = (key: keyof TopUpFilters, val: string) => {
    setFilters(f => ({ ...f, [key]: val || undefined }))
    setPage(0)
  }

  return (
    <div className="space-y-5 pt-4">
      <StatsRow />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search user, reference…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <select value={filters.status ?? ''} onChange={e => setFilter('status', e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none">
          <option value="">All statuses</option>
          <option value="pending_verification">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex items-center gap-1">
          <input type="date" value={filters.date_from ?? ''} onChange={e => setFilter('date_from', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none" />
          <span className="text-xs text-muted-foreground">—</span>
          <input type="date" value={filters.date_to ?? ''} onChange={e => setFilter('date_to', e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none" />
        </div>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
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
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-primary">
                      {fmtEtb(sub.topup_amount_etb)}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{sub.method_name}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground font-mono text-xs">{sub.transaction_ref}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{formatDate(sub.submitted_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        <Badge variant={STATUS_BADGE[sub.status] ?? 'outline'}>
                          {sub.status.replace('_', ' ')}
                        </Badge>
                        {sub.is_duplicate_suspect && (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" /> Duplicate?
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="outline" leftIcon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => setReviewId(sub.id)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No top-up submissions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}

      <TopUpReviewModal submissionId={reviewId} onClose={() => setReviewId(null)} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Adjustment Modal
// ═══════════════════════════════════════════════════════════════════════════
function AdjustmentModal({ userId, userName, onClose }: {
  userId: string | null; userName: string | null; onClose: () => void
}) {
  const { user: admin } = useAuth()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'ADJUSTMENT' | 'REVERSAL' | 'REFUND'>('ADJUSTMENT')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const handle = async () => {
    if (!admin?.id || !userId) return
    const n = parseFloat(amount)
    if (isNaN(n) || n === 0) { toast.error('Enter a non-zero amount (negative for debit)'); return }
    if (!description.trim()) { toast.error('Description is required'); return }
    setSaving(true)
    try {
      await createWalletAdjustment({
        adminId:     admin.id,
        userId,
        amount:      n,
        type,
        description: description.trim(),
      })
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
        <p className="text-sm text-muted-foreground">
          User: <strong className="text-foreground">{userName ?? userId}</strong>
        </p>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400 flex items-start gap-2">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Adjustments are immutable and create a full audit trail. Use negative amounts for debits. You cannot silently edit balances.
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
          value={amount} onChange={e => setAmount(e.target.value)}
          placeholder="e.g. 100 or -50" />
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

// ═══════════════════════════════════════════════════════════════════════════
// Wallets Tab
// ═══════════════════════════════════════════════════════════════════════════
function WalletsTab() {
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [adjustTarget, setAdjustTarget] = useState<{ userId: string; name: string | null } | null>(null)
  const [ledgerUserId, setLedgerUserId] = useState<string | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['wallet-list', page, search],
    queryFn: () => fetchAllWallets(page, PAGE_SIZE, search || undefined),
    placeholderData: p => p,
  })

  const { data: ledger } = useQuery({
    queryKey: ['user-wallet-ledger', ledgerUserId],
    queryFn: () => fetchUserWalletLedger(ledgerUserId!, 0, 20),
    enabled: !!ledgerUserId,
  })

  return (
    <div className="space-y-5 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search by user name or ID…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
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
                      <Badge variant={w.status === 'active' ? 'success' : w.status === 'frozen' ? 'warning' : 'outline'}>
                        {w.status}
                      </Badge>
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
            <p className="text-sm font-semibold">Wallet Ledger — {ledgerUserId.slice(0, 12)}…</p>
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
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-foreground'}`}>
                      {fmtSigned(tx.amount)}
                    </td>
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
            <p className="text-xs text-center text-muted-foreground py-2 border-t border-border">
              Showing 20 of {ledger.total} entries
            </p>
          )}
        </div>
      )}

      <AdjustmentModal
        userId={adjustTarget?.userId ?? null}
        userName={adjustTarget?.name ?? null}
        onClose={() => setAdjustTarget(null)}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Auto-Renewal Monitor Tab
// ═══════════════════════════════════════════════════════════════════════════
function AutoRenewalTab() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['auto-renewal-monitor', page],
    queryFn: () => fetchAutoRenewalMonitor(page, PAGE_SIZE),
    placeholderData: p => p,
  })

  return (
    <div className="space-y-5 pt-4">
      <p className="text-sm text-muted-foreground">
        Users with auto-renewal enabled, sorted by nearest renewal date.
        Red rows indicate insufficient wallet balance.
      </p>
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
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
                  <tr key={r.subscription_id}
                    className={`hover:bg-muted/20 ${r.balance_status === 'insufficient' ? 'bg-destructive/5' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium truncate max-w-[130px]">{r.user_id.slice(0, 10)}…</div>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{r.plan_name}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{formatDate(r.renewal_due)}</div>
                      <div className={`text-xs ${r.days_until_renewal <= 3 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {r.days_until_renewal <= 0 ? 'Today' : `in ${r.days_until_renewal}d`}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">
                      {fmtEtb(r.renewal_price_etb)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={r.balance_status === 'insufficient' ? 'text-destructive font-semibold' : 'text-emerald-400 font-semibold'}>
                        {fmtEtb(r.wallet_balance)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.balance_status === 'insufficient' ? (
                        <Badge variant="danger">Low Balance</Badge>
                      ) : (
                        <Badge variant="success">Ready</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {(data?.data ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No auto-renewal subscriptions found.</td></tr>
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

// ═══════════════════════════════════════════════════════════════════════════
// Pricing Options Tab
// ═══════════════════════════════════════════════════════════════════════════
const DURATION_LABELS: Record<string, string> = {
  '1_month': '1 Month', '3_months': '3 Months',
  '6_months': '6 Months', '12_months': '12 Months',
}

function OptionsTab() {
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState<SubscriptionPurchaseOption | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: options = [], isLoading } = useQuery({
    queryKey: ['purchase-options-admin'],
    queryFn: fetchAllPurchaseOptions,
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['purchase-options-admin'] })

  const handleToggle = async (opt: SubscriptionPurchaseOption) => {
    try {
      await togglePurchaseOptionActive(opt.id, !opt.is_active)
      await refresh()
      toast.success(`Option ${opt.is_active ? 'disabled' : 'enabled'}`)
    } catch (e) { toast.error((e as Error).message) }
  }

  const handleSave = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      await upsertPurchaseOption(editTarget)
      await refresh()
      setEditTarget(null)
      toast.success('Option updated')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  // Group by plan
  const byPlan: Record<string, SubscriptionPurchaseOption[]> = {}
  for (const opt of options) {
    const key = opt.plan_id
    if (!byPlan[key]) byPlan[key] = []
    byPlan[key].push(opt)
  }

  return (
    <div className="space-y-5 pt-4">
      <p className="text-sm text-muted-foreground">
        These are the purchasable subscription options shown to users.
        Prices are always read from this table — never hardcoded in the frontend.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byPlan).map(([planId, opts]) => {
            const planName = opts[0].plan_name ?? planId
            return (
              <div key={planId}>
                <h3 className="text-sm font-semibold mb-2">{planName} Plan</h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Duration</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Price (ETB)</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Discount</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Monthly Rate</th>
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
                            <Badge variant={opt.is_active ? 'success' : 'outline'}>
                              {opt.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <PermissionGate permission="settings.edit">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleToggle(opt)} title={opt.is_active ? 'Disable' : 'Enable'}
                                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground">
                                  {opt.is_active
                                    ? <ToggleRight className="h-4 w-4 text-primary" />
                                    : <ToggleLeft className="h-4 w-4" />
                                  }
                                </button>
                                <button onClick={() => setEditTarget({ ...opt })} title="Edit price"
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
            )
          })}
          {options.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No purchase options found.</p>
          )}
        </div>
      )}

      {/* Edit option modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Purchase Option" size="sm">
        {editTarget && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {editTarget.plan_name} — {DURATION_LABELS[editTarget.duration] ?? editTarget.duration}
            </p>
            <Input label="Price (ETB)" type="number" min="0" step="0.01"
              value={editTarget.price_etb}
              onChange={e => setEditTarget({ ...editTarget, price_etb: parseFloat(e.target.value) || 0 })} />
            <Input label="Discount % (0 = no badge)" type="number" min="0" max="99"
              value={editTarget.discount_pct ?? 0}
              onChange={e => setEditTarget({ ...editTarget, discount_pct: parseInt(e.target.value) || 0 })} />
            <Input label="Display order" type="number" min="1"
              value={editTarget.display_order}
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

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
export function WalletManagementPage() {
  const [activeTab, setActiveTab] = useState('top-ups')

  return (
    <PageShell
      title="Wallet Management"
      description="Verify top-up requests, manage user wallets, monitor auto-renewals, and configure pricing options."
      icon={Wallet}
    >
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="top-ups"      active={activeTab}><TopUpsTab /></TabPanel>
      <TabPanel id="wallets"      active={activeTab}><WalletsTab /></TabPanel>
      <TabPanel id="auto-renewal" active={activeTab}><AutoRenewalTab /></TabPanel>
      <TabPanel id="options"      active={activeTab}><OptionsTab /></TabPanel>
    </PageShell>
  )
}
