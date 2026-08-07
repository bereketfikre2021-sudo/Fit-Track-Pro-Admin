import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Wallet, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_BADGE: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'outline'> = {
  succeeded: 'success', failed: 'danger', pending: 'warning',
  refunded: 'info', disputed: 'danger',
}
const PAGE_SIZE = 25

async function fetchPayments(page: number, statusFilter: string) {
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  let q = supabase
    .from('payments')
    .select('id, user_id, amount_usd, status, provider, provider_payment_id, fee_usd, net_usd, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (statusFilter) q = q.eq('status', statusFilter)
  const { data: payments, error, count } = await q
  if (error) throw error

  const userIds = [...new Set((payments ?? []).map((p) => p.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.name
  }

  return {
    data: (payments ?? []).map((p) => ({ ...p, user_name: userMap[p.user_id] ?? null })),
    total: count ?? 0,
  }
}

export function PaymentsPage() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payments', page, statusFilter],
    queryFn: () => fetchPayments(page, statusFilter),
    placeholderData: (p) => p,
  })

  const totalRevenue = (data?.data ?? [])
    .filter((p) => p.status === 'succeeded')
    .reduce((s, p) => s + Number(p.amount_usd), 0)

  return (
    <PageShell
      title="Payments"
      description="All payment transactions across all providers."
      icon={Wallet}
      actions={
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={isFetching} onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total payments', value: data?.total ?? '—' },
          { label: 'Revenue (page)', value: formatCurrency(totalRevenue) },
          { label: 'Succeeded', value: (data?.data ?? []).filter((p) => p.status === 'succeeded').length },
          { label: 'Failed', value: (data?.data ?? []).filter((p) => p.status === 'failed').length },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All statuses</option>
          {['succeeded', 'pending', 'failed', 'refunded', 'disputed'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Net</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium truncate max-w-[140px]">
                        {p.user_name ?? <span className="italic text-muted-foreground">No name</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{p.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                      {formatCurrency(Number(p.amount_usd))}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={STATUS_BADGE[p.status] ?? 'outline'}>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{p.provider}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">
                      {p.net_usd ? formatCurrency(Number(p.net_usd)) : '—'}
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </PageShell>
  )
}
