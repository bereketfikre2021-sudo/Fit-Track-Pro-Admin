/**
 * PaymentVerificationPage.tsx
 * Admin: Payment Verification + Payment Methods management.
 * Tabs: Submissions | Methods
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, Search, RefreshCw, Clock, CheckCircle2,
  XCircle, AlertTriangle, Eye, Plus, Pencil, Trash2,
  ArrowUp, ArrowDown, EyeOff, CreditCard,
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
import {
  fetchSubmissions, fetchPaymentMethods, fetchPaymentStats,
  upsertPaymentMethod, deletePaymentMethod,
  type SubmissionFilters, type SubmissionStatus, type AppPaymentMethod,
} from '@/lib/payment-verification.queries'

const STATUS_BADGE: Record<SubmissionStatus, 'warning' | 'success' | 'danger' | 'outline' | 'info'> = {
  pending_verification: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'outline',
  expired: 'info',
}

const PAGE_SIZE = 25

const PAGE_TABS = [
  { id: 'submissions', label: 'Submissions',     icon: ShieldCheck },
  { id: 'methods',     label: 'Payment Methods', icon: CreditCard },
]

// ── Submissions tab ───────────────────────────────────────────────────────────

function SubmissionsTab() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<SubmissionFilters>({})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const activeFilters: SubmissionFilters = { ...filters, search: search || undefined }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payment-submissions', activeFilters, page],
    queryFn: () => fetchSubmissions(activeFilters, page, PAGE_SIZE),
    placeholderData: p => p,
  })

  const { data: methods = [] } = useQuery({
    queryKey: ['app-payment-methods'],
    queryFn: fetchPaymentMethods,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('id,name')
        .eq('is_active', true)
        .order('name')
      return data ?? []
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: fetchPaymentStats,
    staleTime: 1000 * 60,
  })

  const setFilter = (key: keyof SubmissionFilters, val: string) => {
    setFilters(f => ({ ...f, [key]: val || undefined }))
    setPage(0)
  }

  return (
    <div className="space-y-5 pt-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pending',        value: stats.pending,        icon: Clock,         color: 'text-amber-400' },
            { label: 'Approved Today', value: stats.approvedToday,  icon: CheckCircle2,  color: 'text-emerald-400' },
            { label: 'Rejected Today', value: stats.rejectedToday,  icon: XCircle,       color: 'text-red-400' },
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search name, ref, ID…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
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
                      <div className="font-medium truncate max-w-[140px]">
                        {sub.user_name ?? <span className="text-muted-foreground italic">—</span>}
                      </div>
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
                        onClick={() => navigate(`/payments/review/${sub.id}`)}>
                        Review
                      </Button>
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

// ── Payment Methods tab ───────────────────────────────────────────────────────

const EMPTY_METHOD: Omit<AppPaymentMethod, 'created_at' | 'updated_at'> = {
  id: '', name: '', type: 'bank', account_name: '', account_number: '',
  phone_number: '', instructions: '', logo_url: null, is_active: true, display_order: 0,
}

function MethodsTab() {
  const qc = useQueryClient()
  const [editTarget, setEditTarget] = useState<Omit<AppPaymentMethod, 'created_at' | 'updated_at'> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AppPaymentMethod | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['app-payment-methods'],
    queryFn: fetchPaymentMethods,
  })

  const refresh = () => qc.refetchQueries({ queryKey: ['app-payment-methods'] })

  const handleSave = async () => {
    if (!editTarget?.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload = { ...editTarget }
      if (!payload.id) payload.id = crypto.randomUUID()
      await upsertPaymentMethod(payload)
      await refresh()
      setEditTarget(null)
      toast.success('Payment method saved')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePaymentMethod(deleteTarget.id)
      await refresh()
      setDeleteTarget(null)
      toast.success('Deleted')
    } catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false) }
  }

  const moveOrder = async (m: AppPaymentMethod, dir: -1 | 1) => {
    await upsertPaymentMethod({ ...m, display_order: m.display_order + dir })
    await refresh()
  }

  const toggleActive = async (m: AppPaymentMethod) => {
    await upsertPaymentMethod({ ...m, is_active: !m.is_active })
    await refresh()
  }

  const typeColors: Record<string, string> = {
    bank: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    mobile_money: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    other: 'border-muted text-muted-foreground',
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configure the payment options displayed to users (CBE, Awash, Telebirr).
        </p>
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
                    {m.account_name && <span>Name: {m.account_name}</span>}
                    {m.account_number && <span>Acct: {m.account_number}</span>}
                    {m.phone_number && <span>Phone: {m.phone_number}</span>}
                  </div>
                  {m.instructions && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">{m.instructions}</p>
                  )}
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
            <div className="text-center py-12 text-sm text-muted-foreground">
              No payment methods yet. Click "Add Method" to create one.
            </div>
          )}
        </div>
      )}

      {/* Edit / Create modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)}
        title={editTarget?.id ? 'Edit Payment Method' : 'Add Payment Method'} size="sm">
        {editTarget && (
          <div className="space-y-4">
            <Input label="Name *" value={editTarget.name}
              onChange={e => setEditTarget(t => t && ({ ...t, name: e.target.value }))}
              placeholder="e.g. Commercial Bank of Ethiopia" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select value={editTarget.type}
                onChange={e => setEditTarget(t => t && ({ ...t, type: e.target.value as any }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="bank">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Input label="Account Name" value={editTarget.account_name ?? ''}
              onChange={e => setEditTarget(t => t && ({ ...t, account_name: e.target.value }))} />
            <Input label="Account Number" value={editTarget.account_number ?? ''}
              onChange={e => setEditTarget(t => t && ({ ...t, account_number: e.target.value }))} />
            <Input label="Phone Number" value={editTarget.phone_number ?? ''}
              onChange={e => setEditTarget(t => t && ({ ...t, phone_number: e.target.value }))} />
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

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Payment Method"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PaymentVerificationPage() {
  const [tab, setTab] = useState('submissions')

  return (
    <PageShell
      title="Payments"
      description="Verify payment submissions and manage payment methods."
      icon={ShieldCheck}
    >
      <Tabs tabs={PAGE_TABS} active={tab} onChange={setTab} />
      <TabPanel id="submissions" active={tab}><SubmissionsTab /></TabPanel>
      <TabPanel id="methods"     active={tab}><MethodsTab /></TabPanel>
    </PageShell>
  )
}
