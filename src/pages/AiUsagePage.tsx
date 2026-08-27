/**
 * AiUsagePage.tsx — Full AI Administration
 * Tabs: Overview | Requests | Daily | Monthly | Features | Providers | Errors | Top Users
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BrainCircuit, RefreshCw, CheckCircle2, XCircle, Zap,
  Clock, TrendingUp, AlertTriangle, Users } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDateTime, truncate } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  fetchAiLogs, fetchAiOverviewStats, fetchDailyStats, fetchMonthlyStats,
  fetchFeatureBreakdown, fetchProviderBreakdown, fetchTopUsers, fetchErrorLogs,
  AI_FEATURES, AI_PROVIDERS, type AiFilters, type AiLog,
} from '@/lib/ai.queries'

const PAGE_SIZE = 25
const DEFAULT_FILTERS: AiFilters = {
  search: '', feature: '', provider: '', success: '',
  date_from: '', date_to: '', plan_tier: '',
}

const FEATURE_LABEL: Record<string, string> = {
  exercise_recommendation: 'Exercise Rec.',
  meal_recommendation:     'Meal Rec.',
  shopping_recommendation: 'Shopping Rec.',
  chat:      'Chat',
  analysis:  'Analysis',
  form_check:'Form Check',
  other:     'Other',
}

const CHART_COLORS = [
  'hsl(84 81% 44%)', 'hsl(217 91% 60%)', 'hsl(270 91% 65%)',
  'hsl(25 95% 53%)',  'hsl(142 71% 45%)', 'hsl(0 72% 50%)',
]

const PLAN_TIERS = ['free', 'pro', 'elite', 'team']

const PAGE_TABS = [
  { id: 'overview',   label: 'Overview',   icon: BrainCircuit },
  { id: 'requests',   label: 'Requests',   icon: Zap },
  { id: 'daily',      label: 'Daily',      icon: TrendingUp },
  { id: 'monthly',    label: 'Monthly',    icon: TrendingUp },
  { id: 'features',   label: 'Features',   icon: Zap },
  { id: 'providers',  label: 'Providers',  icon: BrainCircuit },
  { id: 'errors',     label: 'Errors',     icon: AlertTriangle },
  { id: 'top_users',  label: 'Top Users',  icon: Users },
]

// ── PillGroup — reusable pill-button toggle group ─────────────────────────────
// Defined OUTSIDE FilterBar to avoid React re-creating it on every render.

interface PillGroupProps {
  options: string[]
  value: string
  onSelect: (v: string) => void
  allLabel: string
  formatter?: (v: string) => string
}

function PillGroup({ options, value, onSelect, allLabel, formatter }: PillGroupProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect('')}
        className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
          value === ''
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onSelect(o === value ? '' : o)}
          className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
            value === o
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {formatter ? formatter(o) : o}
        </button>
      ))}
    </div>
  )
}

// ── Categorized Filter Bar ────────────────────────────────────────────────────
// Four groups: Search | Feature | Provider+Status+Plan | Date Range
// Matches the card-with-label style used in Reports and Settings pages.

function FilterBar({ filters, onChange }: { filters: AiFilters; onChange: (f: AiFilters) => void }) {
  const upd = (patch: Partial<AiFilters>) => onChange({ ...filters, ...patch })
  const hasActive = Object.values(filters).some((v) => v !== '')

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        {hasActive && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* ── Group 1: Search ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search</p>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              placeholder="User name…"
              value={filters.search}
              onChange={(e) => upd({ search: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* ── Group 2: Feature ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feature</p>
          <PillGroup
            options={[...AI_FEATURES]}
            value={filters.feature}
            onSelect={(v) => upd({ feature: v })}
            allLabel="All"
            formatter={(v) => FEATURE_LABEL[v] ?? v}
          />
        </div>

        {/* ── Group 3: Provider / Status / Plan ── */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Provider</p>
            <PillGroup
              options={[...AI_PROVIDERS]}
              value={filters.provider}
              onSelect={(v) => upd({ provider: v })}
              allLabel="All"
              formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
            <PillGroup
              options={['true', 'false']}
              value={filters.success}
              onSelect={(v) => upd({ success: v })}
              allLabel="All"
              formatter={(v) => (v === 'true' ? 'Success' : 'Failed')}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</p>
            <PillGroup
              options={PLAN_TIERS}
              value={filters.plan_tier}
              onSelect={(v) => upd({ plan_tier: v })}
              allLabel="All"
              formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
            />
          </div>
        </div>

        {/* ── Group 4: Date Range ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</p>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground">From</label>
            <input type="date" value={filters.date_from}
              onChange={(e) => upd({ date_from: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground">To</label>
            <input type="date" value={filters.date_to}
              onChange={(e) => upd({ date_to: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          {/* Quick date presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              { label: 'Today', days: 0 },
              { label: '7d',    days: 7 },
              { label: '30d',   days: 30 },
              { label: '90d',   days: 90 },
            ].map(({ label, days }) => {
              const today = new Date().toISOString().slice(0, 10)
              const from  = new Date()
              from.setDate(from.getDate() - days)
              const fromStr = from.toISOString().slice(0, 10)
              const isActive = days === 0
                ? filters.date_from === today && filters.date_to === today
                : filters.date_from === fromStr && filters.date_to === ''
              return (
                <button key={label}
                  onClick={() => upd(days === 0
                    ? { date_from: today, date_to: today }
                    : { date_from: fromStr, date_to: '' }
                  )}
                  className={`h-6 px-2.5 rounded-full text-[10px] font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActive && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
          {filters.search && (
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium">
              "{filters.search}" <button onClick={() => upd({ search: '' })} className="hover:opacity-60">×</button>
            </span>
          )}
          {filters.feature && (
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium">
              {FEATURE_LABEL[filters.feature] ?? filters.feature} <button onClick={() => upd({ feature: '' })} className="hover:opacity-60">×</button>
            </span>
          )}
          {filters.provider && (
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium capitalize">
              {filters.provider} <button onClick={() => upd({ provider: '' })} className="hover:opacity-60">×</button>
            </span>
          )}
          {filters.success && (
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium">
              {filters.success === 'true' ? 'Success only' : 'Failures only'} <button onClick={() => upd({ success: '' })} className="hover:opacity-60">×</button>
            </span>
          )}
          {filters.plan_tier && (
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium capitalize">
              {filters.plan_tier} plan <button onClick={() => upd({ plan_tier: '' })} className="hover:opacity-60">×</button>
            </span>
          )}
          {(filters.date_from || filters.date_to) && (
            <span className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-primary/15 text-primary text-[11px] font-medium">
              {filters.date_from}{filters.date_from && filters.date_to ? ' → ' : ''}{filters.date_to} <button onClick={() => upd({ date_from: '', date_to: '' })} className="hover:opacity-60">×</button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Log table (shared) ────────────────────────────────────────────────────────

function LogTable({ logs }: { logs: AiLog[] }) {
  if (!logs.length) return <p className="text-sm text-muted-foreground py-8 text-center">No requests found</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider / Model</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Tokens</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Latency</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((r) => (
            <tr key={r.id} className="hover:bg-muted/20">
              <td className="px-4 py-2.5">
                <div className="font-medium truncate max-w-[120px]">{r.user_name ?? <span className="italic text-muted-foreground">—</span>}</div>
                {r.plan_tier && <div className="text-xs text-muted-foreground uppercase">{r.plan_tier}</div>}
              </td>
              <td className="px-4 py-2.5"><Badge variant="default">{FEATURE_LABEL[r.feature] ?? r.feature}</Badge></td>
              <td className="px-4 py-2.5 hidden sm:table-cell">
                <div className="text-muted-foreground capitalize">{r.provider}</div>
                {r.model && <div className="text-xs text-muted-foreground font-mono">{truncate(r.model, 20)}</div>}
              </td>
              <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">
                {r.total_tokens?.toLocaleString() ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">
                {r.latency_ms ? `${r.latency_ms}ms` : '—'}
              </td>
              <td className="px-4 py-2.5">
                {r.success
                  ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />OK</span>
                  : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="h-3.5 w-3.5" />Fail</span>}
              </td>
              <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">
                {formatDateTime(r.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['ai-overview-stats'],
    queryFn: fetchAiOverviewStats,
    refetchInterval: 60_000,
  })
  const { data: daily = [] } = useQuery({
    queryKey: ['ai-daily', 14],
    queryFn: () => fetchDailyStats(14),
  })
  const { data: features = [] } = useQuery({
    queryKey: ['ai-features'],
    queryFn: () => fetchFeatureBreakdown(),
  })

  const statCards = [
    { label: 'Total requests', value: stats?.total.toLocaleString(), icon: Zap, color: 'text-primary' },
    { label: 'Today', value: stats?.today.toLocaleString(), icon: TrendingUp, color: 'text-blue-400' },
    { label: 'This month', value: stats?.thisMonth.toLocaleString(), icon: TrendingUp, color: 'text-violet-400' },
    { label: 'Success rate', value: stats ? `${stats.successRate}%` : '—', icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Total tokens (last 1000)', value: stats?.totalTokens.toLocaleString(), icon: Zap, color: 'text-amber-400' },
    { label: 'Avg latency (last 1000)', value: stats?.avgLatency ? `${stats.avgLatency}ms` : '—', icon: Clock, color: 'text-cyan-400' },
    { label: 'Total failures', value: stats?.failures.toLocaleString(), icon: XCircle, color: 'text-red-400' },
  ]

  return (
    <div className="space-y-5 pt-5">
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-xl font-bold tabular-nums">{s.value ?? '—'}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* 14-day requests chart */}
      <Card>
        <CardHeader><CardTitle>Requests vs Failures — Last 14 days</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(84 81% 44%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(84 81% 44%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0 72% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0 72% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }}
                labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="requests" name="Requests" stroke="hsl(84 81% 44%)" strokeWidth={2} fill="url(#reqGrad)" dot={false} />
              <Area type="monotone" dataKey="failures" name="Failures" stroke="hsl(0 72% 50%)" strokeWidth={2} fill="url(#failGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature breakdown pie */}
      {features.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader><CardTitle>Requests by Feature</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={features} dataKey="count" nameKey="feature" cx="50%" cy="50%" outerRadius={80} label={({ feature, percent }) => `${FEATURE_LABEL[feature] ?? feature} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {features.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, FEATURE_LABEL[name] ?? name]} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Avg Latency by Feature (ms)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={features.map((f) => ({ ...f, feature_label: FEATURE_LABEL[f.feature] ?? f.feature }))} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="feature_label" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} formatter={(v: number) => [`${v}ms`, 'Avg latency']} />
                  <Bar dataKey="avg_latency" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Requests Tab ──────────────────────────────────────────────────────────────

function RequestsTab() {
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<AiFilters>(DEFAULT_FILTERS)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['ai-logs', page, filters],
    queryFn: () => fetchAiLogs(page, PAGE_SIZE, filters),
    placeholderData: (p) => p,
  })

  return (
    <div className="space-y-4 pt-5">
      <FilterBar filters={filters} onChange={(f) => { setFilters(f); setPage(0) }} />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Total: <strong className="text-foreground">{data?.total.toLocaleString() ?? '—'}</strong></span>
        {isFetching && <Spinner size="sm" />}
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : <LogTable logs={data?.data ?? []} />}
      <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
    </div>
  )
}

// ── Daily Stats Tab ───────────────────────────────────────────────────────────

function DailyTab() {
  const [days, setDays] = useState(30)
  const { data = [], isLoading } = useQuery({
    queryKey: ['ai-daily', days],
    queryFn: () => fetchDailyStats(days),
  })

  return (
    <div className="space-y-5 pt-5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show last</span>
        {[7, 14, 30, 60, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
            {d}d
          </button>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          {/* Requests area chart */}
          <Card>
            <CardHeader><CardTitle>Daily Requests — last {days} days</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(84 81% 44%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(84 81% 44%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false}
                    tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="requests" name="Requests" stroke="hsl(84 81% 44%)" fill="url(#dReq)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="failures" name="Failures" stroke="hsl(0 72% 50%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tokens & latency */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle>Daily Token Usage</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                    <Bar dataKey="total_tokens" name="Tokens" fill="hsl(270 91% 65%)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Avg Response Time (ms)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} unit="ms" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }}
                      formatter={(v: number) => [`${v}ms`, 'Avg latency']}
                      labelFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                    <Line type="monotone" dataKey="avg_latency" name="Avg latency" stroke="hsl(25 95% 53%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Requests</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Successes</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Failures</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Tokens</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...data].reverse().filter((d) => d.requests > 0).map((d) => (
                  <tr key={d.date} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{d.requests}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400 tabular-nums">{d.successes}</td>
                    <td className="px-4 py-2.5 text-right text-red-400 tabular-nums">{d.failures}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{d.total_tokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{d.avg_latency ? `${d.avg_latency}ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Monthly Stats Tab ─────────────────────────────────────────────────────────

function MonthlyTab() {
  const { data = [], isLoading } = useQuery({ queryKey: ['ai-monthly'], queryFn: () => fetchMonthlyStats(12) })

  return (
    <div className="space-y-5 pt-5">
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <Card>
            <CardHeader><CardTitle>Monthly Requests — last 12 months</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="successes" name="Successes" stackId="a" fill="hsl(84 81% 44%)" radius={[0, 0, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="failures"  name="Failures"  stackId="a" fill="hsl(0 72% 50%)"  radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Monthly Token Usage</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }}
                    formatter={(v: number) => [v.toLocaleString(), 'Tokens']} />
                  <Bar dataKey="total_tokens" name="Tokens" fill="hsl(270 91% 65%)" radius={[3, 3, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Month','Requests','Successes','Failures','Success rate','Tokens','Avg latency'].map((h) => (
                    <th key={h} className="px-4 py-3 text-right first:text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...data].reverse().map((m) => (
                  <tr key={m.month} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{m.month_label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.requests.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-400 tabular-nums">{m.successes.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-red-400 tabular-nums">{m.failures.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">
                      {m.requests ? `${Math.round((m.successes / m.requests) * 100)}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{m.total_tokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{m.avg_latency ? `${m.avg_latency}ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Features Tab ──────────────────────────────────────────────────────────────

function FeaturesTab() {
  const { data: features = [], isLoading } = useQuery({ queryKey: ['ai-features'], queryFn: () => fetchFeatureBreakdown() })

  return (
    <div className="space-y-5 pt-5">
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <Card>
            <CardHeader><CardTitle>Requests by Feature</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={features.map((f) => ({ ...f, label: FEATURE_LABEL[f.feature] ?? f.feature }))} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                  <Bar dataKey="count" name="Requests" fill="hsl(84 81% 44%)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Feature','Requests','Success rate','Total tokens','Avg tokens','Avg latency'].map((h) => (
                    <th key={h} className="px-4 py-3 text-right first:text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {features.map((f) => (
                  <tr key={f.feature} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5"><Badge variant="default">{FEATURE_LABEL[f.feature] ?? f.feature}</Badge></td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{f.count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{f.count ? `${Math.round((f.successes / f.count) * 100)}%` : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{f.total_tokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{f.count ? Math.round(f.total_tokens / f.count).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{f.avg_latency ? `${f.avg_latency}ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Providers Tab ─────────────────────────────────────────────────────────────

function ProvidersTab() {
  const { data: providers = [], isLoading } = useQuery({ queryKey: ['ai-providers'], queryFn: () => fetchProviderBreakdown() })

  return (
    <div className="space-y-5 pt-5">
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p, idx) => (
              <div key={p.provider} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold capitalize">{p.provider}</span>
                  <div className="h-3 w-3 rounded-full" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                </div>
                <p className="text-2xl font-bold tabular-nums">{p.count.toLocaleString()}</p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Tokens: <strong className="text-foreground">{p.total_tokens.toLocaleString()}</strong></span>
                  <span>Avg latency: <strong className="text-foreground">{p.avg_latency ? `${p.avg_latency}ms` : '—'}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {providers.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Requests by Provider</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={providers} dataKey="count" nameKey="provider" cx="50%" cy="50%" outerRadius={80}
                      label={({ provider, percent }) => `${provider} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {providers.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ── Errors Tab ────────────────────────────────────────────────────────────────

function ErrorsTab() {
  const [filters, setFilters] = useState<AiFilters>({ ...DEFAULT_FILTERS, success: 'false' })
  const [page, setPage] = useState(0)

  const { data: errors, isLoading } = useQuery({
    queryKey: ['ai-errors'],
    queryFn: () => fetchErrorLogs(200),
  })

  const displayed = (errors ?? []).filter((e) => {
    if (filters.feature && e.feature !== filters.feature) return false
    if (filters.provider && e.provider !== filters.provider) return false
    if (filters.search.trim() && !e.user_name?.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4 pt-5">
      <FilterBar filters={{ ...filters, success: 'false' }} onChange={(f) => { setFilters({ ...f, success: 'false' }); setPage(0) }} />
      <div className="text-xs text-muted-foreground">Showing last 200 failures — {displayed.length} match current filter</div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Feature</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Error</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((e) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{e.user_name ?? <span className="italic text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-2.5"><Badge variant="danger">{FEATURE_LABEL[e.feature] ?? e.feature}</Badge></td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{e.provider}</td>
                  <td className="px-4 py-2.5 max-w-[280px]">
                    <p className="text-xs text-red-400 font-mono truncate">{e.error_message ?? 'Unknown error'}</p>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">{formatDateTime(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={displayed.length} onChange={setPage} />
    </div>
  )
}

// ── Top Users Tab ─────────────────────────────────────────────────────────────

function TopUsersTab() {
  const { data: topUsers = [], isLoading } = useQuery({ queryKey: ['ai-top-users'], queryFn: () => fetchTopUsers(20) })
  const maxCount = topUsers[0]?.count ?? 1

  return (
    <div className="space-y-4 pt-5">
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <Card>
            <CardHeader><CardTitle>Top 10 Users by Request Count</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topUsers.slice(0, 10).map((u) => ({ ...u, name: u.user_name ?? u.user_id.slice(0, 8) }))}
                  layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={100} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                  <Bar dataKey="count" name="Requests" fill="hsl(84 81% 44%)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Requests</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total tokens</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topUsers.map((u, idx) => (
                  <tr key={u.user_id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-bold text-muted-foreground">#{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{u.user_name ?? <span className="italic text-muted-foreground">{u.user_id.slice(0, 8)}…</span>}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{u.count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{u.total_tokens.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 rounded-full bg-primary/30 w-20 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(u.count / maxCount) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{Math.round((u.count / maxCount) * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AiUsagePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const { refetch: refetchOverview } = useQuery({ queryKey: ['ai-overview-stats'], queryFn: fetchAiOverviewStats, enabled: false })

  return (
    <PageShell
      title="AI Administration"
      description="Monitor AI usage, token consumption, latency, errors, and user quotas."
      icon={BrainCircuit}
      actions={
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => refetchOverview()}>
          Refresh
        </Button>
      }
    >
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="overview"  active={activeTab}><OverviewTab /></TabPanel>
      <TabPanel id="requests"  active={activeTab}><RequestsTab /></TabPanel>
      <TabPanel id="daily"     active={activeTab}><DailyTab /></TabPanel>
      <TabPanel id="monthly"   active={activeTab}><MonthlyTab /></TabPanel>
      <TabPanel id="features"  active={activeTab}><FeaturesTab /></TabPanel>
      <TabPanel id="providers" active={activeTab}><ProvidersTab /></TabPanel>
      <TabPanel id="errors"    active={activeTab}><ErrorsTab /></TabPanel>
      <TabPanel id="top_users" active={activeTab}><TopUsersTab /></TabPanel>
    </PageShell>
  )
}
