import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Label map for pretty names ─────────────────────────────────────────────

const LABELS: Record<string, string> = {
  dashboard:     'Dashboard',
  users:         'Users',
  subscriptions: 'Subscriptions',
  payments:      'Payments',
  workouts:      'Workouts',
  nutrition:     'Nutrition',
  exercises:     'Exercises',
  'ai-usage':    'AI Usage',
  notifications: 'Notifications',
  reports:       'Reports',
  settings:      'Settings',
}

function labelFor(segment: string): string {
  return LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Breadcrumbs() {
  const { pathname } = useLocation()
  // Split path: '/users/123/edit' → ['users', '123', 'edit']
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {/* Home */}
      <Link
        to="/dashboard"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dashboard home"
      >
        <Home className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>

      {segments.map((seg, idx) => {
        const to = '/' + segments.slice(0, idx + 1).join('/')
        const isLast = idx === segments.length - 1
        const label = labelFor(seg)

        return (
          <span key={to} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
            {isLast ? (
              <span
                className="font-medium text-foreground"
                aria-current="page"
              >
                {label}
              </span>
            ) : (
              <Link
                to={to}
                className={cn('text-muted-foreground hover:text-foreground transition-colors')}
              >
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
