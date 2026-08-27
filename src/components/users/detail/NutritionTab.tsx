import { useQuery } from '@tanstack/react-query'
import { Salad, RefreshCw } from 'lucide-react'
import { fetchUserMealLogs } from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

interface Props { userId: string }

const SLOT_LABELS: Record<string, string> = {
  breakfast:      'Breakfast',
  morningSnack:   'Morning Snack',
  lunch:          'Lunch',
  afternoonSnack: 'Afternoon Snack',
  dinner:         'Dinner',
  beforeBed:      'Before Bed',
}

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export function NutritionTab({ userId }: Props) {
  const { data = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['user-meal-logs', userId],
    queryFn: () => fetchUserMealLogs(userId),
    retry: 1,
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  if (isError || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <Salad className="h-12 w-12 text-muted-foreground opacity-30" />
        <div>
          <p className="font-semibold">
            {isError ? 'Could not load nutrition data' : 'No nutrition data yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {isError
              ? 'Admin read policies may not be applied. Run the latest migration in your Supabase SQL Editor.'
              : 'This user has not set up a meal plan or logged any food yet.'}
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

  // Detect if this is meal_plan template data (log_date is a day name like "Monday")
  const isMealPlanTemplate = DAY_ORDER.includes(data[0]?.log_date ?? '')

  const totalCalories = data.reduce((s, l) => s + (l.calories ?? 0), 0)
  const totalProtein  = data.reduce((s, l) => s + (l.protein_g ?? 0), 0)
  const totalCarbs    = data.reduce((s, l) => s + (l.carbs_g ?? 0), 0)
  const totalFat      = data.reduce((s, l) => s + (l.fat_g ?? 0), 0)

  return (
    <div className="space-y-5 pt-5">
      {/* Context banner when showing meal plan template */}
      {isMealPlanTemplate && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-400">
          Showing weekly meal plan template (no daily food diary entries found for this user).
        </div>
      )}

      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: isMealPlanTemplate ? 'Total items' : 'Total calories', value: isMealPlanTemplate ? data.length.toLocaleString() : Math.round(totalCalories).toLocaleString(), color: 'text-foreground' },
          { label: 'Total protein',  value: `${Math.round(totalProtein)}g`,  color: 'text-blue-400' },
          { label: 'Total carbs',    value: `${Math.round(totalCarbs)}g`,    color: 'text-amber-400' },
          { label: 'Total fat',      value: `${Math.round(totalFat)}g`,      color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 overflow-hidden min-w-0">
            <p className="text-xs text-muted-foreground truncate">{s.label}</p>
            <p className={`text-xl font-bold mt-1 tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {isMealPlanTemplate ? 'Day' : 'Date'}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Meal</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Food</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Cal</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">P</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">C</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">F</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((l) => (
              <tr key={l.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{l.log_date}</td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                  {SLOT_LABELS[l.meal_slot] ?? l.meal_slot}
                </td>
                <td className="px-4 py-2.5 max-w-[180px] truncate font-medium">{l.food_name}</td>
                <td className="px-4 py-2.5 text-right hidden sm:table-cell text-muted-foreground tabular-nums">
                  {l.calories != null ? Number(l.calories).toFixed(0) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">
                  {l.protein_g != null ? `${Number(l.protein_g).toFixed(1)}g` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">
                  {l.carbs_g != null ? `${Number(l.carbs_g).toFixed(1)}g` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">
                  {l.fat_g != null ? `${Number(l.fat_g).toFixed(1)}g` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
