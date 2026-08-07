import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AiUsagePoint } from '@/lib/dashboard.queries'
import { ChartCard } from './ChartCard'

interface Props {
  data: AiUsagePoint[]
  loading: boolean
}

function fmtDate(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AiUsageChart({ data, loading }: Props) {
  return (
    <ChartCard title="AI Usage" subtitle="Requests per day — last 30 days" loading={loading}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
            formatter={(v: number) => [v, 'Requests']}
            labelFormatter={fmtDate}
          />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="hsl(270 91% 65%)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: 'hsl(270 91% 65%)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
