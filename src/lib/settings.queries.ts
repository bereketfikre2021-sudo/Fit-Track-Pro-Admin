/**
 * settings.queries.ts
 * All Supabase queries for the Settings module.
 * Uses existing app_settings and subscription_plans tables only.
 *
 * app_settings schema:
 *   key TEXT PRIMARY KEY, value JSONB, description TEXT, is_public BOOLEAN, updated_at TIMESTAMPTZ
 *
 * All well-known keys are defined as constants below so they're
 * never hardcoded in UI components.
 */

import { supabase } from './supabase'

// ── Well-known setting keys ────────────────────────────────────────────────────

export const SETTING_KEYS = {
  MAINTENANCE_MODE:      'maintenance_mode',
  MIN_APP_VERSION:       'min_app_version',
  FEATURE_FLAGS:         'feature_flags',
  AI_DEFAULT_MODEL:      'ai_default_model',
  AI_FALLBACK_MODELS:    'ai_fallback_models',
  MAX_FILE_UPLOAD_MB:    'max_file_upload_mb',
  STORAGE_LIMITS:        'storage_limits',
  AI_LIMITS:             'ai_limits',
  WORKOUT_LIMITS:        'workout_limits',
  NOTIFICATION_DEFAULTS: 'notification_defaults',
  FAQ:                   'faq',
  TERMS_OF_SERVICE:      'terms_of_service',
  PRIVACY_POLICY:        'privacy_policy',
  CONTACT_INFO:          'contact_info',
} as const

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppSetting {
  key: string
  value: unknown
  description: string | null
  is_public: boolean
  updated_at: string
}

export interface FeatureFlags {
  ai: boolean
  ads: boolean
  push_notifications: boolean
  email_notifications: boolean
  ethiopian_foods: boolean
  bmi_programs: boolean
  workout_templates: boolean
  meal_plans: boolean
  progress_photos: boolean
  social_sharing: boolean
  offline_mode: boolean
  dark_mode: boolean
  [key: string]: boolean
}

export interface StorageLimits {
  free_mb: number
  pro_mb: number
  elite_mb: number
  team_mb: number
}

export interface AiLimits {
  free_daily: number
  pro_daily: number
  elite_daily: number
  team_daily: number
  max_tokens_per_request: number
  rate_limit_per_minute: number
}

export interface WorkoutLimits {
  free_max_custom_exercises: number
  pro_max_custom_exercises: number
  elite_max_custom_exercises: number
  team_max_custom_exercises: number
  free_history_days: number
  pro_history_days: number
  elite_history_days: number
  team_history_days: number
}

export interface NotificationDefaults {
  workout_reminder_enabled: boolean
  meal_reminder_enabled: boolean
  water_reminder_enabled: boolean
  subscription_reminder_enabled: boolean
  workout_reminder_time: string
  meal_reminder_breakfast: string
  meal_reminder_lunch: string
  meal_reminder_dinner: string
  water_reminder_interval_hours: number
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  order: number
}

export interface SubscriptionPlan {
  id: string
  name: string
  tier: string
  price_monthly_usd: number
  price_yearly_usd: number
  max_ai_calls_day: number
  max_devices: number
  features: Record<string, unknown>
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  is_active: boolean
}

// ── Fetch all settings ────────────────────────────────────────────────────────

export async function fetchAllSettings(): Promise<Record<string, AppSetting>> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, description, is_public, updated_at')
    .order('key')
  if (error) throw error

  const map: Record<string, AppSetting> = {}
  for (const row of data ?? []) map[row.key] = row as AppSetting
  return map
}

export async function fetchSetting(key: string): Promise<AppSetting | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, description, is_public, updated_at')
    .eq('key', key)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data as AppSetting | null
}

// ── Upsert a setting ──────────────────────────────────────────────────────────

export async function saveSetting(
  key: string,
  value: unknown,
  description?: string,
  is_public?: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key,
        value,
        ...(description !== undefined ? { description } : {}),
        ...(is_public !== undefined ? { is_public } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )
  if (error) throw error
}

// ── Subscription plans ────────────────────────────────────────────────────────

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly_usd')
  if (error) throw error
  return (data ?? []).map((p) => ({
    ...p,
    price_monthly_usd: Number(p.price_monthly_usd),
    price_yearly_usd:  Number(p.price_yearly_usd),
    features: p.features as Record<string, unknown>,
  })) as SubscriptionPlan[]
}

export async function updatePlan(
  id: string,
  updates: Partial<Pick<SubscriptionPlan, 'price_monthly_usd' | 'price_yearly_usd' | 'max_ai_calls_day' | 'max_devices' | 'features' | 'is_active' | 'stripe_price_id_monthly' | 'stripe_price_id_yearly'>>,
): Promise<void> {
  const { error } = await supabase
    .from('subscription_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Default values for settings that may not exist yet ───────────────────────

export const DEFAULTS = {
  feature_flags: {
    ai: true, ads: true, push_notifications: true, email_notifications: true,
    ethiopian_foods: true, bmi_programs: true, workout_templates: true,
    meal_plans: true, progress_photos: true, social_sharing: false,
    offline_mode: true, dark_mode: true,
  } as FeatureFlags,

  storage_limits: { free_mb: 50, pro_mb: 500, elite_mb: 2048, team_mb: 10240 } as StorageLimits,

  ai_limits: {
    free_daily: 5, pro_daily: 50, elite_daily: 200, team_daily: 1000,
    max_tokens_per_request: 2000, rate_limit_per_minute: 10,
  } as AiLimits,

  workout_limits: {
    free_max_custom_exercises: 5, pro_max_custom_exercises: 50,
    elite_max_custom_exercises: 200, team_max_custom_exercises: 1000,
    free_history_days: 30, pro_history_days: 365,
    elite_history_days: 9999, team_history_days: 9999,
  } as WorkoutLimits,

  notification_defaults: {
    workout_reminder_enabled: true, meal_reminder_enabled: true,
    water_reminder_enabled: true, subscription_reminder_enabled: true,
    workout_reminder_time: '07:00', meal_reminder_breakfast: '08:00',
    meal_reminder_lunch: '12:30', meal_reminder_dinner: '19:00',
    water_reminder_interval_hours: 2,
  } as NotificationDefaults,

  faq: [] as FaqItem[],
  terms_of_service: '',
  privacy_policy: '',
  contact_info: { email: 'support@fittrackpro.com', twitter: '', instagram: '' },
}
