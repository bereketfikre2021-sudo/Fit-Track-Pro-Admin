import { Bell, Mail, Smartphone, MessageSquare } from 'lucide-react'
import type { RecentNotification } from '@/lib/dashboard.queries'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime, truncate } from '@/lib/utils'
import { WidgetCard } from './WidgetCard'

interface Props {
  data: RecentNotification[]
  loading: boolean
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail className="h-4 w-4 text-blue-400" />
  if (channel === 'push') return <Smartphone className="h-4 w-4 text-violet-400" />
  if (channel === 'sms') return <MessageSquare className="h-4 w-4 text-amber-400" />
  return <Bell className="h-4 w-4 text-muted-foreground" />
}

export function RecentNotifications({ data, loading }: Props) {
  return (
    <WidgetCard title="Recent Notifications" icon={Bell} viewAllHref="/notifications">
      {loading ? (
        <div className="flex justify-center py-8" aria-label="Loading recent notifications">
          <Spinner label="Loading recent notifications" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Recent notifications">
          {data.map((n) => (
            <li key={n.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <ChannelIcon channel={n.channel} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {n.title ? truncate(n.title, 28) : (
                    <span className="text-muted-foreground italic">No title</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {n.category ?? n.channel} · {formatDateTime(n.created_at)}
                </p>
              </div>
              {!n.is_read && (
                <Badge variant="info">Unread</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
