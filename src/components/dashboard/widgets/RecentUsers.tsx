import { Users, UserCircle } from 'lucide-react'
import type { RecentUser } from '@/lib/dashboard.queries'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate, truncate } from '@/lib/utils'
import { WidgetCard } from './WidgetCard'

interface Props {
  data: RecentUser[]
  loading: boolean
  error?: boolean
}

const TIER_VARIANT: Record<string, 'default' | 'info' | 'warning' | 'success' | 'outline'> = {
  free: 'outline', pro: 'info', elite: 'warning', team: 'success',
}

export function RecentUsers({ data, loading, error }: Props) {
  return (
    <WidgetCard title="Recent Users" icon={Users} viewAllHref="/users">
      {loading ? (
        <div className="flex justify-center py-8" aria-label="Loading recent users">
          <Spinner label="Loading recent users" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8" role="alert">
          Failed to load users. Check admin RLS policies.
        </p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No users have registered yet.
        </p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Recently registered users">
          {data.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                aria-hidden="true"
              >
                <UserCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {u.name ? truncate(u.name, 22) : <span className="text-muted-foreground italic">No name</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Joined {formatDate(u.registration_date)}
                </p>
              </div>
              <Badge variant={TIER_VARIANT[u.plan ?? 'free'] ?? 'outline'}>
                {(u.plan ?? 'free').toUpperCase()}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
