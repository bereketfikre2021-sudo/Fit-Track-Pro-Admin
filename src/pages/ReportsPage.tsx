/**
 * ReportsPage.tsx — Full Reports Module
 * 7 reports: Revenue, Subscription, Workout, Nutrition, AI Usage, Retention, Growth
 */

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { BarChart3, DollarSign, CreditCard, Dumbbell, Salad,
  BrainCircuit, Users, TrendingUp } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import { ReportShell, ReportStat } from '@/components/reports/ReportShell'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  defaultRange, buildCsv, downloadFile, downloadPdf,
  fetchRevenueReport, fetchSubscriptionReport, fetchWorkoutReport,
  fetchNutritionReport, fetchAiReport, fetchRetentionReport, fetchGrowthReport,
  type DateRange,
} from '@/lib/reports.queries'

const CHART_COLORS = ['hsl(84 81% 44%)', 'hsl(217 91% 60%)', 'hsl(270 91% 65%)', 'hsl(25 95% 53%)', 'hsl(142 71% 45%)', 'hsl(0 72% 50%)']
const CHART_STYLE  = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }
const AXIS_TICK    = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' }
const GRID_STROKE  = 'hsl(var(--border))'

function useReportRange(months = 3) {
  const [range, setRange] = useState<DateRange>(defaultRange(months))
  const setFrom = (v: string) => setRange((r) => ({ ...r, from: v }))
  const setTo   = (v: string) => setRange((r) => ({ ...r, to: v }))
  return { range, setFrom, setTo }
}

const PAGE_TABS = [
  { id: 'revenue',      label: 'Revenue',      icon: DollarSign },
  { id: 'subscription', label: 'Subscriptions',icon: CreditCard },
  { id: 'workout',      label: 'Workouts',     icon: Dumbbell },
  { id: 'nutrition',    label: 'Nutrition',    icon: Salad },
  { id: 'ai',           label: 'AI Usage',     icon: BrainCircuit },
  { id: 'retention',    label: 'Retention',    icon: Users },
  { id: 'growth',       label: 'Growth',       icon: TrendingUp },
]

// ════════════════════════════════════════════════════════════════════
// REVENUE REPORT
// ════════════════════════════════════════════════════════════════════

function RevenueReport() {
  const { range, setFrom, setTo } = useReportRange(6)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-revenue', range],
    queryFn: () => fetchRevenueReport(range),
  })

  const exportCsv = () => {
    if (!data) return
    const headers = ['Month', 'Gross ($)', 'Net ($)', 'Fees ($)', 'Transactions', 'Refunds']
    const rows = data.byMonth.map((r) => [r.month_label, r.gross.toFixed(2), r.net.toFixed(2), r.fees.toFixed(2), r.transactions, r.refunds])
    downloadFile(buildCsv(headers, rows), `revenue-report-${range.from}-${range.to}.csv`, 'text/csv')
  }
  const exportPdf = async () => {
    if (!data) return
    await downloadPdf('Revenue Report', data.byMonth.map((r) => [r.month_label, `$${r.gross.toFixed(2)}`, `$${r.net.toFixed(2)}`, `$${r.fees.toFixed(2)}`, r.transactions, r.refunds]), ['Month', 'Gross', 'Net', 'Fees', 'Transactions', 'Refunds'])
  }

  return (
    <ReportShell title="Revenue Report" description="Payment revenue, fees, and net breakdown by month."
      dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo} onRefetch={refetch}
      onExportCsv={exportCsv} onExportPdf={exportPdf} isLoading={isLoading} isFetching={isFetching}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <ReportStat label="Total Gross" value={formatCurrency(data.totalGross)} color="text-primary" />
            <ReportStat label="Total Net" value={formatCurrency(data.totalNet)} color="text-emerald-400" />
            <ReportStat label="Total Fees" value={formatCurrency(data.totalFees)} color="text-red-400" />
            <ReportStat label="Transactions" value={data.totalTransactions.toLocaleString()} />
            <ReportStat label="Avg/Month" value={formatCurrency(data.avgMonthly)} />
          </div>

          <Card><CardHeader><CardTitle>Monthly Revenue (Gross vs Net)</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byMonth} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="month_label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip contentStyle={CHART_STYLE} formatter={(v: number, n) => [formatCurrency(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="gross" name="Gross" fill={CHART_COLORS[0]} radius={[3,3,0,0]} maxBarSize={40} />
                <Bar dataKey="net"   name="Net"   fill={CHART_COLORS[1]} radius={[3,3,0,0]} maxBarSize={40} />
                <Bar dataKey="fees"  name="Fees"  fill={CHART_COLORS[5]} radius={[3,3,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer></CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card><CardHeader><CardTitle>Revenue by Provider</CardTitle></CardHeader>
              <CardContent><ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={Object.entries(data.byProvider).map(([k, v]) => ({ name: k, value: v }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {Object.keys(data.byProvider).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie><Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [formatCurrency(v)]} /></PieChart>
              </ResponsiveContainer></CardContent>
            </Card>

            <Card><CardHeader><CardTitle>Monthly Transactions</CardTitle></CardHeader>
              <CardContent><ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byMonth} margin={{ top:4,right:4,left:-20,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="month_label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Bar dataKey="transactions" name="Transactions" fill={CHART_COLORS[2]} radius={[3,3,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer></CardContent>
            </Card>
          </div>
        </div>
      )}
    </ReportShell>
  )
}

// ════════════════════════════════════════════════════════════════════
// SUBSCRIPTION REPORT
// ════════════════════════════════════════════════════════════════════

function SubscriptionReport() {
  const { range, setFrom, setTo } = useReportRange(6)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-subscription', range],
    queryFn: () => fetchSubscriptionReport(range),
  })

  const exportCsv = () => {
    if (!data) return
    const headers = ['Month', 'New Subs', 'Cancellations', 'Net Change', 'Active Total']
    const rows = data.timeline.map((r) => [r.label, r.new_subs, r.cancellations, r.net, r.active_total])
    downloadFile(buildCsv(headers, rows), `subscription-report-${range.from}-${range.to}.csv`, 'text/csv')
  }
  const exportPdf = async () => {
    if (!data) return
    await downloadPdf('Subscription Report', data.timeline.map((r) => [r.label, r.new_subs, r.cancellations, r.net, r.active_total]), ['Month', 'New', 'Cancelled', 'Net', 'Active'])
  }

  return (
    <ReportShell title="Subscription Report" description="Subscription growth, churn, and tier distribution."
      dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo} onRefetch={refetch}
      onExportCsv={exportCsv} onExportPdf={exportPdf} isLoading={isLoading} isFetching={isFetching}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <ReportStat label="Active Now" value={data.activeNow.toLocaleString()} color="text-emerald-400" />
            <ReportStat label="Trialing" value={data.trialNow.toLocaleString()} color="text-blue-400" />
            <ReportStat label="New (period)" value={data.newRange.toLocaleString()} color="text-primary" />
            <ReportStat label="Cancelled (period)" value={data.cancelledRange.toLocaleString()} color="text-red-400" />
            <ReportStat label="Churn Rate" value={`${data.churnRate}%`} color={data.churnRate > 20 ? 'text-red-400' : 'text-emerald-400'} />
          </div>

          <Card><CardHeader><CardTitle>Subscription Timeline</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data.timeline} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="new_subs" name="New" fill={CHART_COLORS[0]} maxBarSize={28} radius={[3,3,0,0]} />
                <Bar yAxisId="left" dataKey="cancellations" name="Cancelled" fill={CHART_COLORS[5]} maxBarSize={28} radius={[3,3,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="active_total" name="Active total" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer></CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card><CardHeader><CardTitle>Active Users by Tier</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  {Object.entries(data.byTier).map(([tier, count]) => {
                    const total = Object.values(data.byTier).reduce((a, b) => a + b, 0)
                    const pct = total ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={tier} className="flex items-center gap-3">
                        <span className="w-16 text-sm font-medium capitalize">{tier}</span>
                        <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm tabular-nums w-16 text-right">{count.toLocaleString()} <span className="text-muted-foreground">({pct}%)</span></span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card><CardHeader><CardTitle>Timeline Table</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto"><table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    {['Month','New','Cancelled','Net','Active'].map((h) => <th key={h} className="pb-2 text-right first:text-left font-medium text-muted-foreground">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {[...data.timeline].reverse().map((r) => (
                      <tr key={r.date} className="hover:bg-muted/20">
                        <td className="py-1.5 font-medium">{r.label}</td>
                        <td className="py-1.5 text-right text-emerald-400 tabular-nums">{r.new_subs}</td>
                        <td className="py-1.5 text-right text-red-400 tabular-nums">{r.cancellations}</td>
                        <td className={`py-1.5 text-right tabular-nums ${r.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.net >= 0 ? '+' : ''}{r.net}</td>
                        <td className="py-1.5 text-right tabular-nums">{r.active_total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </ReportShell>
  )
}

// ════════════════════════════════════════════════════════════════════
// WORKOUT REPORT
// ════════════════════════════════════════════════════════════════════

function WorkoutReport() {
  const { range, setFrom, setTo } = useReportRange(3)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-workout', range],
    queryFn: () => fetchWorkoutReport(range),
  })

  const exportCsv = () => {
    if (!data) return
    const headers = ['Week', 'Completed', 'Skipped', 'Calories', 'Avg Effort']
    downloadFile(buildCsv(headers, data.timeline.map((r) => [r.label, r.completed, r.skipped, r.calories, r.avg_effort])), `workout-report-${range.from}-${range.to}.csv`, 'text/csv')
  }
  const exportPdf = async () => {
    if (!data) return
    await downloadPdf('Workout Report', data.timeline.map((r) => [r.label, r.completed, r.skipped, r.calories, r.avg_effort]), ['Week', 'Completed', 'Skipped', 'Calories', 'Avg Effort'])
  }

  return (
    <ReportShell title="Workout Report" description="Completed vs skipped sessions, calories, and effort scores."
      dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo} onRefetch={refetch}
      onExportCsv={exportCsv} onExportPdf={exportPdf} isLoading={isLoading} isFetching={isFetching}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <ReportStat label="Completed" value={data.totalCompleted.toLocaleString()} color="text-emerald-400" />
            <ReportStat label="Skipped" value={data.totalSkipped.toLocaleString()} color="text-amber-400" />
            <ReportStat label="Completion rate" value={`${data.completionRate}%`} color={data.completionRate > 70 ? 'text-emerald-400' : 'text-amber-400'} />
            <ReportStat label="Total calories" value={data.totalCalories.toLocaleString()} />
            <ReportStat label="Avg effort" value={`${data.avgEffort}/10`} />
            <ReportStat label="Active users" value={data.activeUsers.toLocaleString()} color="text-blue-400" />
          </div>

          <Card><CardHeader><CardTitle>Weekly Sessions</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.timeline} margin={{ top:4,right:4,left:-20,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="completed" name="Completed" fill={CHART_COLORS[0]} radius={[3,3,0,0]} maxBarSize={32} />
                <Bar dataKey="skipped"   name="Skipped"   fill={CHART_COLORS[3]} radius={[3,3,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer></CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card><CardHeader><CardTitle>Weekly Calories Burned</CardTitle></CardHeader>
              <CardContent><ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.timeline} margin={{ top:4,right:4,left:-20,bottom:0 }}>
                  <defs><linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Area type="monotone" dataKey="calories" name="Calories" stroke={CHART_COLORS[1]} fill="url(#calGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer></CardContent>
            </Card>

            <Card><CardHeader><CardTitle>Avg Perceived Effort</CardTitle></CardHeader>
              <CardContent><ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.timeline} margin={{ top:4,right:4,left:-20,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [`${v}/10`, 'Effort']} />
                  <Line type="monotone" dataKey="avg_effort" name="Avg effort" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer></CardContent>
            </Card>
          </div>
        </div>
      )}
    </ReportShell>
  )
}

// ════════════════════════════════════════════════════════════════════
// NUTRITION REPORT
// ════════════════════════════════════════════════════════════════════

function NutritionReport() {
  const { range, setFrom, setTo } = useReportRange(3)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-nutrition', range],
    queryFn: () => fetchNutritionReport(range),
  })
  const exportCsv = () => { if (!data) return; const h = ['Week','Entries','Calories','Protein(g)','Carbs(g)','Fat(g)']; downloadFile(buildCsv(h, data.timeline.map((r) => [r.label, r.entries, r.calories, r.protein, r.carbs, r.fat])), `nutrition-report-${range.from}.csv`, 'text/csv') }
  const exportPdf = async () => { if (!data) return; await downloadPdf('Nutrition Report', data.timeline.map((r) => [r.label, r.entries, r.calories, r.protein, r.carbs, r.fat]), ['Week','Entries','Calories','Protein','Carbs','Fat']) }

  return (
    <ReportShell title="Nutrition Report" description="Meal log entries, calorie and macro trends." dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo} onRefetch={refetch} onExportCsv={exportCsv} onExportPdf={exportPdf} isLoading={isLoading} isFetching={isFetching}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <ReportStat label="Total entries" value={data.totalEntries.toLocaleString()} />
            <ReportStat label="Avg calories" value={`${data.avgCalories} kcal`} />
            <ReportStat label="Avg protein" value={`${data.avgProtein}g`} color="text-blue-400" />
            <ReportStat label="Avg carbs" value={`${data.avgCarbs}g`} color="text-amber-400" />
            <ReportStat label="Avg fat" value={`${data.avgFat}g`} color="text-orange-400" />
            <ReportStat label="Active users" value={data.activeUsers.toLocaleString()} color="text-emerald-400" />
          </div>
          <Card><CardHeader><CardTitle>Weekly Macro Breakdown</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.timeline} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} unit="g" />
                <Tooltip contentStyle={CHART_STYLE} formatter={(v: number, n) => [`${v}g`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="protein" name="Protein" fill={CHART_COLORS[1]} radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="carbs"   name="Carbs"   fill={CHART_COLORS[3]} radius={[3,3,0,0]} maxBarSize={20} />
                <Bar dataKey="fat"     name="Fat"     fill={CHART_COLORS[5]} radius={[3,3,0,0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer></CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Weekly Calorie Trend</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.timeline} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <defs><linearGradient id="nutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.3} /><stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [`${v.toLocaleString()} kcal`, 'Calories']} />
                <Area type="monotone" dataKey="calories" name="Calories" stroke={CHART_COLORS[0]} fill="url(#nutGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer></CardContent>
          </Card>
        </div>
      )}
    </ReportShell>
  )
}

// ════════════════════════════════════════════════════════════════════
// AI USAGE REPORT
// ════════════════════════════════════════════════════════════════════

function AiUsageReport() {
  const { range, setFrom, setTo } = useReportRange(3)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-ai', range],
    queryFn: () => fetchAiReport(range),
  })
  const exportCsv = () => { if (!data) return; const h = ['Week','Requests','Successes','Failures','Tokens']; downloadFile(buildCsv(h, data.timeline.map((r) => [r.label, r.requests, r.successes, r.failures, r.tokens])), `ai-report-${range.from}.csv`, 'text/csv') }
  const exportPdf = async () => { if (!data) return; await downloadPdf('AI Usage Report', data.timeline.map((r) => [r.label, r.requests, r.successes, r.failures, r.tokens]), ['Week','Requests','Successes','Failures','Tokens']) }

  const featureData = Object.entries(data?.byFeature ?? {}).map(([k, v]) => ({ name: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value: v })).sort((a, b) => b.value - a.value)

  return (
    <ReportShell title="AI Usage Report" description="Request volume, token consumption, errors, and feature breakdown." dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo} onRefetch={refetch} onExportCsv={exportCsv} onExportPdf={exportPdf} isLoading={isLoading} isFetching={isFetching}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <ReportStat label="Total requests" value={data.totalRequests.toLocaleString()} />
            <ReportStat label="Successes" value={data.totalSuccesses.toLocaleString()} color="text-emerald-400" />
            <ReportStat label="Success rate" value={`${data.successRate}%`} color={data.successRate > 90 ? 'text-emerald-400' : 'text-amber-400'} />
            <ReportStat label="Total tokens" value={data.totalTokens.toLocaleString()} color="text-violet-400" />
            <ReportStat label="Avg latency" value={data.avgLatency ? `${data.avgLatency}ms` : '—'} />
          </div>
          <Card><CardHeader><CardTitle>Weekly Requests vs Failures</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.timeline} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="successes" name="Successes" stackId="a" fill={CHART_COLORS[0]} maxBarSize={36} />
                <Bar dataKey="failures"  name="Failures"  stackId="a" fill={CHART_COLORS[5]} radius={[3,3,0,0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer></CardContent>
          </Card>
          {featureData.length > 0 && (
            <Card><CardHeader><CardTitle>Requests by Feature</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 pt-1">
                  {featureData.map((f) => {
                    const pct = data.totalRequests ? Math.round((f.value / data.totalRequests) * 100) : 0
                    return (
                      <div key={f.name} className="flex items-center gap-3 text-sm">
                        <span className="w-40 truncate text-muted-foreground">{f.name}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="tabular-nums w-20 text-right">{f.value.toLocaleString()} <span className="text-muted-foreground">({pct}%)</span></span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </ReportShell>
  )
}

// ════════════════════════════════════════════════════════════════════
// RETENTION REPORT
// ════════════════════════════════════════════════════════════════════

function RetentionReport() {
  const { range, setFrom, setTo } = useReportRange(6)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-retention', range],
    queryFn: () => fetchRetentionReport(range),
  })
  const exportCsv = () => { if (!data) return; const h = ['Month','Registered','Active Day7','Active Day30','Day7 Rate%','Day30 Rate%']; downloadFile(buildCsv(h, data.buckets.map((r) => [r.label, r.registered, r.active_day7, r.active_day30, r.retention_day7, r.retention_day30])), `retention-report-${range.from}.csv`, 'text/csv') }
  const exportPdf = async () => { if (!data) return; await downloadPdf('Retention Report', data.buckets.map((r) => [r.label, r.registered, r.active_day7, r.active_day30, `${r.retention_day7}%`, `${r.retention_day30}%`]), ['Month','Registered','Active 7d','Active 30d','7d %','30d %']) }

  return (
    <ReportShell title="Retention Report" description="7-day and 30-day retention rates for new users." dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo} onRefetch={refetch} onExportCsv={exportCsv} onExportPdf={exportPdf} isLoading={isLoading} isFetching={isFetching}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            <ReportStat label="Overall 7-day retention" value={`${data.overall7day}%`} sub="Users active within 7 days of signup" color={data.overall7day > 40 ? 'text-emerald-400' : 'text-amber-400'} />
            <ReportStat label="Overall 30-day retention" value={`${data.overall30day}%`} sub="Users active within 30 days of signup" color={data.overall30day > 25 ? 'text-emerald-400' : 'text-amber-400'} />
          </div>
          <Card><CardHeader><CardTitle>Monthly Retention Rates</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.buckets} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} unit="%" />
                <Tooltip contentStyle={CHART_STYLE} formatter={(v: number, n) => [`${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="retention_day7" name="7-day retention" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="retention_day30" name="30-day retention" stroke={CHART_COLORS[1]} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer></CardContent>
          </Card>
          <Card><CardHeader><CardTitle>Cohort Table</CardTitle></CardHeader>
            <CardContent><div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-border">{['Month','Registered','Active 7d','Active 30d','7d Rate','30d Rate'].map((h) => <th key={h} className="pb-2 text-right first:text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {[...data.buckets].reverse().map((r) => (
                  <tr key={r.label} className="hover:bg-muted/20">
                    <td className="py-2 font-medium">{r.label}</td>
                    <td className="py-2 text-right tabular-nums">{r.registered}</td>
                    <td className="py-2 text-right tabular-nums">{r.active_day7}</td>
                    <td className="py-2 text-right tabular-nums">{r.active_day30}</td>
                    <td className={`py-2 text-right tabular-nums ${r.retention_day7 > 40 ? 'text-emerald-400' : 'text-amber-400'}`}>{r.retention_day7}%</td>
                    <td className={`py-2 text-right tabular-nums ${r.retention_day30 > 25 ? 'text-emerald-400' : 'text-amber-400'}`}>{r.retention_day30}%</td>
                  </tr>
                ))}
              </tbody>
            </table></div></CardContent>
          </Card>
        </div>
      )}
    </ReportShell>
  )
}

// ════════════════════════════════════════════════════════════════════
// GROWTH REPORT
// ════════════════════════════════════════════════════════════════════

function GrowthReport() {
  const { range, setFrom, setTo } = useReportRange(12)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['report-growth', range],
    queryFn: () => fetchGrowthReport(range),
  })
  const exportCsv = () => { if (!data) return; const h = ['Month','New Users','Cumulative','New Subs','MRR ($)']; downloadFile(buildCsv(h, data.timeline.map((r) => [r.label, r.new_users, r.cumulative, r.new_subs, r.mrr])), `growth-report-${range.from}.csv`, 'text/csv') }
  const exportPdf = async () => { if (!data) return; await downloadPdf('Growth Report', data.timeline.map((r) => [r.label, r.new_users, r.cumulative, r.new_subs, `$${r.mrr}`]), ['Month','New Users','Cumulative','New Subs','MRR']) }

  return (
    <ReportShell title="Growth Report" description="User acquisition, cumulative growth, and MRR trends." dateFrom={range.from} dateTo={range.to} onDateFrom={setFrom} onDateTo={setTo} onRefetch={refetch} onExportCsv={exportCsv} onExportPdf={exportPdf} isLoading={isLoading} isFetching={isFetching}>
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ReportStat label="New users (period)" value={data.totalNewUsers.toLocaleString()} color="text-primary" />
            <ReportStat label="New subscriptions" value={data.totalNewSubs.toLocaleString()} color="text-blue-400" />
            <ReportStat label="Current MRR" value={formatCurrency(data.totalMrr)} color="text-emerald-400" />
            <ReportStat label="Peak month" value={data.peakMonth} sub="Most new users" />
          </div>

          <Card><CardHeader><CardTitle>User Growth</CardTitle></CardHeader>
            <CardContent><ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data.timeline} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="new_users" name="New users" fill={CHART_COLORS[0]} radius={[3,3,0,0]} maxBarSize={36} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer></CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card><CardHeader><CardTitle>New Subscriptions per Month</CardTitle></CardHeader>
              <CardContent><ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.timeline} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_STYLE} />
                  <Bar dataKey="new_subs" name="New subscriptions" fill={CHART_COLORS[2]} radius={[3,3,0,0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer></CardContent>
            </Card>

            <Card><CardHeader><CardTitle>Monthly Recurring Revenue (MRR)</CardTitle></CardHeader>
              <CardContent><ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.timeline} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={CHART_STYLE} formatter={(v: number) => [formatCurrency(v), 'MRR']} />
                  <Line type="monotone" dataKey="mrr" name="MRR" stroke={CHART_COLORS[4]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer></CardContent>
            </Card>
          </div>
        </div>
      )}
    </ReportShell>
  )
}

// ════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('revenue')

  return (
    <PageShell
      title="Reports"
      description="Generate, analyze, and export platform-wide reports with interactive charts."
      icon={BarChart3}
    >
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="revenue"      active={activeTab}><RevenueReport /></TabPanel>
      <TabPanel id="subscription" active={activeTab}><SubscriptionReport /></TabPanel>
      <TabPanel id="workout"      active={activeTab}><WorkoutReport /></TabPanel>
      <TabPanel id="nutrition"    active={activeTab}><NutritionReport /></TabPanel>
      <TabPanel id="ai"           active={activeTab}><AiUsageReport /></TabPanel>
      <TabPanel id="retention"    active={activeTab}><RetentionReport /></TabPanel>
      <TabPanel id="growth"       active={activeTab}><GrowthReport /></TabPanel>
    </PageShell>
  )
}
