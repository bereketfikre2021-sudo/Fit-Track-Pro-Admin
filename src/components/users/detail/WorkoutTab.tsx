import { useQuery } from '@tanstack/react-query'
import { Dumbbell, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { fetchUserWorkouts } from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface Props { userId: string }

export function WorkoutTab({ userId }: Props) {
  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['user-workouts', userId],
    queryFn: () => fetchUserWorkouts(userId),
    retry: 1,
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  if (isError || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Dumbbell className="h-12 w-12 text-muted-foreground opacity-30" />
        <div>
          <p className="font-semibold">
            {isError ? 'Could not load workout sessions' : 'No workout sessions yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isError
              ? 'Admin read policies may not be applied. Run the latest migration in your Supabase SQL Editor.'
              : 'This user has not logged any workout sessions yet.'}
          </p>
        </div>
        {isError && (
          <Button size="sm" variant="outline" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            loading={isFetching} onClick={() => refetch()}>
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Group by week for chart
  const byWeek: Record<string, number> = {}
  data.forEach((s) => {
    if (s.skipped) return
    const d = new Date(s.session_date)
    d.setDate(d.getDate() - d.getDay())
    const key = d.toISOString().slice(0, 10)
    byWeek[key] = (byWeek[key] ?? 0) + 1
  })
  const chartData = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, sessions]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sessions,
    }))

  const completed = data.filter((s) => !s.skipped).length
  const skipped   = data.filter((s) => s.skipped).length
  const effortArr = data.filter((s) => s.perceived_effort != null)
  const avgEffort = effortArr.length
    ? (effortArr.reduce((a, s) => a + (s.perceived_effort ?? 0), 0) / effortArr.length).toFixed(1)
    : '—'

  return (
    <div className="space-y-5 pt-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total sessions', value: data.length,   color: 'text-foreground' },
          { label: 'Completed',      value: completed,     color: 'text-emerald-400' },
          { label: 'Skipped',        value: skipped,       color: 'text-amber-400' },
          { label: 'Avg effort',     value: avgEffort,     color: 'text-primary' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 overflow-hidden min-w-0">
            <p className="text-xs text-muted-foreground truncate">{s.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums truncate ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Dumbbell className="h-4 w-4 text-primary" />
              Weekly Sessions (last 12 weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem', fontSize: 12,
                  }}
                />
                <Bar dataKey="sessions" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Session table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Day</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Exercises</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Calories</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Effort</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((s) => (
              <tr key={s.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(s.session_date)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.day_of_week ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {s.skipped
                    ? <span className="flex items-center gap-1 text-amber-400 text-xs"><XCircle className="h-3.5 w-3.5" />Skipped</span>
                    : <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Done</span>
                  }
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground tabular-nums">
                  {(s.completed_count ?? 0)}/{(s.total_count ?? 0)}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground tabular-nums">
                  {s.calories_burned != null ? s.calories_burned.toLocaleString() : '—'}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground tabular-nums">
                  {s.perceived_effort != null ? `${s.perceived_effort}/10` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
