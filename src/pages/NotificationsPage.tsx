/**
 * NotificationsPage.tsx — Full Notification Management
 * Tabs: Compose | History | Delivery Stats | Templates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell, Send, History, BarChart3, FileText, RefreshCw,
  CheckCheck, Trash2, Search, AlertCircle, CheckCircle2,
  Smartphone, Mail, MessageSquare, Users, Tag,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { formatDateTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PermissionGate } from '@/components/guards/PermissionGate'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  fetchNotifications, fetchDeliveryStats, sendNotification,
  deleteNotification, bulkDeleteNotifications, markAllRead,
  NOTIFICATION_CHANNELS, NOTIFICATION_PRIORITIES, NOTIFICATION_CATEGORIES,
  CATEGORY_LABELS, CHANNEL_LABELS,
  type NotificationFilters, type NotificationRecord, type SendPayload,
} from '@/lib/notifications.queries'

const PAGE_SIZE = 25

const DEFAULT_FILTERS: NotificationFilters = {
  search: '', channel: '', category: '', priority: '', is_read: '', date_from: '', date_to: '',
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, 'outline' | 'info' | 'warning' | 'danger'> = {
  low: 'outline', normal: 'info', high: 'warning', urgent: 'danger',
}

const CHANNEL_ICON: Record<string, React.ElementType> = {
  push: Smartphone, email: Mail, sms: MessageSquare, in_app: Bell,
}

const CHART_COLORS = [
  'hsl(84 81% 44%)', 'hsl(217 91% 60%)', 'hsl(270 91% 65%)',
  'hsl(25 95% 53%)', 'hsl(142 71% 45%)', 'hsl(0 72% 50%)',
  'hsl(38 92% 50%)', 'hsl(199 89% 48%)',
]

const PAGE_TABS = [
  { id: 'compose',  label: 'Compose',        icon: Send },
  { id: 'history',  label: 'History',         icon: History },
  { id: 'stats',    label: 'Delivery Stats',  icon: BarChart3 },
  { id: 'templates',label: 'Templates',       icon: FileText },
]

const toOpts = <T extends readonly string[]>(arr: T, withAll = true) => [
  ...(withAll ? [{ value: '', label: 'All' }] : []),
  ...arr.map((v) => ({ value: v, label: CATEGORY_LABELS[v] ?? CHANNEL_LABELS[v] ?? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })),
]

// ── Compose Tab ───────────────────────────────────────────────────────────────

const composeSchema = z.object({
  title:           z.string().min(1, 'Title is required'),
  body:            z.string().min(1, 'Body is required'),
  channel:         z.enum(['in_app', 'push', 'email', 'sms']),
  priority:        z.enum(['low', 'normal', 'high', 'urgent']),
  category:        z.enum(NOTIFICATION_CATEGORIES),
  action_url:      z.string().optional(),
  data:            z.string().optional(),
  target:          z.enum(['all', 'tier', 'user']),
  target_tier:     z.string().optional(),
  target_user_id:  z.string().optional(),
  schedule_at:     z.string().optional(),
})

type ComposeForm = z.infer<typeof composeSchema>

function ComposeTab() {
  const qc = useQueryClient()
  const [result, setResult] = useState<{ total: number; inserted: number; push_queued: number; errors: string[] } | null>(null)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])

  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<ComposeForm>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      channel: 'in_app', priority: 'normal', category: 'announcement', target: 'all',
    },
  })

  const target  = watch('target')
  const channel = watch('channel')

  // Load users for user-targeting
  const loadUsers = async () => {
    if (users.length) return
    const { data } = await supabase.from('users').select('id, name').order('name').limit(500)
    setUsers(data ?? [])
  }

  const onSubmit = async (values: ComposeForm) => {
    setResult(null)
    const r = await sendNotification({
      ...values,
      action_url:     values.action_url ?? '',
      data:           values.data ?? '',
      target_tier:    values.target_tier ?? '',
      target_user_id: values.target_user_id ?? '',
      schedule_at:    values.schedule_at ?? '',
    } as SendPayload)
    setResult(r)
    if (r.inserted > 0) {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['delivery-stats'] })
      if (r.errors.length === 0) toast.success(`Sent to ${r.inserted} user(s)`)
      else toast.warning(`Sent to ${r.inserted} user(s) with some warnings`)
    } else {
      toast.error('No notifications were sent')
    }
  }

  return (
    <div className="max-w-2xl pt-5">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Message */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Message</h3>
          <Input label="Title *" error={errors.title?.message} {...register('title')} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Body *</label>
            <textarea rows={3} {...register('body')}
              className={cn('rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none', errors.body && 'border-destructive')} />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
          </div>
          <Input label="Action URL (deep link)" placeholder="fittrack://workouts" {...register('action_url')} />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Extra data (JSON)</label>
            <textarea rows={2} placeholder='{"key": "value"}' {...register('data')}
              className="rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>
        </div>

        {/* Delivery settings */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Delivery Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Select label="Channel" options={toOpts(NOTIFICATION_CHANNELS, false)} {...register('channel')} />
              {channel === 'push' && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Requires FCM Edge Function deployed
                </p>
              )}
            </div>
            <Select label="Priority" options={toOpts(NOTIFICATION_PRIORITIES, false)} {...register('priority')} />
            <Select label="Category" options={toOpts(NOTIFICATION_CATEGORIES, false)} {...register('category')} />
          </div>
        </div>

        {/* Targeting */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Target Audience</h3>
          <div className="flex gap-3 flex-wrap">
            {(['all', 'tier', 'user'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={t} {...register('target')} className="accent-primary" />
                <span className="text-sm font-medium capitalize">{t === 'all' ? 'All users' : t === 'tier' ? 'By plan tier' : 'Specific user'}</span>
              </label>
            ))}
          </div>

          {target === 'tier' && (
            <select {...register('target_tier')}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Select tier…</option>
              {['free', 'pro', 'elite', 'team'].map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          )}

          {target === 'user' && (
            <div onClick={loadUsers}>
              <select {...register('target_user_id')}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Select a user…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>)}
              </select>
              {!users.length && <p className="text-xs text-muted-foreground mt-1">Click to load users</p>}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={cn('rounded-xl p-4 space-y-2', result.inserted > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-destructive/10 border border-destructive/20')}>
            <div className="flex items-center gap-2 font-medium text-sm">
              {result.inserted > 0
                ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" />Sent to {result.inserted} of {result.total} user(s){result.push_queued > 0 && ` · ${result.push_queued} push queued`}</>
                : <><AlertCircle className="h-4 w-4 text-destructive" />No notifications sent</>}
            </div>
            {result.errors.map((e, i) => <p key={i} className="text-xs text-amber-400 pl-6">{e}</p>)}
          </div>
        )}

        <PermissionGate permission="notifications.send">
          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting} leftIcon={<Send className="h-4 w-4" />} className="flex-1">
              Send Notification
            </Button>
            <Button type="button" variant="outline" onClick={() => { reset(); setResult(null) }}>Clear</Button>
          </div>
        </PermissionGate>
      </form>
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<NotificationFilters>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['notifications', page, filters],
    queryFn: () => fetchNotifications(page, PAGE_SIZE, filters),
    placeholderData: (p) => p,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] })

  const handleSearch = (v: string) => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setFilters((f) => ({ ...f, search: v })); setPage(0) }, 300)
  }

  const upd = (patch: Partial<NotificationFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(0) }

  const toggleSelect = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => {
    const ids = data?.data.map((n) => n.id) ?? []
    setSelectedIds(ids.every((id) => selectedIds.has(id)) ? new Set() : new Set(ids))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteNotification(deleteTarget); toast.success('Deleted'); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try { await bulkDeleteNotifications([...selectedIds]); toast.success(`Deleted ${selectedIds.size}`); setSelectedIds(new Set()); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setBulkDeleteOpen(false) }
  }

  const handleMarkAllRead = async () => {
    try { await markAllRead(); toast.success('Marked all as read'); invalidate() }
    catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4 pt-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="search" placeholder="Search title or user…" onChange={(e) => handleSearch(e.target.value)}
              className="flex h-9 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          {[
            { key: 'channel', opts: toOpts(NOTIFICATION_CHANNELS) },
            { key: 'category', opts: toOpts(NOTIFICATION_CATEGORIES) },
            { key: 'priority', opts: toOpts(NOTIFICATION_PRIORITIES) },
          ].map(({ key, opts }) => (
            <select key={key} value={(filters as unknown as Record<string, string>)[key]}
              onChange={(e) => upd({ [key]: e.target.value } as Partial<NotificationFilters>)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          <select value={filters.is_read} onChange={(e) => upd({ is_read: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <input type="date" value={filters.date_from} onChange={(e) => upd({ date_from: e.target.value })}
            className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <input type="date" value={filters.date_to} onChange={(e) => upd({ date_to: e.target.value })}
            className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>Delete {selectedIds.size}</Button>}
          <Button size="sm" variant="outline" leftIcon={<CheckCheck className="h-3.5 w-3.5" />} onClick={handleMarkAllRead}>Mark all read</Button>
          {isFetching && <Spinner size="sm" />}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">Total: <strong className="text-foreground">{data?.total.toLocaleString() ?? '—'}</strong></div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 w-10"><input type="checkbox" checked={!!data?.data.length && data.data.every((n) => selectedIds.has(n.id))} onChange={toggleAll} className="rounded" /></th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Channel</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Read</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">Sent</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((n) => {
                  const ChIcon = CHANNEL_ICON[n.channel] ?? Bell
                  return (
                    <tr key={n.id} className={cn('hover:bg-muted/20', selectedIds.has(n.id) && 'bg-primary/5')}>
                      <td className="px-3 py-2.5 w-10"><input type="checkbox" checked={selectedIds.has(n.id)} onChange={() => toggleSelect(n.id)} className="rounded" /></td>
                      <td className="px-4 py-2.5 font-medium truncate max-w-[120px]">{n.user_name ?? <span className="italic text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5 max-w-[200px]">
                        <div className="font-medium truncate">{n.title}</div>
                        {n.body && <div className="text-xs text-muted-foreground truncate">{n.body.slice(0, 60)}{n.body.length > 60 ? '…' : ''}</div>}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <ChIcon className="h-3.5 w-3.5" />{CHANNEL_LABELS[n.channel] ?? n.channel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        {n.category && <Badge variant="default">{CATEGORY_LABELS[n.category] ?? n.category}</Badge>}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <Badge variant={PRIORITY_BADGE[n.priority] ?? 'outline'}>{n.priority}</Badge>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        {n.is_read ? <span className="text-xs text-muted-foreground">Read</span> : <Badge variant="info">Unread</Badge>}
                      </td>
                      <td className="px-4 py-2.5 hidden xl:table-cell text-muted-foreground text-xs whitespace-nowrap">
                        {n.sent_at ? formatDateTime(n.sent_at) : <span className="text-amber-400">Pending</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <PermissionGate permission="notifications.delete">
                          <button onClick={() => setDeleteTarget(n.id)} title="Delete"
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-auto">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Notification" message="Permanently delete this notification?" confirmLabel="Delete" loading={deleting} />
      <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} notifications`} message="Permanently delete selected notifications?" confirmLabel={`Delete ${selectedIds.size}`} loading={deleting} />
    </div>
  )
}

// ── Delivery Stats Tab ────────────────────────────────────────────────────────

function DeliveryStatsTab() {
  const { data: stats, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn: fetchDeliveryStats,
  })

  // Notification counts by day (last 14 days)
  const { data: dailyData = [] } = useQuery({
    queryKey: ['notif-daily'],
    queryFn: async () => {
      const since = new Date(Date.now() - 13 * 86400_000)
      since.setUTCHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('notifications')
        .select('created_at, is_read, channel')
        .gte('created_at', since.toISOString())
      const buckets: Record<string, { total: number; read: number }> = {}
      for (const n of data ?? []) {
        const d = (n.created_at as string).slice(0, 10)
        if (!buckets[d]) buckets[d] = { total: 0, read: 0 }
        buckets[d].total++
        if (n.is_read) buckets[d].read++
      }
      return Array.from({ length: 14 }, (_, i) => {
        const d = new Date(Date.now() - (13 - i) * 86400_000)
        const key = d.toISOString().slice(0, 10)
        return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), total: buckets[key]?.total ?? 0, read: buckets[key]?.read ?? 0 }
      })
    },
  })

  const channelData = Object.entries(stats?.channels ?? {}).map(([channel, count]) => ({ channel: CHANNEL_LABELS[channel] ?? channel, count }))
  const categoryData = Object.entries(stats?.categories ?? {}).map(([cat, count]) => ({ category: CATEGORY_LABELS[cat] ?? cat, count })).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-5 pt-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: 'Total (30d)',   value: stats?.total.toLocaleString(), color: 'text-foreground' },
              { label: 'Sent',          value: stats?.sent.toLocaleString(), color: 'text-emerald-400' },
              { label: 'Failed',        value: stats?.failed.toLocaleString(), color: 'text-red-400' },
              { label: 'Read',          value: stats?.read.toLocaleString(), color: 'text-blue-400' },
              { label: 'Unread',        value: stats?.unread.toLocaleString(), color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${s.color}`}>{s.value ?? '—'}</p>
              </div>
            ))}
          </div>

          {/* Daily chart */}
          {dailyData.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Daily Notifications — Last 14 days</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total" name="Sent" fill="hsl(84 81% 44%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="read"  name="Read" fill="hsl(217 91% 60%)" radius={[3, 3, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Channel + Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {channelData.length > 0 && (
              <Card>
                <CardHeader><CardTitle>By Channel</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={channelData} dataKey="count" nameKey="channel" cx="50%" cy="50%" outerRadius={70}
                        label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {channelData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {categoryData.length > 0 && (
              <Card>
                <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={110} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                      <Bar dataKey="count" fill="hsl(270 91% 65%)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Read rate per category */}
          <Card>
            <CardHeader><CardTitle>Breakdown Table (last 30 days)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-left font-medium text-muted-foreground">Channel</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Count</th>
                      <th className="pb-2 text-right font-medium text-muted-foreground">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {channelData.map((c) => (
                      <tr key={c.channel} className="hover:bg-muted/20">
                        <td className="py-2">{c.channel}</td>
                        <td className="py-2 text-right tabular-nums">{c.count}</td>
                        <td className="py-2 text-right text-muted-foreground tabular-nums">
                          {stats?.total ? `${Math.round((c.count / stats.total) * 100)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

interface Template {
  id: string
  name: string
  title: string
  body: string
  channel: string
  priority: string
  category: string
  action_url?: string
}

const BUILT_IN_TEMPLATES: Template[] = [
  { id: 'workout-reminder', name: 'Workout Reminder', title: '💪 Time to work out!', body: "Your scheduled workout is ready. Let's crush it today!", channel: 'push', priority: 'normal', category: 'workout_reminder', action_url: 'fittrack://workout' },
  { id: 'meal-reminder', name: 'Meal Reminder', title: '🥗 Time to log your meal', body: "Don't forget to log your meal and stay on track with your nutrition goals.", channel: 'push', priority: 'normal', category: 'meal_reminder', action_url: 'fittrack://meal-plan' },
  { id: 'water-reminder', name: 'Water Reminder', title: '💧 Stay hydrated!', body: "You haven't logged water in a while. Remember to drink water throughout the day.", channel: 'push', priority: 'low', category: 'water_reminder' },
  { id: 'sub-expiring', name: 'Subscription Expiring', title: '⏰ Your subscription expires soon', body: 'Your FitTrack Pro subscription expires in 3 days. Renew now to keep your premium features.', channel: 'push', priority: 'high', category: 'subscription_reminder', action_url: 'fittrack://subscription' },
  { id: 'sub-expired', name: 'Subscription Expired', title: '❌ Subscription expired', body: 'Your FitTrack Pro subscription has expired. Renew now to restore access to premium features.', channel: 'push', priority: 'urgent', category: 'subscription_reminder', action_url: 'fittrack://subscription' },
  { id: 'promo-30off', name: 'Promo — 30% Off', title: '🎉 Limited time: 30% off Pro!', body: "Upgrade to FitTrack Pro and save 30%. Offer ends soon. Don't miss out!", channel: 'push', priority: 'high', category: 'promotion', action_url: 'fittrack://upgrade' },
  { id: 'announcement', name: 'New Feature Announcement', title: '🚀 New feature available', body: 'We have added new features to FitTrack Pro. Check them out now!', channel: 'in_app', priority: 'normal', category: 'announcement' },
  { id: 'achievement', name: 'Achievement Unlocked', title: '🏆 Achievement unlocked!', body: "Congratulations! You've completed your weekly workout goal. Keep it up!", channel: 'push', priority: 'normal', category: 'achievement' },
]

function TemplatesTab() {
  const [useModal, setUseModal] = useState<Template | null>(null)

  return (
    <div className="space-y-5 pt-5">
      <p className="text-sm text-muted-foreground">
        Click "Use template" to pre-fill the Compose form. All templates are editable before sending.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BUILT_IN_TEMPLATES.map((tpl) => {
          const ChIcon = CHANNEL_ICON[tpl.channel] ?? Bell
          return (
            <div key={tpl.id} className="rounded-xl border border-border bg-card p-5 space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm">{tpl.name}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ChIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant={PRIORITY_BADGE[tpl.priority] ?? 'outline'}>{tpl.priority}</Badge>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{tpl.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.body}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="default">{CATEGORY_LABELS[tpl.category] ?? tpl.category}</Badge>
                <Button size="sm" variant="outline" onClick={() => setUseModal(tpl)}>Use template</Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview + use modal */}
      {useModal && (
        <Modal open={!!useModal} onClose={() => setUseModal(null)} title={`Use template: ${useModal.name}`} size="sm">
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Title: </span>{useModal.title}</div>
              <div><span className="text-muted-foreground">Body: </span>{useModal.body}</div>
              <div><span className="text-muted-foreground">Channel: </span><span className="capitalize">{useModal.channel}</span></div>
              <div><span className="text-muted-foreground">Category: </span>{CATEGORY_LABELS[useModal.category]}</div>
              {useModal.action_url && <div><span className="text-muted-foreground">URL: </span><code className="text-xs bg-muted px-1 rounded">{useModal.action_url}</code></div>}
            </div>
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
              Go to the Compose tab and fill in the fields with this template's content. Targeting and scheduling are set independently.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUseModal(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('compose')

  return (
    <PageShell
      title="Notification Management"
      description="Send push, in-app, and email notifications. View delivery history and analytics."
      icon={Bell}
    >
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="compose"   active={activeTab}><ComposeTab /></TabPanel>
      <TabPanel id="history"   active={activeTab}><HistoryTab /></TabPanel>
      <TabPanel id="stats"     active={activeTab}><DeliveryStatsTab /></TabPanel>
      <TabPanel id="templates" active={activeTab}><TemplatesTab /></TabPanel>
    </PageShell>
  )
}
