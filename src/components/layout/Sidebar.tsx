import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, Users, CreditCard, Dumbbell, Salad,
  BrainCircuit, Bell, Settings, ChevronLeft, ChevronRight,
  ShieldCheck, Search, X, Sun, Moon, Monitor, LogOut, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Permission } from '@/lib/permissions'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  permission?: Permission
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard',     to: '/dashboard',     icon: LayoutDashboard },
  { label: 'Users',         to: '/users',         icon: Users,        permission: 'users.view' },
  { label: 'Subscriptions', to: '/subscriptions', icon: CreditCard,   permission: 'subscriptions.view' },
  { label: 'Payments',      to: '/payments',      icon: ShieldCheck,  permission: 'payments.verify' },
  { label: 'Workouts',      to: '/workouts',      icon: Dumbbell,     permission: 'workouts.view' },
  { label: 'Nutrition',     to: '/nutrition',     icon: Salad,        permission: 'nutrition.view' },
  { label: 'AI Usage',      to: '/ai-usage',      icon: BrainCircuit, permission: 'ai.view' },
  { label: 'Reports',       to: '/reports',       icon: BarChart3,    permission: 'reports.view' },
  { label: 'Notifications', to: '/notifications', icon: Bell,         permission: 'notifications.view' },
]

const SETTINGS_NAV: NavItem[] = [
  { label: 'Settings', to: '/settings', icon: Settings, permission: 'settings.view' },
]

const ALL_NAV = [...MAIN_NAV, ...SETTINGS_NAV]

const THEMES: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light',  icon: Sun,     label: 'Light' },
  { value: 'dark',   icon: Moon,    label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

// ── Command palette ───────────────────────────────────────────────────────────
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const { can } = useAuth()

  const visibleNav = ALL_NAV.filter(i => !i.permission || can(i.permission))
  const results = query.trim()
    ? visibleNav.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : visibleNav

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No results for "{query}"</p>
          ) : (
            results.map(item => {
              const Icon = item.icon
              return (
                <button key={item.to} onClick={() => { navigate(item.to); onClose() }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors text-left">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {item.label}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Nav section ───────────────────────────────────────────────────────────────
function NavSection({ label, items, collapsed, onMobileClose }: {
  label: string; items: NavItem[]; collapsed: boolean; onMobileClose: () => void
}) {
  const location = useLocation()
  if (items.length === 0) return null
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none">
          {label}
        </p>
      )}
      {collapsed && <div className="pt-3 border-t border-sidebar-border/30 mx-2" />}
      {items.map(item => {
        const Icon = item.icon
        const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
        return (
          <NavLink key={item.to} to={item.to} onClick={onMobileClose}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              'group flex items-center rounded-lg text-sm font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              collapsed ? 'h-9 w-9 justify-center mx-auto' : 'h-9 px-3 gap-3',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/60 hover:bg-secondary hover:text-sidebar-foreground',
            )}>
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        )
      })}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean
  onCollapse: (v: boolean) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const { can, user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()

  const mainItems = MAIN_NAV.filter(i => !i.permission || can(i.permission))
  const settingsItems = SETTINGS_NAV.filter(i => !i.permission || can(i.permission))

  // Fetch user profile for avatar
  const { data: profile } = useQuery({
    queryKey: ['sidebar-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await supabase.from('users').select('name, avatar_url').eq('id', user.id).single()
      return data
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })

  const displayName = profile?.name ?? user?.email ?? 'Admin'
  const initials = displayName.slice(0, 2).toUpperCase()
  const avatarUrl = profile?.avatar_url ?? null

  // Global ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(v => !v) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onMobileClose} />
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border',
          'transition-[width] duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-16' : 'w-60',
        )}
        aria-label="Admin navigation"
      >
        {/* Logo */}
        <div className={cn('flex h-14 items-center border-b border-sidebar-border shrink-0',
          collapsed ? 'justify-center' : 'px-4 gap-2.5')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm text-sidebar-foreground leading-tight">FitTrack</p>
              <p className="text-[10px] text-sidebar-foreground/50 leading-tight">Admin</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className={cn('px-2 pt-3 pb-1', collapsed ? 'flex justify-center' : '')}>
          {collapsed ? (
            <button onClick={() => setPaletteOpen(true)} title="Search (⌘K)"
              className="h-9 w-9 flex items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-secondary hover:text-sidebar-foreground transition-colors">
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 w-full rounded-lg border border-sidebar-border bg-secondary/50 px-2.5 h-9 hover:bg-secondary transition-colors"
              aria-label="Search (⌘K)">
              <Search className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
              <span className="flex-1 text-xs text-sidebar-foreground/40 text-left">Search…</span>
              <kbd className="text-[10px] text-sidebar-foreground/30 font-mono border border-sidebar-border/60 rounded px-1">⌘K</kbd>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2" aria-label="Main navigation">
          <NavSection label="Dashboards" items={mainItems}     collapsed={collapsed} onMobileClose={onMobileClose} />
          <NavSection label="Settings"   items={settingsItems} collapsed={collapsed} onMobileClose={onMobileClose} />

          {/* Theme toggle inline next to settings section */}
          <div className="space-y-0.5">
            {!collapsed && (
              <p className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none">
                Appearance
              </p>
            )}
            {collapsed && <div className="pt-3 border-t border-sidebar-border/30 mx-2" />}
            {collapsed ? (
              /* Collapsed: cycle through themes on click */
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
                title={`Theme: ${theme}`}
                className="h-9 w-9 flex items-center justify-center rounded-lg mx-auto text-sidebar-foreground/60 hover:bg-secondary hover:text-sidebar-foreground transition-colors"
              >
                {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              </button>
            ) : (
              <div className="flex items-center gap-1 px-1 py-1 rounded-lg border border-sidebar-border bg-secondary/30">
                {THEMES.map(({ value, icon: Icon, label }) => (
                  <button key={value} onClick={() => setTheme(value)} title={label}
                    className={cn(
                      'flex-1 flex items-center justify-center h-7 rounded-md text-xs font-medium gap-1.5 transition-colors',
                      theme === value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
                    )}>
                    <Icon className="h-3.5 w-3.5" />
                    {!collapsed && <span className="text-[10px]">{label}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* User profile + sign out at bottom */}
        <div className="border-t border-sidebar-border shrink-0 p-2 space-y-1">
          {/* User row */}
          <div className={cn('flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-secondary/50 transition-colors cursor-pointer',
            collapsed ? 'justify-center' : '')}
            onClick={() => navigate('/profile')}>
            <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : initials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</p>
              </div>
            )}
          </div>

          {/* Collapse + sign out row */}
          <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center')}>
            <button onClick={handleSignOut} title="Sign out"
              className={cn('flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors',
                collapsed ? 'h-8 w-8' : 'h-8 w-8')}>
              <LogOut className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onCollapse(!collapsed)}
              className={cn('flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
                collapsed ? 'h-8 w-8' : 'h-8 w-8 ml-auto')}>
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
