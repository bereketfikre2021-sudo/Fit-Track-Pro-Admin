import { useQuery } from '@tanstack/react-query'
import { Dumbbell, CheckCircle2, XCircle } from 'lucide-react'
import { fetchUserWorkouts } from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface Props { userId: string }

export function WorkoutTab({ userId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['user-workouts', userId],
    queryFn: () => fetchUserWorkouts(userId),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!data.length) return <p className="text-sm text-muted-foreground py-8 text-center">No workout sessions found</p>

  // Group by week for chart
  const byWeek: Record<string, number> = {}
  data.forEach((s) => {
    if (s.skipped) return
    const d = new Date(s.session_date)
    d.setDate(d.getDate() - d.getDay())
    const key = d.toISOString().slice(0, 10)
    byWeek[key] = (byWeek[key] ?? 0) + 1
  })
  const chartData = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([date, sessions]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sessions,
  }))

  const completed = data.filter((s) => !s.skipped).length
  const skipped = data.filter((s) => s.skipped).length

  return (
    <div className="space-y-5 pt-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total sessions', value: data.length },
          { label: 'Completed', value: completed },
          { label: 'Skipped', value: skipped },
          { label: 'Avg effort', value: (() => { const e = data.filter((s) => s.perceived_effort); return e.length ? (e.reduce((a, s) => a + (s.perceived_effort ?? 0), 0) / e.length).toFixed(1) : '—' })() },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-primary" />Weekly Sessions</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                <Bar dataKey="sessions" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
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
                <td className="px-4 py-2.5">{formatDate(s.session_date)}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.day_of_week ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {s.skipped
                    ? <span className="flex items-center gap-1 text-amber-400"><XCircle className="h-3.5 w-3.5" />Skipped</span>
                    : <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Done</span>
                  }
                </td>
                <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">
                  {s.completed_count ?? 0}/{s.total_count ?? 0}
                </td>
                <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{s.calories_burned ?? '—'}</td>
                <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{s.perceived_effort ?? '—'}/10</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
