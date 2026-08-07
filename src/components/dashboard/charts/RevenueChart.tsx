import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { RevenuePoint } from '@/lib/dashboard.queries'
import { ChartCard } from './ChartCard'
import { AccessibleTable } from '@/components/ui/AccessibleTable'

interface Props {
  data: RevenuePoint[]
  loading: boolean
}

function fmtUSD(v: number): string {
  if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'k'
  return '$' + v.toFixed(0)
}

export function RevenueChart({ data, loading }: Props) {
  return (
    <ChartCard title="Revenue" subtitle="Monthly succeeded payments — last 12 months" loading={loading}>
      <AccessibleTable
        caption="Monthly revenue — last 12 months"
        headers={['Month', 'Revenue (USD)']}
        rows={data.map((d) => [d.month, d.revenue.toFixed(2)])}
      />
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(84 81% 44%)" stopOpacity={0.9} />
              <stop offset="100%" stopColor="hsl(84 81% 44%)" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={fmtUSD}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: 12,
              color: 'hsl(var(--foreground))',
            }}
            formatter={(v: number) => [fmtUSD(v), 'Revenue']}
          />
          <Bar
            dataKey="revenue"
            fill="url(#revGrad)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
