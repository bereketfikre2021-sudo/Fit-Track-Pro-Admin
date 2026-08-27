/**
 * SettingsPage.tsx — Full Settings Module
 * Tabs: App Settings | Feature Flags | Maintenance | Pricing |
 *       AI Limits | Workout Limits | Storage Limits |
 *       Notifications | FAQ | Terms | Privacy
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  Settings, Zap, AlertTriangle, CreditCard, BrainCircuit,
  Dumbbell, HardDrive, Bell, HelpCircle, FileText,
  Shield, Save, Plus, Trash2, GripVertical, RefreshCw, ChevronDown,
} from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/guards/PermissionGate'
import {
  fetchAllSettings, saveSetting, fetchPlans, updatePlan,
  SETTING_KEYS, DEFAULTS,
  type AppSetting, type FeatureFlags, type StorageLimits,
  type AiLimits, type WorkoutLimits, type NotificationDefaults,
  type FaqItem, type SubscriptionPlan,
} from '@/lib/settings.queries'

const PAGE_TABS = [
  { id: 'general',  label: 'General',   icon: Settings },
  { id: 'plans',    label: 'Plans & Limits', icon: CreditCard },
  { id: 'content',  label: 'Content',   icon: FileText },
]

// ── Accordion section ─────────────────────────────────────────────────────────
function AccordionSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-card hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-border bg-card/50 px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Shared save button row ────────────────────────────────────────────────────

function SaveRow({ onSave, saving, dirty }: { onSave: () => void; saving: boolean; dirty: boolean }) {
  return (
    <div className="flex justify-end pt-4 border-t border-border mt-4">
      <PermissionGate permission="settings.edit">
        <Button onClick={onSave} loading={saving} disabled={!dirty} leftIcon={<Save className="h-4 w-4" />}>
          Save changes
        </Button>
      </PermissionGate>
    </div>
  )
}

// ── Number input helper ───────────────────────────────────────────────────────

function NumInput({ label, value, onChange, min = 0, max, hint }: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// APP SETTINGS TAB
// ════════════════════════════════════════════════════════════════════

function AppSettingsTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const [minVersion, setMinVersion] = useState(String(settings[SETTING_KEYS.MIN_APP_VERSION]?.value ?? '1.0.0'))
  const [aiModel, setAiModel] = useState(String(settings[SETTING_KEYS.AI_DEFAULT_MODEL]?.value ?? 'gemini-2.5-flash'))
  const [fallbacks, setFallbacks] = useState(String((settings[SETTING_KEYS.AI_FALLBACK_MODELS]?.value as string[])?.join(', ') ?? 'gemini-1.5-flash'))
  const [maxUpload, setMaxUpload] = useState(Number(settings[SETTING_KEYS.MAX_FILE_UPLOAD_MB]?.value ?? 10))
  const [contactEmail, setContactEmail] = useState(() => {
    const c = settings[SETTING_KEYS.CONTACT_INFO]?.value as Record<string, string> | null
    return c?.email ?? 'support@fittrackpro.com'
  })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const mark = () => setDirty(true)

  const save = async () => {
    setSaving(true)
    try {
      await Promise.all([
        saveSetting(SETTING_KEYS.MIN_APP_VERSION, minVersion),
        saveSetting(SETTING_KEYS.AI_DEFAULT_MODEL, aiModel),
        saveSetting(SETTING_KEYS.AI_FALLBACK_MODELS, fallbacks.split(',').map((s) => s.trim()).filter(Boolean)),
        saveSetting(SETTING_KEYS.MAX_FILE_UPLOAD_MB, maxUpload),
        saveSetting(SETTING_KEYS.CONTACT_INFO, { email: contactEmail }, 'Support contact info', true),
      ])
      toast.success('App settings saved')
      qc.invalidateQueries({ queryKey: ['all-settings'] })
      setDirty(false)
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 pt-5 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Application</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Minimum app version" value={minVersion} onChange={(e) => { setMinVersion(e.target.value); mark() }}
            hint="Users on older versions will see an update prompt" />
          <NumInput label="Max file upload size (MB)" value={maxUpload} onChange={(v) => { setMaxUpload(v); mark() }} min={1} max={100} />
          <Input label="Support email" type="email" value={contactEmail} onChange={(e) => { setContactEmail(e.target.value); mark() }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI Model</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Default model" value={aiModel} onChange={(e) => { setAiModel(e.target.value); mark() }}
            hint="Primary model used for all AI features (e.g. gemini-2.5-flash)" />
          <Input label="Fallback models (comma-separated)" value={fallbacks} onChange={(e) => { setFallbacks(e.target.value); mark() }}
            hint="Used in order if the default model fails (e.g. gemini-2.5-flash, gemini-1.5-flash)" />
          <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
            Current model chain: <strong className="text-foreground">{aiModel}</strong>
            {fallbacks.trim() && <> → {fallbacks.split(',').map((s) => s.trim()).join(' → ')}</>}
          </div>
        </CardContent>
      </Card>

      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FEATURE FLAGS TAB
// ════════════════════════════════════════════════════════════════════

function FeatureFlagsTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const initial = (settings[SETTING_KEYS.FEATURE_FLAGS]?.value ?? DEFAULTS.feature_flags) as FeatureFlags
  const [flags, setFlags] = useState<FeatureFlags>({ ...DEFAULTS.feature_flags, ...initial })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const toggle = (key: string) => { setFlags((f) => ({ ...f, [key]: !f[key] })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try {
      await saveSetting(SETTING_KEYS.FEATURE_FLAGS, flags, 'Feature flags controlling app functionality', true)
      toast.success('Feature flags saved')
      qc.invalidateQueries({ queryKey: ['all-settings'] })
      setDirty(false)
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const FLAG_META: Record<string, { label: string; description: string; danger?: boolean }> = {
    ai:                   { label: 'AI Features',            description: 'Enable AI exercise/meal recommendations and chat' },
    ads:                  { label: 'Advertisements',         description: 'Show AdMob banner and interstitial ads' },
    push_notifications:   { label: 'Push Notifications',     description: 'Allow FCM push notifications to be sent' },
    email_notifications:  { label: 'Email Notifications',    description: 'Allow email notification delivery' },
    ethiopian_foods:      { label: 'Ethiopian Food Database', description: 'Show Ethiopian-specific foods and categories' },
    bmi_programs:         { label: 'BMI Programs',            description: 'Enable automatic BMI-based program assignment' },
    workout_templates:    { label: 'Workout Templates',       description: 'Allow users to browse and use workout templates' },
    meal_plans:           { label: 'Meal Planning',           description: 'Enable weekly meal plan creation' },
    progress_photos:      { label: 'Progress Photos',         description: 'Allow users to upload progress photos' },
    social_sharing:       { label: 'Social Sharing',          description: 'Enable share buttons for workouts and achievements' },
    offline_mode:         { label: 'Offline Mode',            description: 'Allow app to function without internet connection' },
    dark_mode:            { label: 'Dark Mode',               description: 'Allow users to switch to dark theme' },
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">
        Feature flags are applied globally. Disabling a flag hides the feature from all users instantly.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(flags).map(([key, enabled]) => {
          const meta = FLAG_META[key]
          return (
            <div key={key} className={cn(
              'flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer',
              enabled ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
            )} onClick={() => toggle(key)}>
              <div className={cn('mt-0.5 h-5 w-9 rounded-full flex items-center transition-all shrink-0', enabled ? 'bg-primary' : 'bg-secondary')}>
                <div className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5', enabled ? 'translate-x-4' : 'translate-x-0')} />
              </div>
              <div>
                <p className="text-sm font-medium">{meta?.label ?? key}</p>
                {meta?.description && <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>}
              </div>
            </div>
          )
        })}
      </div>

      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// MAINTENANCE MODE TAB
// ════════════════════════════════════════════════════════════════════

function MaintenanceTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const raw = settings[SETTING_KEYS.MAINTENANCE_MODE]?.value
  const initial = typeof raw === 'object' && raw !== null ? raw as { enabled: boolean; message: string; ends_at: string }
    : { enabled: raw === true || raw === 'true', message: '', ends_at: '' }
  const [enabled, setEnabled] = useState(initial.enabled)
  const [message, setMessage] = useState(initial.message ?? '')
  const [endsAt, setEndsAt] = useState(initial.ends_at ?? '')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const mark = () => setDirty(true)

  const save = async () => {
    setSaving(true)
    try {
      await saveSetting(SETTING_KEYS.MAINTENANCE_MODE, { enabled, message, ends_at: endsAt }, 'Maintenance mode configuration', false)
      toast.success(enabled ? '⚠️ Maintenance mode ENABLED' : 'Maintenance mode disabled')
      qc.invalidateQueries({ queryKey: ['all-settings'] })
      setDirty(false)
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 pt-5 max-w-xl">
      {enabled && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Maintenance mode is ACTIVE</p>
            <p className="text-xs text-muted-foreground mt-0.5">All users see the maintenance screen. Only admins can access the app.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Maintenance Mode</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable maintenance mode</p>
              <p className="text-xs text-muted-foreground">Blocks all non-admin users from using the app</p>
            </div>
            <button
              onClick={() => { setEnabled((v) => !v); mark() }}
              className={cn('h-6 w-11 rounded-full transition-colors flex items-center', enabled ? 'bg-destructive' : 'bg-secondary')}
            >
              <div className={cn('h-5 w-5 rounded-full bg-white shadow transition-transform mx-0.5', enabled ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Message shown to users</label>
            <textarea rows={3} value={message} onChange={(e) => { setMessage(e.target.value); mark() }}
              placeholder="We're performing scheduled maintenance. We'll be back soon!"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Estimated end time (optional)</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => { setEndsAt(e.target.value); mark() }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            <p className="text-xs text-muted-foreground">Displayed to users so they know when to check back</p>
          </div>
        </CardContent>
      </Card>

      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// PRICING TAB
// ════════════════════════════════════════════════════════════════════

function PricingTab() {
  const qc = useQueryClient()
  const { data: plans = [], isLoading } = useQuery({ queryKey: ['plans-settings'], queryFn: fetchPlans })
  const [drafts, setDrafts] = useState<Record<string, Partial<SubscriptionPlan>>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const upd = (id: string, patch: Partial<SubscriptionPlan>) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }))
  const get = (plan: SubscriptionPlan, key: keyof SubscriptionPlan) =>
    drafts[plan.id]?.[key] !== undefined ? drafts[plan.id][key] : plan[key]

  const save = async (plan: SubscriptionPlan) => {
    const draft = drafts[plan.id]
    if (!draft) return
    setSaving(plan.id)
    try {
      await updatePlan(plan.id, draft)
      toast.success(`${plan.name} plan updated`)
      qc.invalidateQueries({ queryKey: ['plans-settings'] })
      setDrafts((d) => { const n = { ...d }; delete n[plan.id]; return n })
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(null) }
  }

  const TIER_COLOR: Record<string, string> = { free: 'text-slate-400', pro: 'text-violet-400', elite: 'text-amber-400', team: 'text-cyan-400' }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4 pt-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const isDirty = !!drafts[plan.id]
          const features = (get(plan, 'features') ?? {}) as Record<string, unknown>
          return (
            <Card key={plan.id} className={cn('transition-all', isDirty && 'border-primary/40')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={cn('capitalize', TIER_COLOR[plan.tier])}>{plan.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {isDirty && <Badge variant="warning">Unsaved</Badge>}
                    <button onClick={() => upd(plan.id, { is_active: !get(plan, 'is_active') })}
                      className={cn('h-5 w-9 rounded-full transition-colors flex items-center shrink-0', get(plan, 'is_active') ? 'bg-primary' : 'bg-secondary')}>
                      <div className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5', get(plan, 'is_active') ? 'translate-x-4' : 'translate-x-0')} />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <NumInput label="Monthly price (ETB)" value={Number(get(plan, 'price_monthly_usd')) || 0}
                  onChange={(v) => upd(plan.id, { price_monthly_usd: v })} min={0} />
                <NumInput label="Yearly price (ETB)" value={Number(get(plan, 'price_yearly_usd')) || 0}
                  onChange={(v) => upd(plan.id, { price_yearly_usd: v })} min={0} />
                <NumInput label="AI calls/day" value={Number(get(plan, 'max_ai_calls_day')) || 0}
                  onChange={(v) => upd(plan.id, { max_ai_calls_day: v })} min={0} />
                <NumInput label="Max devices" value={Number(get(plan, 'max_devices')) || 1}
                  onChange={(v) => upd(plan.id, { max_devices: v })} min={1} />

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(features).map(([k, v]) => (
                      <button key={k} onClick={() => upd(plan.id, { features: { ...features, [k]: !v } })}
                        className={cn('text-[10px] px-1.5 py-0.5 rounded border transition-colors', v ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground')}>
                        {k}
                      </button>
                    ))}
                  </div>
                </div>

                <PermissionGate permission="settings.edit">
                  <Button size="sm" className="w-full" disabled={!isDirty} loading={saving === plan.id} onClick={() => save(plan)}
                    leftIcon={<Save className="h-3.5 w-3.5" />}>
                    Save {plan.name}
                  </Button>
                </PermissionGate>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// AI LIMITS TAB
// ════════════════════════════════════════════════════════════════════

function AiLimitsTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const initial = (settings[SETTING_KEYS.AI_LIMITS]?.value ?? DEFAULTS.ai_limits) as AiLimits
  const [limits, setLimits] = useState<AiLimits>({ ...DEFAULTS.ai_limits, ...initial })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const upd = (patch: Partial<AiLimits>) => { setLimits((l) => ({ ...l, ...patch })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try { await saveSetting(SETTING_KEYS.AI_LIMITS, limits, 'AI call limits per subscription tier'); toast.success('AI limits saved'); qc.invalidateQueries({ queryKey: ['all-settings'] }); setDirty(false) }
    catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 pt-5 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Daily AI Call Limits by Tier</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumInput label="Free tier" value={limits.free_daily} onChange={(v) => upd({ free_daily: v })} min={0} hint="calls/day" />
            <NumInput label="Pro tier" value={limits.pro_daily} onChange={(v) => upd({ pro_daily: v })} min={0} hint="calls/day" />
            <NumInput label="Elite tier" value={limits.elite_daily} onChange={(v) => upd({ elite_daily: v })} min={0} hint="calls/day" />
            <NumInput label="Team tier" value={limits.team_daily} onChange={(v) => upd({ team_daily: v })} min={0} hint="calls/day" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Request Limits</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumInput label="Max tokens per request" value={limits.max_tokens_per_request} onChange={(v) => upd({ max_tokens_per_request: v })} min={100} hint="Applies to all tiers" />
            <NumInput label="Rate limit (requests/min)" value={limits.rate_limit_per_minute} onChange={(v) => upd({ rate_limit_per_minute: v })} min={1} hint="Per user" />
          </div>
        </CardContent>
      </Card>
      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// WORKOUT LIMITS TAB
// ════════════════════════════════════════════════════════════════════

function WorkoutLimitsTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const initial = (settings[SETTING_KEYS.WORKOUT_LIMITS]?.value ?? DEFAULTS.workout_limits) as WorkoutLimits
  const [limits, setLimits] = useState<WorkoutLimits>({ ...DEFAULTS.workout_limits, ...initial })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const upd = (patch: Partial<WorkoutLimits>) => { setLimits((l) => ({ ...l, ...patch })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try { await saveSetting(SETTING_KEYS.WORKOUT_LIMITS, limits, 'Workout feature limits per tier'); toast.success('Workout limits saved'); qc.invalidateQueries({ queryKey: ['all-settings'] }); setDirty(false) }
    catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5 pt-5 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Custom Exercises Limit</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumInput label="Free" value={limits.free_max_custom_exercises} onChange={(v) => upd({ free_max_custom_exercises: v })} min={0} />
            <NumInput label="Pro" value={limits.pro_max_custom_exercises} onChange={(v) => upd({ pro_max_custom_exercises: v })} min={0} />
            <NumInput label="Elite" value={limits.elite_max_custom_exercises} onChange={(v) => upd({ elite_max_custom_exercises: v })} min={0} />
            <NumInput label="Team" value={limits.team_max_custom_exercises} onChange={(v) => upd({ team_max_custom_exercises: v })} min={0} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>History Retention (days)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumInput label="Free" value={limits.free_history_days} onChange={(v) => upd({ free_history_days: v })} min={1} hint="days" />
            <NumInput label="Pro" value={limits.pro_history_days} onChange={(v) => upd({ pro_history_days: v })} min={1} hint="days" />
            <NumInput label="Elite" value={limits.elite_history_days} onChange={(v) => upd({ elite_history_days: v })} min={1} hint="9999 = unlimited" />
            <NumInput label="Team" value={limits.team_history_days} onChange={(v) => upd({ team_history_days: v })} min={1} hint="9999 = unlimited" />
          </div>
        </CardContent>
      </Card>
      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// STORAGE LIMITS TAB
// ════════════════════════════════════════════════════════════════════

function StorageLimitsTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const initial = (settings[SETTING_KEYS.STORAGE_LIMITS]?.value ?? DEFAULTS.storage_limits) as StorageLimits
  const [limits, setLimits] = useState<StorageLimits>({ ...DEFAULTS.storage_limits, ...initial })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const upd = (patch: Partial<StorageLimits>) => { setLimits((l) => ({ ...l, ...patch })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try { await saveSetting(SETTING_KEYS.STORAGE_LIMITS, limits, 'Storage limits per subscription tier in MB'); toast.success('Storage limits saved'); qc.invalidateQueries({ queryKey: ['all-settings'] }); setDirty(false) }
    catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const mbToLabel = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`

  return (
    <div className="space-y-5 pt-5 max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Storage Limits by Tier (MB)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumInput label="Free (MB)" value={limits.free_mb} onChange={(v) => upd({ free_mb: v })} min={1} hint={mbToLabel(limits.free_mb)} />
            <NumInput label="Pro (MB)" value={limits.pro_mb} onChange={(v) => upd({ pro_mb: v })} min={1} hint={mbToLabel(limits.pro_mb)} />
            <NumInput label="Elite (MB)" value={limits.elite_mb} onChange={(v) => upd({ elite_mb: v })} min={1} hint={mbToLabel(limits.elite_mb)} />
            <NumInput label="Team (MB)" value={limits.team_mb} onChange={(v) => upd({ team_mb: v })} min={1} hint={mbToLabel(limits.team_mb)} />
          </div>
          <div className="space-y-2 pt-2">
            {[{ tier: 'Free', value: limits.free_mb, max: limits.team_mb }, { tier: 'Pro', value: limits.pro_mb, max: limits.team_mb }, { tier: 'Elite', value: limits.elite_mb, max: limits.team_mb }, { tier: 'Team', value: limits.team_mb, max: limits.team_mb }].map((t) => (
              <div key={t.tier} className="flex items-center gap-3 text-sm">
                <span className="w-12 text-muted-foreground">{t.tier}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(t.value / t.max) * 100}%` }} />
                </div>
                <span className="text-xs tabular-nums w-16 text-right text-muted-foreground">{mbToLabel(t.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// NOTIFICATION DEFAULTS TAB
// ════════════════════════════════════════════════════════════════════

function NotificationDefaultsTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const initial = (settings[SETTING_KEYS.NOTIFICATION_DEFAULTS]?.value ?? DEFAULTS.notification_defaults) as NotificationDefaults
  const [nd, setNd] = useState<NotificationDefaults>({ ...DEFAULTS.notification_defaults, ...initial })
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const upd = (patch: Partial<NotificationDefaults>) => { setNd((n) => ({ ...n, ...patch })); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try { await saveSetting(SETTING_KEYS.NOTIFICATION_DEFAULTS, nd, 'Default notification preferences for new users'); toast.success('Notification defaults saved'); qc.invalidateQueries({ queryKey: ['all-settings'] }); setDirty(false) }
    catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const Toggle = ({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      <button onClick={onChange} className={cn('h-5 w-9 rounded-full transition-colors flex items-center shrink-0', checked ? 'bg-primary' : 'bg-secondary')}>
        <div className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform mx-0.5', checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
    </div>
  )

  const TimeInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
    </div>
  )

  return (
    <div className="space-y-5 pt-5 max-w-xl">
      <Card>
        <CardHeader><CardTitle>Default Notification Types</CardTitle></CardHeader>
        <CardContent>
          <Toggle label="Workout reminders" desc="Remind users before their scheduled workouts" checked={nd.workout_reminder_enabled} onChange={() => upd({ workout_reminder_enabled: !nd.workout_reminder_enabled })} />
          <Toggle label="Meal reminders" desc="Remind users to log their meals" checked={nd.meal_reminder_enabled} onChange={() => upd({ meal_reminder_enabled: !nd.meal_reminder_enabled })} />
          <Toggle label="Water reminders" desc="Remind users to stay hydrated" checked={nd.water_reminder_enabled} onChange={() => upd({ water_reminder_enabled: !nd.water_reminder_enabled })} />
          <Toggle label="Subscription reminders" desc="Alert users before subscription expires" checked={nd.subscription_reminder_enabled} onChange={() => upd({ subscription_reminder_enabled: !nd.subscription_reminder_enabled })} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Default Reminder Times</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <TimeInput label="Workout reminder time" value={nd.workout_reminder_time} onChange={(v) => upd({ workout_reminder_time: v })} />
          <div className="grid grid-cols-3 gap-3">
            <TimeInput label="Breakfast" value={nd.meal_reminder_breakfast} onChange={(v) => upd({ meal_reminder_breakfast: v })} />
            <TimeInput label="Lunch" value={nd.meal_reminder_lunch} onChange={(v) => upd({ meal_reminder_lunch: v })} />
            <TimeInput label="Dinner" value={nd.meal_reminder_dinner} onChange={(v) => upd({ meal_reminder_dinner: v })} />
          </div>
          <NumInput label="Water reminder interval (hours)" value={nd.water_reminder_interval_hours} onChange={(v) => upd({ water_reminder_interval_hours: v })} min={1} max={24} hint="How often to remind users to drink water" />
        </CardContent>
      </Card>
      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// FAQ TAB
// ════════════════════════════════════════════════════════════════════

function FaqTab({ settings }: { settings: Record<string, AppSetting> }) {
  const qc = useQueryClient()
  const initial = (settings[SETTING_KEYS.FAQ]?.value ?? DEFAULTS.faq) as FaqItem[]
  const [items, setItems] = useState<FaqItem[]>(Array.isArray(initial) ? initial : [])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const add = () => { setItems((i) => [...i, { id: crypto.randomUUID(), question: '', answer: '', category: 'general', order: i.length }]); setDirty(true) }
  const remove = (id: string) => { setItems((i) => i.filter((f) => f.id !== id)); setDirty(true) }
  const upd = (id: string, patch: Partial<FaqItem>) => { setItems((i) => i.map((f) => f.id === id ? { ...f, ...patch } : f)); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try { await saveSetting(SETTING_KEYS.FAQ, items, 'Frequently asked questions', true); toast.success('FAQ saved'); qc.invalidateQueries({ queryKey: ['all-settings'] }); setDirty(false) }
    catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} FAQ item{items.length !== 1 ? 's' : ''}</p>
        <Button size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={add}>Add question</Button>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Input label={`Question ${idx + 1}`} value={item.question} onChange={(e) => upd(item.id, { question: e.target.value })} className="flex-1" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Category</label>
                    <input value={item.category} onChange={(e) => upd(item.id, { category: e.target.value })}
                      placeholder="general" className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-28" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Answer</label>
                  <textarea rows={2} value={item.answer} onChange={(e) => upd(item.id, { answer: e.target.value })}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
                </div>
              </div>
              <button onClick={() => remove(item.id)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors mt-6 shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No FAQ items yet. Click "Add question" to get started.</p>}
      </div>
      <SaveRow onSave={save} saving={saving} dirty={dirty} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// RICH TEXT TAB (shared for Terms and Privacy)
// ════════════════════════════════════════════════════════════════════

function RichTextTab({
  settingKey, title, description, placeholder, settings,
}: {
  settingKey: string; title: string; description: string; placeholder: string
  settings: Record<string, AppSetting>
}) {
  const qc = useQueryClient()
  const initial = String(settings[settingKey]?.value ?? '')
  const [content, setContent] = useState(initial)
  const [saving, setSaving] = useState(false)
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  const save = async () => {
    setSaving(true)
    try { await saveSetting(settingKey, content, description, true); toast.success(`${title} saved`); qc.invalidateQueries({ queryKey: ['all-settings'] }) }
    catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 pt-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{wordCount.toLocaleString()} words · Markdown supported</p>
        <PermissionGate permission="settings.edit">
          <Button size="sm" loading={saving} leftIcon={<Save className="h-4 w-4" />} onClick={save} disabled={content === initial}>
            Save {title}
          </Button>
        </PermissionGate>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={30}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const { data: settings = {}, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['all-settings'],
    queryFn: fetchAllSettings,
  })

  return (
    <PageShell
      title="Settings"
      description="Configure app, plans, limits, and content."
      icon={Settings}
      actions={
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={isFetching} onClick={() => refetch()}>
          Refresh
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <>
          <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />

          {/* ── GENERAL TAB ── */}
          <TabPanel id="general" active={activeTab}>
            <div className="space-y-3 pt-4 max-w-3xl">
              <AccordionSection title="App Settings" icon={Settings} defaultOpen>
                <AppSettingsTab settings={settings} />
              </AccordionSection>
              <AccordionSection title="Feature Flags" icon={Zap}>
                <FeatureFlagsTab settings={settings} />
              </AccordionSection>
              <AccordionSection title="Maintenance Mode" icon={AlertTriangle}>
                <MaintenanceTab settings={settings} />
              </AccordionSection>
              <AccordionSection title="Notification Defaults" icon={Bell}>
                <NotificationDefaultsTab settings={settings} />
              </AccordionSection>
            </div>
          </TabPanel>

          {/* ── PLANS & LIMITS TAB ── */}
          <TabPanel id="plans" active={activeTab}>
            <div className="space-y-3 pt-4">
              <AccordionSection title="Subscription Plans & Pricing (ETB)" icon={CreditCard} defaultOpen>
                <PricingTab />
              </AccordionSection>
              <AccordionSection title="AI Call Limits" icon={BrainCircuit}>
                <AiLimitsTab settings={settings} />
              </AccordionSection>
              <AccordionSection title="Workout & History Limits" icon={Dumbbell}>
                <WorkoutLimitsTab settings={settings} />
              </AccordionSection>
              <AccordionSection title="Storage Limits" icon={HardDrive}>
                <StorageLimitsTab settings={settings} />
              </AccordionSection>
            </div>
          </TabPanel>

          {/* ── CONTENT TAB ── */}
          <TabPanel id="content" active={activeTab}>
            <div className="space-y-3 pt-4 max-w-3xl">
              <AccordionSection title="FAQ" icon={HelpCircle} defaultOpen>
                <FaqTab settings={settings} />
              </AccordionSection>
              <AccordionSection title="Terms of Service" icon={FileText}>
                <RichTextTab settingKey={SETTING_KEYS.TERMS_OF_SERVICE} title="Terms of Service"
                  description="Terms of Service content shown to users" settings={settings}
                  placeholder="# Terms of Service&#10;&#10;Last updated: ...&#10;&#10;## 1. Acceptance of Terms&#10;..." />
              </AccordionSection>
              <AccordionSection title="Privacy Policy" icon={Shield}>
                <RichTextTab settingKey={SETTING_KEYS.PRIVACY_POLICY} title="Privacy Policy"
                  description="Privacy Policy content shown to users" settings={settings}
                  placeholder="# Privacy Policy&#10;&#10;Last updated: ...&#10;&#10;## 1. Information We Collect&#10;..." />
              </AccordionSection>
            </div>
          </TabPanel>
        </>
      )}
    </PageShell>
  )
}
