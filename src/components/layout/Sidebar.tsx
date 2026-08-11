import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Dumbbell,
  Salad,
  BrainCircuit,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { Permission } from '@/lib/permissions'

// ── Nav item definition ───────────────────────────────────────────────────────

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  permission?: Permission   // if set, item is hidden when user lacks this permission
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     to: '/dashboard',      icon: LayoutDashboard },
  { label: 'Users',         to: '/users',          icon: Users,        permission: 'users.view' },
  { label: 'Subscriptions', to: '/subscriptions',  icon: CreditCard,   permission: 'subscriptions.view' },
  { label: 'Workouts',      to: '/workouts',       icon: Dumbbell,     permission: 'workouts.view' },
  { label: 'Nutrition',     to: '/nutrition',      icon: Salad,        permission: 'nutrition.view' },
  { label: 'AI Usage',      to: '/ai-usage',       icon: BrainCircuit, permission: 'ai.view' },
  { label: 'Notifications', to: '/notifications',  icon: Bell,         permission: 'notifications.view' },
  { label: 'Settings',      to: '/settings',       icon: Settings,     permission: 'settings.view' },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { can } = useAuth()

  // Filter items the current user has access to
  const visibleItems = NAV_ITEMS.filter((item) =>
    !item.permission || can(item.permission),
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border',
          'transition-[width] duration-200 ease-in-out',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-16' : 'w-60',
        )}
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-14 items-center border-b border-sidebar-border shrink-0',
            collapsed ? 'justify-center px-0' : 'px-4 gap-2',
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm text-sidebar-foreground truncate">
              FitTrack Admin
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" aria-label="Main navigation">
          {visibleItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onMobileClose}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  'group flex items-center rounded-md text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  collapsed ? 'h-9 w-9 justify-center mx-auto' : 'h-9 px-2 gap-2.5',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-sidebar-foreground/70 hover:bg-secondary hover:text-sidebar-foreground',
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse toggle — desktop only */}
        <div className="hidden lg:flex shrink-0 border-t border-sidebar-border p-2">
          <button
            onClick={() => onCollapse(!collapsed)}
            className={cn(
              'flex h-8 w-full items-center rounded-md text-muted-foreground',
              'hover:bg-secondary hover:text-foreground transition-colors',
              collapsed ? 'justify-center' : 'px-2 gap-2',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
