/**
 * WorkoutsPage.tsx — Workout Administration
 * Tabs: Preset Exercises | Preset Templates
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { Dumbbell, Plus, Pencil, Trash2, Download, Upload,
  Search, Copy, ImageIcon, Flame } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/guards/PermissionGate'
import { TemplateForm } from '@/components/workout/TemplateForm'
import { BulkImportModal } from '@/components/workout/BulkImportModal'
import { uploadPresetImage, upsertPreset, fetchPresets } from '@/lib/preset.queries'
import {
  fetchTemplates, softDeleteTemplate, bulkDeleteTemplates, exportTemplates, importTemplates,
  CATEGORIES, DIFFICULTIES,
  type WorkoutTemplate, type TemplateFilters,
} from '@/lib/workout.queries'

const PAGE_SIZE = 25

const toOpts = (arr: readonly string[], withAll = true) => [
  ...(withAll ? [{ value: '', label: 'All' }] : []),
  ...arr.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })),
]

const DIFF_BADGE: Record<string, 'outline' | 'info' | 'warning' | 'danger'> = {
  beginner: 'outline', intermediate: 'info', advanced: 'warning', elite: 'danger',
}

function downloadJson(data: object[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

const PAGE_TABS = [
  { id: 'exercises', label: 'Preset Exercises', icon: Dumbbell },
  { id: 'templates', label: 'Preset Templates', icon: Copy },
]

const DEFAULT_TPL_FILTERS: TemplateFilters = {
  search: '', category: '', difficulty: '', featured_only: false, global_only: true,
}

const WEIGHT_PLAN_GOALS: Record<string, string[]> = {
  'weight-gain': ['Muscle Gain', 'Strength', 'General Fitness'],
  'weight-loss': ['Weight Loss', 'General Fitness'],
}

const PRESET_EXERCISES = [
  { id:'p-0',  name:'Push-Up',                   category:'Strength', muscleGroup:'Chest',     difficulty:'Beginner',     equipment:'Bodyweight', goals:['Muscle Gain','Weight Loss','General Fitness'], sets:'3', reps:'10-15' },
  { id:'p-1',  name:'Bench Press',                category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'4', reps:'6-8' },
  { id:'p-2',  name:'Incline Dumbbell Press',     category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-3',  name:'Chest Dip',                  category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Bodyweight', goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-12' },
  { id:'p-4',  name:'Cable Fly',                  category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-5',  name:'Pull-Up',                    category:'Strength', muscleGroup:'Back',      difficulty:'Advanced',     equipment:'Bodyweight', goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'5-8' },
  { id:'p-6',  name:'Chin-Up',                    category:'Strength', muscleGroup:'Back',      difficulty:'Advanced',     equipment:'Bodyweight', goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'5-8' },
  { id:'p-7',  name:'Lat Pulldown',               category:'Strength', muscleGroup:'Back',      difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'8-10' },
  { id:'p-8',  name:'Seated Cable Row',           category:'Strength', muscleGroup:'Back',      difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-9',  name:'One-Arm Dumbbell Row',       category:'Strength', muscleGroup:'Back',      difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10 each' },
  { id:'p-10', name:'Deadlift',                   category:'Strength', muscleGroup:'Back',      difficulty:'Advanced',     equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'5' },
  { id:'p-11', name:'Overhead Press',             category:'Strength', muscleGroup:'Shoulders', difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'6-8' },
  { id:'p-12', name:'Dumbbell Shoulder Press',    category:'Strength', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'8-10' },
  { id:'p-13', name:'Lateral Raise',              category:'Strength', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-14', name:'Face Pull',                  category:'Strength', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Cable',      goals:['General Fitness','Strength'],                    sets:'3', reps:'12-15' },
  { id:'p-15', name:'Upright Row',                category:'Strength', muscleGroup:'Shoulders', difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-16', name:'Dumbbell Curl',              category:'Strength', muscleGroup:'Biceps',    difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-17', name:'Hammer Curl',                category:'Strength', muscleGroup:'Biceps',    difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-18', name:'Barbell Curl',               category:'Strength', muscleGroup:'Biceps',    difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-19', name:'Preacher Curl',              category:'Strength', muscleGroup:'Biceps',    difficulty:'Intermediate', equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'8-10' },
  { id:'p-20', name:'Triceps Pushdown',           category:'Strength', muscleGroup:'Triceps',   difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-21', name:'Overhead Triceps Extension', category:'Strength', muscleGroup:'Triceps',   difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-22', name:'Close-Grip Bench Press',     category:'Strength', muscleGroup:'Triceps',   difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-23', name:'Skull Crusher',              category:'Strength', muscleGroup:'Triceps',   difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-24', name:'Bodyweight Squat',           category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Muscle Gain'],  sets:'3', reps:'15-20' },
  { id:'p-25', name:'Goblet Squat',               category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'10-12' },
  { id:'p-26', name:'Barbell Back Squat',         category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'4', reps:'6-8' },
  { id:'p-27', name:'Romanian Deadlift',          category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-28', name:'Leg Press',                  category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-29', name:'Walking Lunge',              category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness','Weight Loss'],  sets:'3', reps:'10 each' },
  { id:'p-30', name:'Bulgarian Split Squat',      category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8 each' },
  { id:'p-31', name:'Leg Extension',              category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-32', name:'Leg Curl',                   category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-33', name:'Standing Calf Raise',        category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-34', name:'Hip Thrust',                 category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-12' },
  { id:'p-35', name:'Hack Squat',                 category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Machine',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-36', name:'Plank',                      category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['General Fitness','Strength','Weight Loss'],     sets:'3', reps:'45s' },
  { id:'p-37', name:'Side Plank',                 category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['General Fitness','Strength'],                    sets:'3', reps:'30s' },
  { id:'p-38', name:'Hanging Knee Raise',         category:'Strength', muscleGroup:'Core',      difficulty:'Intermediate', equipment:'Bodyweight', goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-39', name:'Dead Bug',                   category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['General Fitness','Mobility'],                    sets:'3', reps:'10 each' },
  { id:'p-40', name:'Cable Crunch',               category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-41', name:'Kettlebell Swing',           category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Kettlebell', goals:['Weight Loss','Strength','General Fitness'],     sets:'3', reps:'15' },
  { id:'p-42', name:'Burpee',                     category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Strength'],     sets:'3', reps:'8-10' },
  { id:'p-43', name:"Farmer's Carry",             category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Strength','General Fitness','Muscle Gain'],     sets:'3', reps:'40s' },
  { id:'p-44', name:'Thruster',                   category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Barbell',    goals:['Weight Loss','Strength','General Fitness'],     sets:'3', reps:'8-10' },
  { id:'p-45', name:'Walking',                    category:'Cardio',   muscleGroup:'Running',   difficulty:'Beginner',     equipment:'Bodyweight', goals:['Weight Loss','General Fitness'],                 sets:'1', reps:'20min' },
  { id:'p-46', name:'Running',                    category:'Cardio',   muscleGroup:'Running',   difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'20min' },
  { id:'p-47', name:'Cycling',                    category:'Cardio',   muscleGroup:'Cycling',   difficulty:'Beginner',     equipment:'Machine',    goals:['Weight Loss','General Fitness'],                 sets:'1', reps:'20min' },
  { id:'p-48', name:'Jump Rope',                  category:'Cardio',   muscleGroup:'Running',   difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness'],                 sets:'3', reps:'60s' },
  { id:'p-49', name:'Rowing',                     category:'Cardio',   muscleGroup:'Rowing',    difficulty:'Intermediate', equipment:'Machine',    goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'15min' },
  { id:'p-50', name:'Stair Climber',              category:'Cardio',   muscleGroup:'Running',   difficulty:'Intermediate', equipment:'Machine',    goals:['Weight Loss','General Fitness'],                 sets:'1', reps:'15min' },
  { id:'p-51', name:'Swimming',                   category:'Cardio',   muscleGroup:'Rowing',    difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'20min' },
  { id:'p-52', name:'Assault Bike',               category:'Cardio',   muscleGroup:'Cycling',   difficulty:'Intermediate', equipment:'Machine',    goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'15min' },
  { id:'p-53', name:'Dead Hang',                  category:'Mobility', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'3', reps:'30s' },
  { id:'p-54', name:'Cat-Cow Stretch',            category:'Mobility', muscleGroup:'Spine',     difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'10' },
  { id:'p-55', name:'Hip Flexor Stretch',         category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'45s' },
  { id:'p-56', name:"World's Greatest Stretch",   category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'5 each' },
  { id:'p-57', name:'Thoracic Rotation',          category:'Mobility', muscleGroup:'Spine',     difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'8 each' },
  { id:'p-58', name:'Couch Stretch',              category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'45s' },
  { id:'p-59', name:'Deep Squat Hold',            category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'60s' },
]
type PresetEx = typeof PRESET_EXERCISES[0]

// ── Exercise image upload cell ────────────────────────────────────────────────
function ExerciseImageCell({ ex, imageMap, onUpload }: {
  ex: PresetEx
  imageMap: Record<string, string>
  onUpload: (ex: PresetEx, file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const url = imageMap[ex.id]
  return (
    <div className="w-10 h-10 rounded-md overflow-hidden border border-dashed border-border cursor-pointer group relative flex-shrink-0"
      onClick={() => inputRef.current?.click()} title="Click to upload image">
      {url ? <img src={url} alt={ex.name} className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
          </div>}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ImageIcon className="h-3 w-3 text-white" />
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(ex, f); e.target.value = '' }} />
    </div>
  )
}

// ── Preset Exercises Tab ──────────────────────────────────────────────────────
function PresetExercisesTab() {
  const qc = useQueryClient()
  const [weightFilter, setWeightFilter] = useState<'all' | 'weight-gain' | 'weight-loss'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Strength' | 'Cardio' | 'Mobility'>('all')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)

  const { data: savedPresets = [] } = useQuery({
    queryKey: ['presets', 'exercise'],
    queryFn: () => fetchPresets('exercise'),
  })

  const imageMap: Record<string, string> = {}
  for (const p of savedPresets) {
    for (const item of ((p.data as any)?.exercises ?? [])) {
      if (item.id && item.imageUrl) imageMap[item.id] = item.imageUrl
    }
  }

  const handleImageUpload = async (ex: PresetEx, file: File) => {
    setUploading(ex.id)
    try {
      const url = await uploadPresetImage(`exercise-${ex.id}`, file)
      const planId = ex.goals.includes('Weight Loss') && !ex.goals.includes('Muscle Gain')
        ? 'exercise-weight-loss' : 'exercise-weight-gain'
      const existing = savedPresets.find(p => p.id === planId)
      const exercises = existing
        ? ((existing.data as any).exercises ?? []).map((e: any) => e.id === ex.id ? { ...e, imageUrl: url } : e)
        : [{ ...ex, imageUrl: url }]
      if (existing && !exercises.find((e: any) => e.id === ex.id)) exercises.push({ ...ex, imageUrl: url })
      await upsertPreset({
        id: planId, type: 'exercise',
        name: planId === 'exercise-weight-gain' ? 'Weight Gain Exercises' : 'Weight Loss Exercises',
        name_am: planId === 'exercise-weight-gain' ? 'ክብደት መጨመር ልምምዶች' : 'ክብደት መቀነስ ልምምዶች',
        description: null, description_am: null, tags: null, tags_am: null,
        target_goals: planId === 'exercise-weight-gain' ? ['muscle','strength'] : ['fat'],
        target_bmi_categories: planId === 'exercise-weight-gain' ? ['underweight'] : ['overweight','obese'],
        image_url: null, data: { exercises },
      })
      qc.invalidateQueries({ queryKey: ['presets', 'exercise'] })
      toast.success(`Image saved for ${ex.name}`)
    } catch (e) { toast.error((e as Error).message) }
    finally { setUploading(null) }
  }

  const filtered = PRESET_EXERCISES.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false
    if (weightFilter !== 'all') {
      const allowed = WEIGHT_PLAN_GOALS[weightFilter] ?? []
      if (!ex.goals.some(g => allowed.includes(g))) return false
    }
    return true
  })

  const groups = (['Strength','Cardio','Mobility'] as const).map(cat => ({
    category: cat, items: filtered.filter(e => e.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-5 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
          {(['all','weight-gain','weight-loss'] as const).map(v => (
            <button key={v} onClick={() => setWeightFilter(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${weightFilter === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {v === 'weight-gain' && <Dumbbell className="h-3.5 w-3.5 text-blue-400" />}
              {v === 'weight-loss' && <Flame className="h-3.5 w-3.5 text-orange-400" />}
              {v === 'all' ? 'All Plans' : v === 'weight-gain' ? 'Weight Gain' : 'Weight Loss'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
          {(['all','Strength','Cardio','Mobility'] as const).map(v => (
            <button key={v} onClick={() => setCategoryFilter(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${categoryFilter === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {v === 'all' ? 'All' : v}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search exercises…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} exercises</span>
      </div>
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {group.category} · {group.items.length}
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2.5 w-12 text-left font-medium text-muted-foreground">Image</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Exercise</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Muscle</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Equipment</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Difficulty</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Sets/Reps</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Plans</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {group.items.map(ex => (
                    <tr key={ex.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        {uploading === ex.id
                          ? <div className="w-10 h-10 flex items-center justify-center"><Spinner size="sm" /></div>
                          : <ExerciseImageCell ex={ex} imageMap={imageMap} onUpload={handleImageUpload} />}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{ex.name}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{ex.muscleGroup}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{ex.equipment}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={DIFF_BADGE[ex.difficulty.toLowerCase()] ?? 'outline'}>{ex.difficulty}</Badge>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">{ex.sets} × {ex.reps}</td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(ex.goals.includes('Muscle Gain') || ex.goals.includes('Strength')) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Gain</span>
                          )}
                          {ex.goals.includes('Weight Loss') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">Loss</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Templates Tab ─────────────────────────────────────────────────────────────
function TemplatesTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<TemplateFilters>(DEFAULT_TPL_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<WorkoutTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<WorkoutTemplate | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const { data, isLoading } = useQuery({
    queryKey: ['templates', page, filters],
    queryFn: () => fetchTemplates(page, PAGE_SIZE, filters),
    placeholderData: (p) => p,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['templates'] })
  const handleSearch = (v: string) => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setFilters(f => ({ ...f, search: v })); setPage(0) }, 300)
  }
  const updateFilter = (patch: Partial<TemplateFilters>) => { setFilters(f => ({ ...f, ...patch })); setPage(0) }
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => {
    const ids = data?.data.map(t => t.id) ?? []
    setSelectedIds(ids.every(id => selectedIds.has(id)) ? new Set() : new Set(ids))
  }
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await softDeleteTemplate(deleteTarget.id); toast.success('Template deleted'); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }
  const handleBulkDelete = async () => {
    setDeleting(true)
    try { await bulkDeleteTemplates([...selectedIds]); toast.success(`Deleted ${selectedIds.size}`); setSelectedIds(new Set()); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setBulkDeleteOpen(false) }
  }
  const handleExport = async () => {
    try { const d = await exportTemplates(); downloadJson(d, `templates-${new Date().toISOString().slice(0,10)}.json`); toast.success(`Exported ${d.length}`) }
    catch (e) { toast.error((e as Error).message) }
  }
  const IMPORT_TEMPLATE = [{ name:'Push Day', category:'strength', difficulty:'intermediate', duration_min:60, is_public:true, exercises:[{ name:'Bench Press', sets:4, reps:'8-10', restSeconds:90, phase:'main' }] }]

  return (
    <div className="space-y-4 pt-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="search" placeholder="Search templates…" onChange={e => handleSearch(e.target.value)}
              className="flex h-9 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <select value={filters.category} onChange={e => updateFilter({ category: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(CATEGORIES).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.difficulty} onChange={e => updateFilter({ difficulty: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(DIFFICULTIES).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={filters.global_only} onChange={e => updateFilter({ global_only: e.target.checked })} />Global only
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={filters.featured_only} onChange={e => updateFilter({ featured_only: e.target.checked })} />Featured only
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>Delete {selectedIds.size}</Button>}
          <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>Export</Button>
          <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>Import</Button>
          <PermissionGate permission="exercises.create">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditTarget(null); setFormOpen(true) }}>Add template</Button>
          </PermissionGate>
        </div>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-3 w-10"><input type="checkbox" checked={data?.data.length ? data.data.every(t => selectedIds.has(t.id)) : false} onChange={toggleAll} className="rounded" /></th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Difficulty</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Duration</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Exercises</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {data?.data.map(t => (
                  <tr key={t.id} className={`hover:bg-muted/20 ${selectedIds.has(t.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2.5 w-10"><input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="rounded" /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{t.name}</span>
                        {t.is_featured && <Badge variant="warning">Featured</Badge>}
                        {t.is_public && <Badge variant="success">Public</Badge>}
                        {!t.user_id && <Badge variant="info">Global</Badge>}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground truncate max-w-[240px] mt-0.5">{t.description}</p>}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{t.category ?? '—'}</td>
                    <td className="px-4 py-2.5">{t.difficulty ? <Badge variant={DIFF_BADGE[t.difficulty] ?? 'outline'}>{t.difficulty}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground">{t.duration_min ? `${t.duration_min}min` : '—'}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground">{t.exercises?.length ?? 0}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <PermissionGate permission="exercises.edit">
                          <button onClick={() => { setEditTarget(t); setFormOpen(true) }} title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="exercises.delete">
                          <button onClick={() => setDeleteTarget(t)} title="Delete"
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
      <TemplateForm open={formOpen} onClose={() => setFormOpen(false)} template={editTarget} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Template" message={`Soft-delete "${deleteTarget?.name}"?`} confirmLabel="Delete" loading={deleting} />
      <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} templates`} message="Soft-delete selected?" confirmLabel={`Delete ${selectedIds.size}`} loading={deleting} />
      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} title="Templates"
        templateData={IMPORT_TEMPLATE} fields={['name','category','difficulty','duration_min','is_public']}
        onImport={(rows) => importTemplates(rows as Parameters<typeof importTemplates>[0])} onSuccess={invalidate} />
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState('exercises')
  return (
    <PageShell title="Workouts" description="Manage preset exercises and workout templates." icon={Dumbbell}>
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="exercises" active={activeTab}><PresetExercisesTab /></TabPanel>
      <TabPanel id="templates" active={activeTab}><TemplatesTab /></TabPanel>
    </PageShell>
  )
}
