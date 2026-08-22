import {
  Users, UserCheck, DollarSign, CreditCard,
  BrainCircuit, Dumbbell, Salad, TrendingUp,
} from 'lucide-react'
import { StatCard } from './StatCard'
import { formatCurrency } from '@/lib/utils'
import type { StatCards } from '@/lib/dashboard.queries'

interface StatsGridProps {
  stats: StatCards | undefined
  loading: boolean
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
  const s = stats

  return (
    <div className="space-y-4">
      {/* Row 1: 4 primary KPIs — matches the screenshot layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Revenue"
          value={s ? formatCurrency(s.monthlyRevenue) : '—'}
          icon={DollarSign}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          loading={loading}
        />
        <StatCard
          title="Total Users"
          value={s ? fmt(s.totalUsers) : '—'}
          icon={Users}
          iconColor="text-blue-400"
          iconBg="bg-blue-500/10"
          loading={loading}
        />
        <StatCard
          title="Active Subscriptions"
          value={s ? fmt(s.activeSubscriptions) : '—'}
          icon={CreditCard}
          iconColor="text-violet-400"
          iconBg="bg-violet-500/10"
          loading={loading}
        />
        <StatCard
          title="Active Users (30d)"
          value={s ? fmt(s.activeUsers) : '—'}
          icon={UserCheck}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          loading={loading}
        />
      </div>

      {/* Row 2: Activity metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        <StatCard
          title="AI Requests Today"
          value={s ? fmt(s.aiRequestsToday) : '—'}
          icon={BrainCircuit}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
          loading={loading}
        />
        <StatCard
          title="Workouts Today"
          value={s ? fmt(s.workoutsToday) : '—'}
          icon={Dumbbell}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          loading={loading}
        />
        <StatCard
          title="Meal Plans"
          value={s ? fmt(s.mealPlansGenerated) : '—'}
          icon={Salad}
          iconColor="text-lime-400"
          iconBg="bg-lime-500/10"
          loading={loading}
        />
      </div>
    </div>
  )
}
