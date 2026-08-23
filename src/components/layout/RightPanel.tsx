/**
 * RightPanel.tsx
 * Fixed right panel — always functional on every page.
 * Has its own queries independent of DashboardPage.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Bell, Activity, Users, CreditCard, RefreshCw, CheckCheck, ChevronLeft,
  ShieldCheck, UserPlus, XCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const COLORS = [
  'bg-blue-500/20 text-blue-400',
  'bg-violet-500/20 text-violet-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
]
function avatarColor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

// ── Admin system notifications ────────────────────────────────────────────────
// Shows only admin-relevant events:
//   - New payment submissions (type = payment_submitted)
//   - Payment approved/rejected confirmations
//   - New user registrations
//   - Subscription expirations
// These are stored in the notifications table but inserted by the system
// for users whose user_id is also an admin — OR we query system event types directly.

const ADMIN_EVENT_TYPES = [
  'payment_submitted',
  'payment_approved',
  'payment_rejected',
  'subscription_expired',
  'subscription_expiring',
]

interface AdminNotif {
  id: string
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
  user_id: string
  user_name?: string | null
}

function notifIcon(type: string) {
  if (type === 'payment_submitted')    return { Icon: ShieldCheck,    cls: 'bg-amber-500/20 text-amber-400' }
  if (type === 'payment_approved')     return { Icon: CheckCircle2,   cls: 'bg-emerald-500/20 text-emerald-400' }
  if (type === 'payment_rejected')     return { Icon: XCircle,        cls: 'bg-red-500/20 text-red-400' }
  if (type === 'subscription_expired') return { Icon: AlertTriangle,  cls: 'bg-red-500/20 text-red-400' }
  if (type === 'subscription_expiring')return { Icon: Zap,            cls: 'bg-amber-500/20 text-amber-400' }
  return { Icon: Bell, cls: 'bg-primary/15 text-primary' }
}

function NotificationsSection() {
  const qc = useQueryClient()
  const { user } = useAuth()

  const fetchAdminNotifs = async (): Promise<AdminNotif[]> => {
    try {
      // Fetch system-type notifications across ALL users (admin bypass via RLS)
      // These are the notifications the system sent to users about payment/subscription events
      // which are also the events the admin cares about seeing
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, body, is_read, created_at, user_id')
        .in('type', ADMIN_EVENT_TYPES)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error || !data?.length) return []

      // Enrich with user names
      const userIds = [...new Set(data.map((n) => n.user_id))]
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds)
      const nameMap: Record<string, string | null> = {}
      for (const u of users ?? []) nameMap[u.id] = u.name

      return data.map((n) => ({ ...n, user_name: nameMap[n.user_id] ?? null }))
    } catch { return [] }
  }

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['right-panel-admin-notifications'],
    queryFn: fetchAdminNotifs,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })

  // Realtime: auto-refresh when a new payment_submitted or subscription event arrives
  useEffect(() => {
    const ch = supabase.channel('admin-notifs-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
      }, (payload) => {
        if (ADMIN_EVENT_TYPES.includes(payload.new?.type)) {
          qc.invalidateQueries({ queryKey: ['right-panel-admin-notifications'] })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])

  const unread = notifications.filter((n: AdminNotif) => !n.is_read).length

  const markAllRead = async () => {
    // Mark all admin-type notifications as read
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('type', ADMIN_EVENT_TYPES)
      .eq('is_read', false)
    qc.invalidateQueries({ queryKey: ['right-panel-admin-notifications'] })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Alerts</h3>
          {unread > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={markAllRead} title="Mark all read"
              className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <CheckCheck className="h-3.5 w-3.5" />
            </button>
          )}
          <Link to="/payments" className="text-[10px] text-primary hover:underline">Payments</Link>
        </div>
      </div>

      <div className="space-y-2.5">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No system alerts.</p>
        ) : (
          notifications.slice(0, 8).map((n: AdminNotif) => {
            const { Icon, cls } = notifIcon(n.type)
            return (
              <div key={n.id} className={cn(
                'flex items-start gap-2.5 rounded-lg p-1.5 -mx-1.5 transition-colors hover:bg-secondary/50',
                !n.is_read && 'bg-primary/5'
              )}>
                <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5', cls)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                    {n.title}
                  </p>
                  {n.user_name && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">User: {n.user_name}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
// ── Activities section ────────────────────────────────────────────────────────
function ActivitiesSection() {
  const { data: recentUsers = [] } = useQuery({
    queryKey: ['right-panel-recent-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, registration_date')
        .order('registration_date', { ascending: false })
        .limit(4)
      return data ?? []
    },
    staleTime: 1000 * 60,
  })

  const { data: recentPayments = [] } = useQuery({
    queryKey: ['right-panel-recent-payments'],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('payment_submissions')
          .select('id, amount_etb, status, submitted_at')
          .order('submitted_at', { ascending: false })
          .limit(4)
        return data ?? []
      } catch {
        return []
      }
    },
    staleTime: 1000 * 60,
  })

  const activities = [
    ...recentUsers.map((u: any) => ({
      id: 'u-' + u.id,
      icon: Users,
      text: `${u.name ?? 'A user'} registered`,
      time: u.registration_date ?? '',
      color: 'text-blue-400',
      bg: 'bg-blue-500/15',
    })),
    ...recentPayments.map((p: any) => ({
      id: 'p-' + p.id,
      icon: CreditCard,
      text: `Payment ${p.status?.replace('_', ' ')} · ETB ${Number(p.amount_etb ?? 0).toLocaleString('en-ET')}`,
      time: p.submitted_at ?? '',
      color: p.status === 'approved' ? 'text-emerald-400' : p.status === 'rejected' ? 'text-red-400' : 'text-amber-400',
      bg: p.status === 'approved' ? 'bg-emerald-500/15' : p.status === 'rejected' ? 'bg-red-500/15' : 'bg-amber-500/15',
    })),
  ]
    .filter(a => a.time)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activities</h3>
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="space-y-2.5">
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent activity.</p>
        ) : (
          activities.map(a => (
            <div key={a.id} className="flex items-start gap-2.5">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.bg}`}>
                <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug line-clamp-2">{a.text}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(a.time)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Recent members section ────────────────────────────────────────────────────
function MembersSection() {
  const navigate = useNavigate()

  const { data: members = [] } = useQuery({
    queryKey: ['right-panel-members'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .order('registration_date', { ascending: false })
        .limit(6)
      return data ?? []
    },
    staleTime: 1000 * 60 * 2,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Members</h3>
        <Link to="/users" className="text-[10px] text-primary hover:underline">View all</Link>
      </div>
      <div className="space-y-1.5">
        {members.map((u: any) => {
          const initials = (u.name ?? '?').slice(0, 2).toUpperCase()
          const color = avatarColor(u.id)
          return (
            <button key={u.id}
              onClick={() => navigate(`/users/${u.id}`)}
              className="flex items-center gap-2.5 w-full rounded-lg px-1.5 py-1.5 hover:bg-secondary/50 transition-colors text-left group">
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold overflow-hidden',
                color,
              )}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt={u.name ?? ''} className="h-full w-full object-cover" />
                  : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {u.name ?? <span className="text-muted-foreground italic">No name</span>}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">View →</span>
            </button>
          )
        })}
        {members.length === 0 && <p className="text-xs text-muted-foreground">No members yet.</p>}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function RightPanel({
  collapsed,
  onCollapse,
}: {
  collapsed: boolean
  onCollapse: (v: boolean) => void
}) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col fixed top-14 right-0 bottom-0 border-l border-border bg-card z-20 transition-[width] duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-10' : 'w-72',
      )}
    >
      {/* Collapse toggle button */}
      <button
        onClick={() => onCollapse(!collapsed)}
        title={collapsed ? 'Expand panel' : 'Collapse panel'}
        className={cn(
          'flex items-center justify-center shrink-0 border-b border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
          collapsed ? 'h-10 w-full' : 'h-10 w-full px-3',
        )}
      >
        {collapsed ? (
          <ChevronLeft className="h-4 w-4 rotate-180" />
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Panel</span>
            <ChevronLeft className="h-4 w-4" />
          </div>
        )}
      </button>

      {/* Content — hidden when collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <NotificationsSection />
          <div className="h-px bg-border" />
          <ActivitiesSection />
          <div className="h-px bg-border" />
          <MembersSection />
        </div>
      )}
    </aside>
  )
}