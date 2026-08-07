/**
 * notifications.queries.ts
 * All Supabase queries and Firebase FCM integration for the
 * Notification Management module.
 *
 * FCM push is sent via a Supabase Edge Function (or server-side call) because
 * the FCM Admin SDK requires a service account key that must NOT be in the
 * browser. This file calls a stub Edge Function "send-push-notification"
 * which you wire to the Firebase Admin SDK.
 *
 * For in-app notifications, we write directly to the notifications table —
 * no Edge Function needed since RLS allows admin inserts.
 */

import { supabase } from './supabase'

// ── Reference constants ───────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS  = ['in_app', 'push', 'email', 'sms'] as const
export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const NOTIFICATION_CATEGORIES = [
  'workout_reminder',
  'meal_reminder',
  'water_reminder',
  'subscription_reminder',
  'announcement',
  'promotion',
  'achievement',
  'system',
] as const

export type NotificationChannel  = typeof NOTIFICATION_CHANNELS[number]
export type NotificationPriority = typeof NOTIFICATION_PRIORITIES[number]
export type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number]

// ── Notification type labels (for display) ────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  workout_reminder:      'Workout Reminder',
  meal_reminder:         'Meal Reminder',
  water_reminder:        'Water Reminder',
  subscription_reminder: 'Subscription Reminder',
  announcement:          'Announcement',
  promotion:             'Promotion',
  achievement:           'Achievement',
  system:                'System',
}

export const CHANNEL_LABELS: Record<string, string> = {
  in_app: 'In-App',
  push:   'Push',
  email:  'Email',
  sms:    'SMS',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NotificationRecord {
  id: string
  user_id: string
  title: string
  body: string
  channel: string
  priority: string
  category: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  read_at: string | null
  sent_at: string | null
  failed_at: string | null
  failure_reason: string | null
  expires_at: string | null
  action_url: string | null
  created_at: string
  // joined
  user_name?: string | null
}

export interface NotificationFilters {
  search: string
  channel: string
  category: string
  priority: string
  is_read: string   // '' | 'true' | 'false'
  date_from: string
  date_to: string
}

export interface SendPayload {
  title: string
  body: string
  channel: NotificationChannel
  priority: NotificationPriority
  category: NotificationCategory
  action_url: string
  data: string               // JSON string of extra data
  target: 'all' | 'tier' | 'user'
  target_tier: string        // 'free'|'pro'|'elite'|'team'
  target_user_id: string
  schedule_at: string        // ISO string or ''
}

export interface DeliveryStats {
  total: number
  sent: number
  failed: number
  read: number
  unread: number
  channels: Record<string, number>
  categories: Record<string, number>
}

// ── Fetch notifications list ──────────────────────────────────────────────────

export async function fetchNotifications(
  page: number,
  pageSize: number,
  filters: NotificationFilters,
): Promise<{ data: NotificationRecord[]; total: number }> {
  const from = page * pageSize
  const to   = from + pageSize - 1

  let q = supabase
    .from('notifications')
    .select('id, user_id, title, body, channel, priority, category, data, is_read, read_at, sent_at, failed_at, failure_reason, expires_at, action_url, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.channel)    q = q.eq('channel', filters.channel)
  if (filters.category)   q = q.eq('category', filters.category)
  if (filters.priority)   q = q.eq('priority', filters.priority)
  if (filters.is_read !== '') q = q.eq('is_read', filters.is_read === 'true')
  if (filters.date_from)  q = q.gte('created_at', new Date(filters.date_from).toISOString())
  if (filters.date_to)    q = q.lte('created_at', new Date(filters.date_to + 'T23:59:59').toISOString())

  const { data, error, count } = await q
  if (error) throw error
  if (!data?.length) return { data: [], total: count ?? 0 }

  const userIds = [...new Set(data.map((n) => n.user_id))]
  const userMap: Record<string, string | null> = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.name
  }

  let rows = data.map((n) => ({ ...n, user_name: userMap[n.user_id] ?? null })) as NotificationRecord[]

  if (filters.search.trim()) {
    const s = filters.search.toLowerCase()
    rows = rows.filter((n) => n.title?.toLowerCase().includes(s) || n.user_name?.toLowerCase().includes(s))
  }

  return { data: rows, total: count ?? 0 }
}

// ── Delivery stats ────────────────────────────────────────────────────────────

export async function fetchDeliveryStats(): Promise<DeliveryStats> {
  const { data, error } = await supabase
    .from('notifications')
    .select('channel, category, is_read, sent_at, failed_at')
    .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
  if (error) throw error

  const rows = data ?? []
  const channels: Record<string, number>  = {}
  const categories: Record<string, number> = {}

  for (const r of rows) {
    channels[r.channel]  = (channels[r.channel] ?? 0) + 1
    if (r.category) categories[r.category] = (categories[r.category] ?? 0) + 1
  }

  return {
    total:    rows.length,
    sent:     rows.filter((r) => r.sent_at).length,
    failed:   rows.filter((r) => r.failed_at).length,
    read:     rows.filter((r) => r.is_read).length,
    unread:   rows.filter((r) => !r.is_read).length,
    channels,
    categories,
  }
}

// ── Fetch users for targeting ─────────────────────────────────────────────────

async function resolveTargetUserIds(payload: SendPayload): Promise<string[]> {
  if (payload.target === 'user') {
    return payload.target_user_id ? [payload.target_user_id] : []
  }

  if (payload.target === 'tier') {
    // Get users on a specific subscription tier
    const { data: subs } = await supabase
      .from('user_subscriptions')
      .select('user_id, subscription_plans!inner(tier)')
      .in('status', ['active', 'trialing'])
    const filtered = (subs ?? []).filter(
      (s) => (s.subscription_plans as unknown as { tier: string } | null)?.tier === payload.target_tier,
    )
    return filtered.map((s) => s.user_id)
  }

  // 'all' — get all users
  const { data: users } = await supabase.from('users').select('id')
  return (users ?? []).map((u) => u.id)
}

// ── Send notification ─────────────────────────────────────────────────────────

export interface SendResult {
  total: number
  inserted: number
  push_queued: number
  errors: string[]
}

export async function sendNotification(payload: SendPayload): Promise<SendResult> {
  const errors: string[] = []

  // Parse extra data JSON
  let extraData: Record<string, unknown> = {}
  if (payload.data.trim()) {
    try { extraData = JSON.parse(payload.data) } catch { errors.push('Invalid JSON in data field — ignored') }
  }

  const userIds = await resolveTargetUserIds(payload)
  if (!userIds.length) return { total: 0, inserted: 0, push_queued: 0, errors: ['No target users found'] }

  // Build notification rows
  const rows = userIds.map((user_id) => ({
    user_id,
    title:      payload.title,
    body:       payload.body,
    channel:    payload.channel,
    priority:   payload.priority,
    category:   payload.category,
    data:       Object.keys(extraData).length ? extraData : null,
    action_url: payload.action_url || null,
    expires_at: null,
    is_read:    false,
    sent_at:    payload.channel === 'in_app' ? new Date().toISOString() : null,
  }))

  // Insert into notifications table (in batches of 500)
  let inserted = 0
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500)
    const { data: inserted_rows, error } = await supabase
      .from('notifications')
      .insert(batch)
      .select('id')
    if (error) { errors.push(`Batch ${i / 500 + 1}: ${error.message}`); continue }
    inserted += inserted_rows?.length ?? 0
  }

  // For push notifications: call Edge Function (FCM Admin SDK required server-side)
  let push_queued = 0
  if (payload.channel === 'push' && inserted > 0) {
    try {
      const { data: result, error: fnErr } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: userIds,
          title:    payload.title,
          body:     payload.body,
          data:     { ...extraData, action_url: payload.action_url || undefined, category: payload.category },
        },
      })
      if (fnErr) {
        errors.push(`FCM Edge Function: ${fnErr.message} — notifications saved to DB but push not delivered`)
      } else {
        push_queued = result?.queued ?? userIds.length
      }
    } catch (e) {
      errors.push(`FCM Edge Function unavailable: ${(e as Error).message} — notifications saved to DB only`)
    }
  }

  return { total: userIds.length, inserted, push_queued, errors }
}

// ── Delete notification ───────────────────────────────────────────────────────

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

export async function bulkDeleteNotifications(ids: string[]): Promise<void> {
  const { error } = await supabase.from('notifications').delete().in('id', ids)
  if (error) throw error
}

// ── Mark as read ──────────────────────────────────────────────────────────────

export async function markAllRead(userId?: string): Promise<void> {
  let q = supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('is_read', false)
  if (userId) q = q.eq('user_id', userId)
  const { error } = await q
  if (error) throw error
}

// ── FCM Edge Function stub ─────────────────────────────────────────────────────
//
// Deploy this as a Supabase Edge Function (supabase/functions/send-push-notification/index.ts):
//
// ```typescript
// import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// import admin from 'npm:firebase-admin'
//
// const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}')
// if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
//
// serve(async (req) => {
//   const { user_ids, title, body, data } = await req.json()
//   // Fetch FCM tokens from notification_preferences for these user_ids
//   // Then use admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, data })
//   return new Response(JSON.stringify({ queued: user_ids.length }), { headers: { 'Content-Type': 'application/json' } })
// })
// ```
//
// Environment variable: FIREBASE_SERVICE_ACCOUNT = JSON of your Firebase service account key
