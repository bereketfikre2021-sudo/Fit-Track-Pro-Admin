/**
 * ReferenceDataPanel.tsx
 * View and manage workout reference data:
 * categories, difficulties, equipment, muscle groups, phases.
 *
 * These are enum values in the DB schema. The panel shows the current
 * canonical list and lets admins see usage counts per value.
 * Adding/removing requires a DB migration (shown as info to the user).
 */

import { useQuery } from '@tanstack/react-query'
import { Info, Dumbbell, Tag, Layers, Activity } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import {
  CATEGORIES, DIFFICULTIES, PHASES, MUSCLE_GROUPS, EQUIPMENT_LIST,
} from '@/lib/workout.queries'

interface UsageCount {
  value: string
  count: number
}

async function fetchCategoryUsage(): Promise<UsageCount[]> {
  const { data } = await supabase
    .from('exercises')
    .select('category')
    .is('deleted_at', null)
    .not('category', 'is', null)
  const counts: Record<string, number> = {}
  for (const r of data ?? []) { counts[r.category] = (counts[r.category] ?? 0) + 1 }
  return CATEGORIES.map((v) => ({ value: v, count: counts[v] ?? 0 }))
}

async function fetchDifficultyUsage(): Promise<UsageCount[]> {
  const { data } = await supabase
    .from('exercises')
    .select('difficulty')
    .is('deleted_at', null)
    .not('difficulty', 'is', null)
  const counts: Record<string, number> = {}
  for (const r of data ?? []) { counts[r.difficulty] = (counts[r.difficulty] ?? 0) + 1 }
  return DIFFICULTIES.map((v) => ({ value: v, count: counts[v] ?? 0 }))
}

async function fetchEquipmentUsage(): Promise<UsageCount[]> {
  const { data } = await supabase
    .from('exercises')
    .select('equipment')
    .is('deleted_at', null)
    .not('equipment', 'is', null)
  const counts: Record<string, number> = {}
  for (const r of data ?? []) { counts[r.equipment] = (counts[r.equipment] ?? 0) + 1 }
  return EQUIPMENT_LIST.map((v) => ({ value: v, count: counts[v] ?? 0 }))
}

async function fetchMuscleGroupUsage(): Promise<UsageCount[]> {
  const { data } = await supabase
    .from('exercises')
    .select('muscle_group')
    .is('deleted_at', null)
    .not('muscle_group', 'is', null)
  const counts: Record<string, number> = {}
  for (const r of data ?? []) { counts[r.muscle_group] = (counts[r.muscle_group] ?? 0) + 1 }
  return MUSCLE_GROUPS.map((v) => ({ value: v, count: counts[v] ?? 0 }))
}

function ReferenceList({ items, isLoading }: { items: UsageCount[]; isLoading: boolean }) {
  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item.value}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 py-1.5">
          <span className="text-sm font-medium capitalize">
            {item.value.replace(/_/g, ' ')}
          </span>
          <Badge variant={item.count > 0 ? 'info' : 'outline'} className="text-[10px]">
            {item.count}
          </Badge>
        </div>
      ))}
    </div>
  )
}

export function ReferenceDataPanel() {
  const { data: categories = [], isLoading: cL }   = useQuery({ queryKey: ['ref-categories'],   queryFn: fetchCategoryUsage })
  const { data: difficulties = [], isLoading: dL }  = useQuery({ queryKey: ['ref-difficulties'],  queryFn: fetchDifficultyUsage })
  const { data: equipment = [], isLoading: eqL }    = useQuery({ queryKey: ['ref-equipment'],     queryFn: fetchEquipmentUsage })
  const { data: muscleGroups = [], isLoading: mgL } = useQuery({ queryKey: ['ref-muscle-groups'], queryFn: fetchMuscleGroupUsage })

  return (
    <div className="space-y-5 pt-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">These values are database enum types.</p>
          <p className="text-muted-foreground mt-0.5">
            The numbers show how many exercises use each value. To add or remove values from these lists,
            run an <code className="bg-muted px-1 rounded text-xs">ALTER TYPE … ADD VALUE</code> migration
            in Supabase Dashboard → SQL Editor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Categories ({CATEGORIES.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceList items={categories} isLoading={cL} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Difficulty Levels ({DIFFICULTIES.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceList items={difficulties} isLoading={dL} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-primary" />
              Equipment ({EQUIPMENT_LIST.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceList items={equipment} isLoading={eqL} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Muscle Groups ({MUSCLE_GROUPS.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReferenceList items={muscleGroups} isLoading={mgL} />
          </CardContent>
        </Card>
      </div>

      {/* Phase list (static) */}
      <Card>
        <CardHeader>
          <CardTitle>Workout Phases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {PHASES.map((p) => (
              <span key={p} className="rounded-md border border-border bg-muted/20 px-2.5 py-1.5 text-sm font-medium capitalize">
                {p}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
