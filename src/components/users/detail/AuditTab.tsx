import { useQuery } from '@tanstack/react-query'
import { fetchUserAuditLogs } from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'

interface Props { userId: string }

const SEVERITY_BADGE: Record<string, 'info' | 'warning' | 'danger' | 'outline'> = {
  info: 'info', warning: 'warning', error: 'danger', critical: 'danger',
}

const ACTION_BADGE: Record<string, 'default' | 'info' | 'warning' | 'danger'> = {
  insert: 'default', update: 'info', delete: 'danger',
  login: 'default', logout: 'outline' as 'default',
  export: 'info', admin_action: 'warning',
}

export function AuditTab({ userId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['user-audit', userId],
    queryFn: () => fetchUserAuditLogs(userId),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!data.length) return <p className="text-sm text-muted-foreground py-8 text-center">No audit log entries found</p>

  return (
    <div className="space-y-3 pt-5">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Table</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Severity</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">IP</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((log) => (
              <tr key={log.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                  {formatDateTime(log.created_at)}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={ACTION_BADGE[log.action] ?? 'default'}>{log.action}</Badge>
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">
                  {log.table_name ?? '—'}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell">
                  {log.severity
                    ? <Badge variant={SEVERITY_BADGE[log.severity] ?? 'outline'}>{log.severity}</Badge>
                    : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">
                  {log.ip_address ?? '—'}
                </td>
                <td className="px-4 py-2.5 hidden xl:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                  {log.new_values ? JSON.stringify(log.new_values).slice(0, 80) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
