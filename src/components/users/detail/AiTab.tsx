import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { fetchUserAiLogs } from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'

interface Props { userId: string }

const FEATURE_LABELS: Record<string, string> = {
  exercise_recommendation: 'Exercise Rec.',
  meal_recommendation: 'Meal Rec.',
  shopping_recommendation: 'Shopping Rec.',
  chat: 'Chat',
  analysis: 'Analysis',
  form_check: 'Form Check',
  other: 'Other',
}

export function AiTab({ userId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['user-ai-logs', userId],
    queryFn: () => fetchUserAiLogs(userId),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!data.length) return <p className="text-sm text-muted-foreground py-8 text-center">No AI requests found</p>

  const succeeded = data.filter((r) => r.success).length
  const totalTokens = data.reduce((s, r) => s + (r.total_tokens ?? 0), 0)
  const avgLatency = data.filter((r) => r.latency_ms).reduce((s, r, _, a) => s + (r.latency_ms ?? 0) / a.length, 0)

  return (
    <div className="space-y-5 pt-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total requests', value: data.length },
          { label: 'Succeeded', value: succeeded },
          { label: 'Total tokens', value: totalTokens.toLocaleString() },
          { label: 'Avg latency', value: avgLatency ? `${Math.round(avgLatency)}ms` : '—' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Model</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Tokens</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <Badge variant="default">{FEATURE_LABELS[r.feature] ?? r.feature}</Badge>
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{r.provider}</td>
                <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground text-xs">{r.model ?? '—'}</td>
                <td className="px-4 py-2.5 text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                  {r.total_tokens?.toLocaleString() ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  {r.success
                    ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />OK</span>
                    : <span className="flex items-center gap-1 text-red-400"><XCircle className="h-3.5 w-3.5" />Failed</span>}
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">
                  {formatDateTime(r.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
