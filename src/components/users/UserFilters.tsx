import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { UserFilters } from '@/lib/users.queries'

interface UserFiltersProps {
  filters: UserFilters
  onChange: (f: UserFilters) => void
}

const ROLE_OPTIONS = [
  { value: 'user',            label: 'User' },
  { value: 'moderator',       label: 'Moderator' },
  { value: 'analyst',         label: 'Analyst' },
  { value: 'support',         label: 'Support' },
  { value: 'content_manager', label: 'Content Manager' },
  { value: 'admin',           label: 'Admin' },
  { value: 'super_admin',     label: 'Super Admin' },
]

const PLAN_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
  { value: 'elite', label: 'Elite' },
  { value: 'team', label: 'Team' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active subscription' },
  { value: 'no_sub', label: 'No subscription' },
]

const isFiltered = (f: UserFilters) => f.search || f.role || f.plan || f.status

export function UserFiltersBar({ filters, onChange }: UserFiltersProps) {
  const update = (patch: Partial<UserFilters>) => onChange({ ...filters, ...patch })
  const reset = () => onChange({ search: '', role: '', plan: '', status: '' })

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder="Search by name…"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Search users"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
        <select
          value={filters.role}
          onChange={(e) => update({ role: e.target.value })}
          aria-label="Filter by role"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.plan}
          onChange={(e) => update({ plan: e.target.value })}
          aria-label="Filter by plan"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All plans</option>
          {PLAN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label="Filter by status"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {isFiltered(filters) && (
          <Button variant="ghost" size="sm" onClick={reset} leftIcon={<X className="h-3.5 w-3.5" />}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
