/**
 * DashboardPage.tsx
 * Layout matches screenshot exactly:
 *   Row 1: 4 flat stat cards (label top, huge value, trend below — no icons)
 *   Row 2: Sales Overview (donut LEFT + breakdown RIGHT) | Two metric cards + area chart
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { LayoutDashboard, RefreshCw, AlertCircle, TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react'
import { fetchDashboardData } from '@/lib/dashboard.queries'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

const CHART_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '0.5rem',
  fontSize: 11,
  color: 'hsl(var(--foreground))',
}
const AXIS_TICK  = { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }
const GRID_COLOR = 'hsl(var(--border))'

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

// ── Row 1: flat stat card — label, huge value, trend ─────────────────────────
function StatCard({
  label, value, trend, trendLabel,
}: {
  label: string; value: string; trend?: string; trendLabel?: string; positive?: boolean
}) {
  const isPositive = trend?.startsWith('+') ?? true
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</p>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive
            ? <TrendingUp className="h-3.5 w-3.5" />
            : <TrendingDown className="h-3.5 w-3.5" />}
          <span>{trend}</span>
          {trendLabel && <span className="text-muted-foreground font-normal ml-0.5">{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}

// ── Row 2 Left: Sales Overview with large donut ───────────────────────────────
function SalesOverviewCard({ stats, loading }: { stats: any; loading: boolean }) {
  const total = (stats?.totalUsers ?? 0)
  const paid  = (stats?.proUsers ?? 0) + (stats?.eliteUsers ?? 0) + (stats?.teamUsers ?? 0)
  const free  = stats?.freeUsers ?? 0

  // Donut segments — thick ring, two colors like screenshot (bright green + dark)
  const donutData = [
    { value: paid > 0 ? paid : 1,  color: 'hsl(var(--primary))' },
    { value: free > 0 ? free : 0,  color: 'hsl(0 0% 25%)' },
  ]

  // Category breakdown — maps to the screenshot's 4-item grid
  const breakdown = [
    { label: 'Pro',    value: stats?.proUsers   ?? 0, dot: 'hsl(var(--primary))' },
    { label: 'Elite',  value: stats?.eliteUsers ?? 0, dot: 'hsl(217 91% 60%)' },
    { label: 'Team',   value: stats?.teamUsers  ?? 0, dot: 'hsl(270 91% 65%)' },
    { label: 'Free',   value: free,                   dot: 'hsl(0 0% 45%)' },
  ]

  const revenue = stats?.monthlyRevenue ?? 0

  return (
    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-foreground">User Overview</p>
        <button className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-stretch gap-8">
        {/* Large donut — thick ring like screenshot */}
        <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%" cy="50%"
                innerRadius={58} outerRadius={82}
                paddingAngle={3}
                dataKey="value"
                startAngle={90} endAngle={-270}
                strokeWidth={0}
              >
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text — exactly like "102k / Weekly Visits" in screenshot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold text-foreground tabular-nums leading-none">
              {loading ? '—' : fmt(total)}
            </span>
            <span className="text-xs text-muted-foreground mt-1 text-center leading-tight">
              Total<br />Users
            </span>
          </div>
        </div>

        {/* Right side: revenue pill + 2x2 breakdown grid */}
        <div className="flex-1 flex flex-col justify-between gap-4">
          {/* Revenue pill — matches "Number of Sales / $71,020" */}
          <div className="flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 shrink-0">
              <span className="text-primary font-bold text-sm">ETB</span>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Monthly Revenue</p>
              <p className="text-base font-bold text-foreground tabular-nums leading-tight">
                {loading ? '—' : formatCurrency(revenue)}
              </p>
            </div>
          </div>

          {/* 2×2 breakdown grid — matches Electronic/Furniture/Clothes/Shoes */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {breakdown.map(b => (
              <div key={b.label} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: b.dot }} />
                <div>
                  <p className="text-[11px] text-muted-foreground">{b.label}</p>
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {loading ? '—' : b.value.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Row 2 Right top: two small metric cards side by side ─────────────────────
function MetricCard({
  label, value, sub, iconBg, iconColor,
}: {
  label: string; value: string; sub?: string; iconBg: string; iconColor: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 flex-1">
      {/* Small colored icon square — like screenshot top-left of each card */}
      <div className={`flex h-7 w-7 items-center justify-center rounded-md ${iconBg}`}>
        <div className={`h-3 w-3 rounded-sm ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Row 2 Right bottom: area chart (Total Profit) ────────────────────────────
function TotalProfitChart({ data, loading }: { data: any; loading: boolean }) {
  const chartData = (data?.revenue ?? []) as { month: string; revenue: number }[]
  const total = chartData.reduce((s, d) => s + d.revenue, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
      <div>
        <p className="text-xs text-muted-foreground">Total Profit:</p>
        <p className="text-base font-bold text-foreground tabular-nums">
          {loading ? '—' : formatCurrency(total)}
        </p>
      </div>
      {loading ? (
        <div className="h-28 flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -32, bottom: 0 }}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
            <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : ''} />
            <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
            <Area type="monotone" dataKey="revenue"
              stroke="hsl(var(--primary))" strokeWidth={2}
              fill="url(#profitGrad)" dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function DashboardPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  })

  // Realtime: auto-refresh when new users register or payments change
  useEffect(() => {
    const ch = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' },
        () => qc.invalidateQueries({ queryKey: ['dashboard'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' },
        () => qc.invalidateQueries({ queryKey: ['dashboard'] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_subscriptions' },
        () => qc.invalidateQueries({ queryKey: ['dashboard'] }))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [qc])

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null
  const s = data?.stats

  // Real trend: compare current month vs previous month revenue from chart data
  const revenuePoints = data?.revenue ?? []
  const currentMonthRev = revenuePoints[revenuePoints.length - 1]?.revenue ?? 0
  const prevMonthRev    = revenuePoints[revenuePoints.length - 2]?.revenue ?? 0
  const revTrend = prevMonthRev > 0
    ? `${currentMonthRev >= prevMonthRev ? '+' : ''}${(((currentMonthRev - prevMonthRev) / prevMonthRev) * 100).toFixed(1)}%`
    : null

  // User growth trend: this month vs last month
  const userGrowth = data?.userGrowth ?? []
  const midIdx = Math.floor(userGrowth.length / 2)
  const recentUsers  = userGrowth.slice(midIdx).reduce((s, p) => s + p.count, 0)
  const previousUsers = userGrowth.slice(0, midIdx).reduce((s, p) => s + p.count, 0)
  const userTrend = previousUsers > 0
    ? `${recentUsers >= previousUsers ? '+' : ''}${(((recentUsers - previousUsers) / previousUsers) * 100).toFixed(1)}%`
    : null

  return (
    <PageShell
      title="Overview"
      description="Live platform summary."
      icon={LayoutDashboard}
      actions={
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="hidden sm:block text-xs text-muted-foreground">Updated {lastUpdated}</span>}
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Refresh</Button>
        </div>
      }
    >
      {isError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
          <p className="text-sm text-destructive">{(error as Error)?.message ?? 'Failed to load'}</p>
        </div>
      )}

      {/* Row 1: 4 flat stat cards — no icons, label top, huge value, trend below */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net Revenue"
          value={s ? formatCurrency(s.monthlyRevenue) : '—'}
          trend={revTrend ?? '+0.0%'}
          trendLabel="vs last month"
        />
        <StatCard
          label="Active Subscriptions"
          value={s ? fmt(s.activeSubscriptions) : '—'}
          trend={null}
          trendLabel=""
        />
        <StatCard
          label="Active Users (30d)"
          value={s ? fmt(s.activeUsers) : '—'}
          trend={userTrend ?? null}
          trendLabel="vs prev 15d"
        />
        <StatCard
          label="Total Users"
          value={s ? fmt(s.totalUsers) : '—'}
          trend={null}
          trendLabel=""
        />
      </div>

      {/* Row 2: Sales Overview (60%) | Two metric cards + area chart (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Left — Sales Overview with big donut (takes 3/5) */}
        <div className="lg:col-span-3">
          <SalesOverviewCard stats={s} loading={isLoading} />
        </div>

        {/* Right — two small cards on top + area chart below (takes 2/5) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Two metric cards side by side */}
          <div className="flex gap-4">
            <MetricCard
              label="New Customers"
              value={s ? fmt(s.activeUsers) : '—'}
              sub="Last Week"
              iconBg="bg-primary/20"
              iconColor="bg-primary"
            />
            <MetricCard
              label="AI Requests"
              value={s ? fmt(s.aiRequestsToday) : '—'}
              sub="Today"
              iconBg="bg-blue-500/20"
              iconColor="bg-blue-400"
            />
          </div>

          {/* Area chart — Total Profit */}
          <TotalProfitChart data={data} loading={isLoading} />
        </div>
      </div>
    </PageShell>
  )
}
