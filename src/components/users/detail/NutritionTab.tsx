import { useQuery } from '@tanstack/react-query'
import { Salad } from 'lucide-react'
import { fetchUserMealLogs } from '@/lib/users.queries'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

interface Props { userId: string }

const SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', morningSnack: 'Morning Snack', lunch: 'Lunch',
  afternoonSnack: 'Afternoon Snack', dinner: 'Dinner', beforeBed: 'Before Bed',
}

export function NutritionTab({ userId }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['user-meal-logs', userId],
    queryFn: () => fetchUserMealLogs(userId),
  })

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  if (!data.length) return <p className="text-sm text-muted-foreground py-8 text-center">No meal logs found</p>

  const totalCalories = data.reduce((s, l) => s + (l.calories ?? 0), 0)
  const totalProtein = data.reduce((s, l) => s + (l.protein_g ?? 0), 0)
  const totalCarbs = data.reduce((s, l) => s + (l.carbs_g ?? 0), 0)
  const totalFat = data.reduce((s, l) => s + (l.fat_g ?? 0), 0)

  return (
    <div className="space-y-5 pt-5">
      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total calories', value: Math.round(totalCalories).toLocaleString() },
          { label: 'Protein', value: `${Math.round(totalProtein)}g` },
          { label: 'Carbs', value: `${Math.round(totalCarbs)}g` },
          { label: 'Fat', value: `${Math.round(totalFat)}g` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
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
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(l.log_date)}</td>
                <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{SLOT_LABELS[l.meal_slot] ?? l.meal_slot}</td>
                <td className="px-4 py-2.5 max-w-[160px] truncate">{l.food_name}</td>
                <td className="px-4 py-2.5 text-right hidden sm:table-cell text-muted-foreground">{l.calories?.toFixed(0) ?? '—'}</td>
                <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground">{l.protein_g?.toFixed(1) ?? '—'}g</td>
                <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground">{l.carbs_g?.toFixed(1) ?? '—'}g</td>
                <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground">{l.fat_g?.toFixed(1) ?? '—'}g</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
