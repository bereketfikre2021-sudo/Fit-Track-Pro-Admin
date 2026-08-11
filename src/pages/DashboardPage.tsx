/**
 * DashboardPage.tsx
 *
 * Single scrollable analytics page.
 * Stats → Revenue → Growth → Recent Activity.
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  LayoutDashboard, RefreshCw, AlertCircle,
  DollarSign, TrendingUp, Users,
} from 'lucide-react'
import { fetchDashboardData } from '@/lib/dashboard.queries'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { RecentUsers } from '@/components/dashboard/widgets/RecentUsers'
import { RecentPayments } from '@/components/dashboard/widgets/RecentPayments'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import { ReportShell, ReportStat } from '@/components/reports/ReportShell'
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  defaultRange, buildCsv, downloadFile, downloadPdf,
  fetchRevenueReport, fetchGrowthReport,
  type DateRange,
} from '@/lib/reports.queries'

// ── Shared chart constants ────────────────────────────────────────────────────

const CHART_COLORS = ['hsl(84 81% 44%)', 'hsl(217 91% 60%)', 'hsl(0 72% 50%)']
const CHART_STYLE  = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }
const AXIS_TICK    = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
const GRID_STROKE  = 'hsl(var(--border))'

function useReportRange(months = 3) {
  const [range, setRange] = useState<DateRange>(defaultRange(months))
  const setFrom = (v: string) => setRange((r) => ({ ...r, from: v }))
  const setTo   = (v: string) => setRange((r) => ({ ...r, to: v }))
  return { range, setFrom, setTo }
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Revenue ───────────────────────────────────────────────────────────────────

function RevenueSection() {
  const { range, setFrom, setTo } = useReportRange(6)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-revenue', range],
    queryFn: () => fetchRevenueReport(range),
  })

  const fmtEtb = (v: number) => {
    if (v >= 1000) return 'ETB ' + (v / 1000).toFixed(1) + 'k'
    return 'ETB ' + v.toFixed(0)
  }

  const exportCsv = () => {
    if (!data) return
    downloadFile(
      buildCsv(
        ['Month', 'Gross (ETB)', 'Net (ETB)', 'Fees (ETB)', 'Transactions', 'Refunds'],
        data.byMonth.map((r) => [r.month_label, r.gross.toFixed(2), r.net.toFixed(2), r.fees.toFixed(2), r.transactions, r.refunds]),
      ),
      `revenue-${range.from}.csv`, 'text/csv',
    )
  }
  const exportPdf = async () => {
    if (!data) return
    await downloadPdf(
      'Revenue Report',
      data.byMonth.map((r) => [r.month_label, formatCurrency(r.gross), formatCurrency(r.net), formatCurrency(r.fees), r.transactions, r.refunds]),
      ['Month', 'Gross', 'Net', 'Fees', 'Transactions', 'Refunds'],
    )
  }

  return (
    <ReportShell
      title="Revenue" description="Payment revenue, fees, and net breakdown by month."
      dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo}
      onRefetch={refetch} onExportCsv={exportCsv} onExportPdf={exportPdf}
      isLoading={isLoading} isFetching={isFetching}
    >
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ReportStat label="Total Gross" value={formatCurrency(data.totalGross)} color="text-primary" />
            <ReportStat label="Total Net"   value={formatCurrency(data.totalNet)}   color="text-emerald-400" />
            <ReportStat label="Total Fees"  value={formatCurrency(data.totalFees)}  color="text-red-400" />
            <ReportStat label="Avg / Month" value={formatCurrency(data.avgMonthly)} />
          </div>

          <Card>
            <CardHeader><CardTitle>Monthly Revenue (Gross vs Net)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.byMonth} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month_label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={fmtEtb} />
                  <Tooltip contentStyle={CHART_STYLE} formatter={(v: number, n) => [formatCurrency(v), n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="gross" name="Gross" fill={CHART_COLORS[0]} radius={[3,3,0,0]} maxBarSize={40} />
                  <Bar dataKey="net"   name="Net"   fill={CHART_COLORS[1]} radius={[3,3,0,0]} maxBarSize={40} />
                  <Bar dataKey="fees"  name="Fees"  fill={CHART_COLORS[2]} radius={[3,3,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </ReportShell>
  )
}

// ── Growth ────────────────────────────────────────────────────────────────────

function GrowthSection() {
  const { range, setFrom, setTo } = useReportRange(12)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-growth', range],
    queryFn: () => fetchGrowthReport(range),
  })

  const exportCsv = () => {
    if (!data) return
    downloadFile(
      buildCsv(
        ['Month', 'New Users', 'Cumulative', 'New Subs', 'MRR (ETB)'],
        data.timeline.map((r) => [r.label, r.new_users, r.cumulative, r.new_subs, r.mrr]),
      ),
      `growth-${range.from}.csv`, 'text/csv',
    )
  }
  const exportPdf = async () => {
    if (!data) return
    await downloadPdf(
      'Growth Report',
      data.timeline.map((r) => [r.label, r.new_users, r.cumulative, r.new_subs, formatCurrency(r.mrr)]),
      ['Month', 'New Users', 'Cumulative', 'New Subs', 'MRR'],
    )
  }

  return (
    <ReportShell
      title="Growth" description="User acquisition, cumulative registrations, and MRR."
      dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo}
      onRefetch={refetch} onExportCsv={exportCsv} onExportPdf={exportPdf}
      isLoading={isLoading} isFetching={isFetching}
    >
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ReportStat label="New Users"        value={data.totalNewUsers.toLocaleString()} color="text-primary" />
            <ReportStat label="New Subscriptions" value={data.totalNewSubs.toLocaleString()} color="text-blue-400" />
            <ReportStat label="Current MRR"       value={formatCurrency(data.totalMrr)}     color="text-emerald-400" />
            <ReportStat label="Peak Month"         value={data.peakMonth}                   sub="Most new users" />
          </div>

          <Card>
            <CardHeader><CardTitle>User Growth &amp; Cumulative</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data.timeline} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left"  tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar  yAxisId="left"  dataKey="new_users"   name="New users"   fill={CHART_COLORS[0]} radius={[3,3,0,0]} maxBarSize={36} />
                  <Line yAxisId="right" dataKey="cumulative"  name="Cumulative"  stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Monthly Recurring Revenue (MRR)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.timeline} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [formatCurrency(v), 'MRR']} />
                  <Line type="monotone" dataKey="mrr" name="MRR" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </ReportShell>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const {
    data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  })

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null

  return (
    <PageShell
      title="Dashboard"
      description="Live platform stats and analytics."
      icon={LayoutDashboard}
      actions={
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden sm:block text-xs text-muted-foreground">Updated {lastUpdated}</span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Refresh
          </Button>
        </div>
      }
    >
      {/* Error banner */}
      {isError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load dashboard data</p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {(error as Error)?.message ?? 'Unknown error'}. Check your admin RLS policies.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <StatsGrid stats={data?.stats} loading={isLoading} />

      {/* Revenue */}
      <SectionHeading icon={DollarSign} title="Revenue" />
      <RevenueSection />

      {/* Growth */}
      <SectionHeading icon={TrendingUp} title="Growth" />
      <GrowthSection />

      {/* Recent Activity */}
      <SectionHeading icon={Users} title="Recent Activity" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <RecentUsers data={data?.recentUsers ?? []} loading={isLoading} />
        <RecentPayments data={data?.recentPayments ?? []} loading={isLoading} />
      </div>
    </PageShell>
  )
}
