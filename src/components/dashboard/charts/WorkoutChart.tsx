import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { WorkoutPoint } from '@/lib/dashboard.queries'
import { ChartCard } from './ChartCard'

interface Props {
  data: WorkoutPoint[]
  loading: boolean
}

function fmtDate(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function WorkoutChart({ data, loading }: Props) {
  return (
    <ChartCard title="Workout Activity" subtitle="Completed sessions per day — last 30 days" loading={loading}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="woGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(25 95% 53%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(25 95% 53%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: 12,
              color: 'hsl(var(--foreground))',
            }}
            formatter={(v: number) => [v, 'Sessions']}
            labelFormatter={fmtDate}
          />
          <Area
            type="monotone"
            dataKey="sessions"
            stroke="hsl(25 95% 53%)"
            strokeWidth={2}
            fill="url(#woGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
