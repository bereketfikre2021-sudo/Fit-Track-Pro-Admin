import { Users } from 'lucide-react'
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

// Generate a consistent color from a string
const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-violet-500/20 text-violet-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
  'bg-cyan-500/20 text-cyan-400',
]
function avatarColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function RecentUsers({ data, loading, error }: Props) {
  return (
    <WidgetCard title="Recent Users" icon={Users} viewAllHref="/users">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner label="Loading recent users" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive text-center py-8" role="alert">
          Failed to load users.
        </p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
      ) : (
        <ul className="divide-y divide-border/50" aria-label="Recently registered users">
          {data.map((u) => {
            const initials = (u.name ?? '?').slice(0, 2).toUpperCase()
            const color = avatarColor(u.id)
            return (
              <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {/* Avatar circle with initials */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${color}`}
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {u.name ? truncate(u.name, 22) : <span className="text-muted-foreground italic">No name</span>}
                  </p>
                  <p className="text-xs text-muted-foreground leading-tight">
                    Joined {formatDate(u.registration_date)}
                  </p>
                </div>
                <Badge variant={TIER_VARIANT[u.plan ?? 'free'] ?? 'outline'} className="text-[10px]">
                  {(u.plan ?? 'free').toUpperCase()}
                </Badge>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}
