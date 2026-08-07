import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { UserGrowthPoint } from '@/lib/dashboard.queries'
import { ChartCard } from './ChartCard'
import { AccessibleTable } from '@/components/ui/AccessibleTable'

interface Props {
  data: UserGrowthPoint[]
  loading: boolean
}

function fmtDate(d: string): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function UserGrowthChart({ data, loading }: Props) {
  return (
    <ChartCard title="User Growth" subtitle="New registrations — last 30 days" loading={loading}>
      <AccessibleTable
        caption="User Growth — new registrations per day, last 30 days"
        headers={['Date', 'New Users']}
        rows={data.map((d) => [d.date, d.count])}
      />
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
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
            formatter={(v: number) => [v, 'New users']}
            labelFormatter={fmtDate}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
            fill="url(#ugGrad)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
