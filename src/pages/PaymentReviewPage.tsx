/**
 * PaymentReviewPage.tsx
 * Admin: review a single payment submission — view proof, approve, reject, cancel.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShieldCheck, ArrowLeft, CheckCircle2, XCircle, Ban,
  ZoomIn, User, CreditCard, Hash, Calendar, FileText,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import {
  fetchSubmissionById, approveSubmission, rejectSubmission,
  cancelSubmission, getProofSignedUrl,
  type SubmissionStatus,
} from '@/lib/payment-verification.queries'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const STATUS_BADGE: Record<SubmissionStatus, 'warning' | 'success' | 'danger' | 'outline' | 'info'> = {
  pending_verification: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'outline',
  expired: 'info',
}

const REJECTION_REASONS = [
  'Screenshot unclear',
  'Incorrect amount',
  'Transaction reference invalid',
  'Payment not found',
  'Wrong account',
  'Duplicate submission',
  'Other',
]

export function PaymentReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()

  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [actionModal, setActionModal] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [approveNote, setApproveNote] = useState('')
  const [rejectReason, setRejectReason] = useState(REJECTION_REASONS[0])
  const [rejectNote, setRejectNote] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: sub, isLoading } = useQuery({
    queryKey: ['payment-submission', id],
    queryFn: () => fetchSubmissionById(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (sub?.proof_path) {
      getProofSignedUrl(sub.proof_path).then(setProofUrl)
    }
  }, [sub?.proof_path])

  const isPending = sub?.status === 'pending_verification'

  const handleApprove = async () => {
    if (!sub || !user) return
    setLoading(true)
    try {
      await approveSubmission(sub.id, user.id, approveNote || undefined)
      toast.success('Payment approved — subscription activated')
      qc.invalidateQueries({ queryKey: ['payment-submissions'] })
      qc.invalidateQueries({ queryKey: ['payment-stats'] })
      setActionModal(null)
      navigate('/payments')
    } catch (e) { toast.error((e as Error).message) }
    finally { setLoading(false) }
  }

  const handleReject = async () => {
    if (!sub || !user) return
    setLoading(true)
    try {
      await rejectSubmission(sub.id, user.id, rejectReason, rejectNote || undefined)
      toast.success('Payment rejected — user notified')
      qc.invalidateQueries({ queryKey: ['payment-submissions'] })
      qc.invalidateQueries({ queryKey: ['payment-stats'] })
      setActionModal(null)
      navigate('/payments')
    } catch (e) { toast.error((e as Error).message) }
    finally { setLoading(false) }
  }

  const handleCancel = async () => {
    if (!sub || !user) return
    setLoading(true)
    try {
      await cancelSubmission(sub.id, user.id)
      toast.success('Submission cancelled')
      qc.invalidateQueries({ queryKey: ['payment-submissions'] })
      setActionModal(null)
      navigate('/payments')
    } catch (e) { toast.error((e as Error).message) }
    finally { setLoading(false) }
  }

  if (isLoading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  if (!sub) return <div className="text-center py-24 text-muted-foreground">Submission not found.</div>

  return (
    <PageShell
      title="Review Payment"
      description={`Submission ${sub.id.slice(0, 8)}…`}
      icon={ShieldCheck}
      actions={
        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
          onClick={() => navigate('/payments')}>
          Back
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: details */}
        <div className="space-y-5">
          {/* Status banner */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={STATUS_BADGE[sub.status]}>{sub.status.replace('_', ' ')}</Badge>
          </div>

          {/* Duplicate warning */}
          {sub.is_duplicate_suspect && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <span className="text-sm text-amber-400 font-medium">⚠ Possible duplicate submission detected. Verify carefully before approving.</span>
            </div>
          )}

          {/* User info */}
          <InfoCard icon={User} title="User">
            <Row label="Name" value={sub.user_name ?? '—'} />
            <Row label="User ID" value={sub.user_id.slice(0, 16) + '…'} mono />
          </InfoCard>

          {/* Plan + amount */}
          <InfoCard icon={CreditCard} title="Subscription">
            <Row label="Plan" value={sub.plan_name ?? '—'} />
            <Row label="Tier" value={sub.plan_tier ?? '—'} />
            <Row label="Amount" value={`ETB ${Number(sub.amount_etb).toLocaleString('en-ET', { minimumFractionDigits: 2 })}`} />
            <Row label="Currency" value={sub.currency} />
          </InfoCard>

          {/* Payment details */}
          <InfoCard icon={Hash} title="Payment Details">
            <Row label="Method" value={sub.method_name ?? '—'} />
            <Row label="Transaction Ref" value={sub.transaction_ref} mono />
            <Row label="Payment Date" value={formatDate(sub.payment_date)} />
            <Row label="Submitted At" value={formatDate(sub.submitted_at)} />
          </InfoCard>

          {/* Note */}
          {sub.note && (
            <InfoCard icon={FileText} title="User Note">
              <p className="text-sm text-muted-foreground">{sub.note}</p>
            </InfoCard>
          )}

          {/* Verification result */}
          {sub.verified_at && (
            <InfoCard icon={Calendar} title="Verification">
              <Row label="Verified At" value={formatDate(sub.verified_at)} />
              {sub.verification_note && <Row label="Note" value={sub.verification_note} />}
              {sub.rejection_reason && <Row label="Rejection Reason" value={sub.rejection_reason} />}
              {sub.rejection_reason_custom && <Row label="Custom Note" value={sub.rejection_reason_custom} />}
            </InfoCard>
          )}

          {/* Actions */}
          {isPending && (
            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="primary" leftIcon={<CheckCircle2 className="h-4 w-4" />}
                onClick={() => setActionModal('approve')}>
                Approve Payment
              </Button>
              <Button variant="destructive" leftIcon={<XCircle className="h-4 w-4" />}
                onClick={() => setActionModal('reject')}>
                Reject Payment
              </Button>
              <Button variant="outline" leftIcon={<Ban className="h-4 w-4" />}
                onClick={() => setActionModal('cancel')}>
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Right: proof image */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Payment Proof</h3>
          {proofUrl ? (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="relative group cursor-zoom-in" onClick={() => setZoomOpen(true)}>
                <img src={proofUrl} alt="Payment proof" className="w-full object-contain max-h-[500px]" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ZoomIn className="h-8 w-8 text-white drop-shadow" />
                </div>
              </div>
              <div className="px-3 py-2 bg-muted/20 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Click to zoom</span>
                <a href={proofUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                  Open in new tab
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/10 flex items-center justify-center h-64">
              <p className="text-sm text-muted-foreground">No proof image uploaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Zoom modal */}
      <Modal open={zoomOpen} onClose={() => setZoomOpen(false)} title="Payment Proof" size="xl">
        {proofUrl && <img src={proofUrl} alt="Payment proof" className="w-full object-contain max-h-[80vh]" />}
      </Modal>

      {/* Approve modal */}
      <Modal open={actionModal === 'approve'} onClose={() => setActionModal(null)} title="Approve Payment" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This will activate the <strong>{sub.plan_name}</strong> subscription for the user.
          </p>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Verification note (optional)</label>
            <textarea rows={3} value={approveNote} onChange={e => setApproveNote(e.target.value)}
              placeholder="e.g. Transaction verified on CBE portal"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setActionModal(null)} disabled={loading}>Cancel</Button>
            <Button onClick={handleApprove} loading={loading} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Confirm Approval
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={actionModal === 'reject'} onClose={() => setActionModal(null)} title="Reject Payment" size="sm">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rejection reason</label>
            <select value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Custom note (optional)</label>
            <textarea rows={3} value={rejectNote} onChange={e => setRejectNote(e.target.value)}
              placeholder="Additional details for the user…"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setActionModal(null)} disabled={loading}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} loading={loading} leftIcon={<XCircle className="h-4 w-4" />}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancel modal */}
      <Modal open={actionModal === 'cancel'} onClose={() => setActionModal(null)} title="Cancel Submission" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Cancel this submission? The user can resubmit.</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setActionModal(null)} disabled={loading}>Back</Button>
            <Button variant="destructive" onClick={handleCancel} loading={loading}>Cancel Submission</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}
