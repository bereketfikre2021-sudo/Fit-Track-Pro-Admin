/**
 * DashboardPage.tsx
 *
 * Admin Dashboard Overview — all data read live from Supabase.
 * Queries run in parallel via TanStack Query. Admin RLS bypass ensures
 * the signed-in admin can read all user-owned tables.
 */

import { useQuery } from '@tanstack/react-query'
import { LayoutDashboard, RefreshCw, AlertCircle } from 'lucide-react'
import { fetchDashboardData } from '@/lib/dashboard.queries'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { StatsGrid } from '@/components/dashboard/StatsGrid'
import { UserGrowthChart } from '@/components/dashboard/charts/UserGrowthChart'
import { RevenueChart } from '@/components/dashboard/charts/RevenueChart'
import { AiUsageChart } from '@/components/dashboard/charts/AiUsageChart'
import { WorkoutChart } from '@/components/dashboard/charts/WorkoutChart'
import { NutritionChart } from '@/components/dashboard/charts/NutritionChart'
import { RecentUsers } from '@/components/dashboard/widgets/RecentUsers'
import { RecentPayments } from '@/components/dashboard/widgets/RecentPayments'
import { RecentNotifications } from '@/components/dashboard/widgets/RecentNotifications'
import { RecentAiRequests } from '@/components/dashboard/widgets/RecentAiRequests'

export function DashboardPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 2,   // 2 min before background refetch
    refetchInterval: 1000 * 60 * 5, // auto-refresh every 5 min
  })

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null

  return (
    <PageShell
      title="Dashboard"
      description="Live overview of FitTrack Pro platform activity."
      icon={LayoutDashboard}
      actions={
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden sm:block text-xs text-muted-foreground">
              Updated {lastUpdated}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            loading={isFetching}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      }
    >
      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">
              Failed to load dashboard data
            </p>
            <p className="text-xs text-destructive/80 mt-0.5">
              {(error as Error)?.message ?? 'Unknown error'}. Check your admin RLS
              policies and Supabase connection.
            </p>
          </div>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <StatsGrid stats={data?.stats} loading={isLoading} />

      {/* ── Charts row 1: User Growth + Revenue ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UserGrowthChart
          data={data?.userGrowth ?? []}
          loading={isLoading}
        />
        <RevenueChart
          data={data?.revenue ?? []}
          loading={isLoading}
        />
      </div>

      {/* ── Charts row 2: AI + Workouts + Nutrition ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AiUsageChart
          data={data?.aiUsage ?? []}
          loading={isLoading}
        />
        <WorkoutChart
          data={data?.workoutActivity ?? []}
          loading={isLoading}
        />
        <NutritionChart
          data={data?.nutritionActivity ?? []}
          loading={isLoading}
        />
      </div>

      {/* ── Recent feeds: 2×2 grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <RecentUsers
          data={data?.recentUsers ?? []}
          loading={isLoading}
        />
        <RecentPayments
          data={data?.recentPayments ?? []}
          loading={isLoading}
        />
        <RecentNotifications
          data={data?.recentNotifications ?? []}
          loading={isLoading}
        />
        <RecentAiRequests
          data={data?.recentAiRequests ?? []}
          loading={isLoading}
        />
      </div>
    </PageShell>
  )
}
