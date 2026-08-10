/**
 * NutritionPage.tsx
 * Table-style CRUD for preset meal plans and shopping lists.
 * Each food/item has its own image thumbnail (upload per row).
 * Weight categories use icons (Dumbbell = gain, Flame = loss).
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { Salad, Plus, Pencil, Trash2, ImageIcon, Dumbbell, Flame,
  ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/guards/PermissionGate'
import { fetchPresets, upsertPreset, uploadPresetImage, type WeightCategory } from '@/lib/preset.queries'
import {
  PRESET_MEAL_PLAN_DATA, PRESET_SHOPPING_DATA,
  DAYS_ORDER, SLOT_LABELS,
  type MealPlanDays, type ShoppingCategories, type FoodItem, type ShoppingItem,
} from '@/lib/preset.data'

const PAGE_TABS = [
  { id: 'mealplans', label: 'Meal Plans',     icon: Salad },
  { id: 'shopping',  label: 'Shopping Lists', icon: Salad },
]

type WeightOpt = { id: WeightCategory; label: string; icon: typeof Dumbbell; color: string; bg: string }
const WEIGHT_OPTIONS: WeightOpt[] = [
  { id: 'weight-gain', label: 'Weight Gain', icon: Dumbbell, color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  { id: 'weight-loss', label: 'Weight Loss', icon: Flame,    color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
]

// ── Row image thumbnail ───────────────────────────────────────────────────────
function RowThumbnail({ url, onUpload, uploading }: {
  url?: string | null; onUpload: (f: File) => void; uploading?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  if (uploading) return <div className="w-9 h-9 rounded-md flex items-center justify-center"><Spinner size="sm" /></div>
  return (
    <div className="w-9 h-9 rounded-md overflow-hidden border border-dashed border-border cursor-pointer group relative flex-shrink-0"
      onClick={() => ref.current?.click()} title="Upload image">
      {url ? <img src={url} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ImageIcon className="h-3 w-3 text-white" />
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
    </div>
  )
}

// ── Inline editable food row ──────────────────────────────────────────────────
type FoodRowProps = {
  food: FoodItem & { imageUrl?: string }
  index: number
  onSave: (updated: FoodItem & { imageUrl?: string }) => void
  onDelete: () => void
  onImageUpload: (f: File) => Promise<string>
}

function FoodRow({ food, index, onSave, onDelete, onImageUpload }: FoodRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...food })
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try { const url = await onImageUpload(file); setDraft(d => ({ ...d, imageUrl: url })) }
    catch (e) { toast.error((e as Error).message) }
    finally { setUploading(false) }
  }

  if (editing) {
    return (
      <tr className="bg-primary/5">
        <td className="px-3 py-2">
          <RowThumbnail url={draft.imageUrl} onUpload={handleImageUpload} uploading={uploading} />
        </td>
        <td className="px-3 py-2">
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-3 py-2">
          <input value={draft.name_am} onChange={e => setDraft(d => ({ ...d, name_am: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-20">
          <input type="number" value={draft.calories} onChange={e => setDraft(d => ({ ...d, calories: +e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-16">
          <input type="number" value={draft.protein} onChange={e => setDraft(d => ({ ...d, protein: +e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-16">
          <input type="number" value={draft.carbs} onChange={e => setDraft(d => ({ ...d, carbs: +e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-16">
          <input type="number" value={draft.fat} onChange={e => setDraft(d => ({ ...d, fat: +e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={() => { onSave(draft); setEditing(false) }}
              className="flex h-7 w-7 items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-muted/20 group">
      <td className="px-3 py-2">
        <RowThumbnail url={food.imageUrl} onUpload={async (f) => {
          const url = await onImageUpload(f)
          onSave({ ...food, imageUrl: url })
        }} uploading={uploading} />
      </td>
      <td className="px-3 py-2 font-medium text-sm">{food.name}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{food.name_am}</td>
      <td className="px-3 py-2 text-sm text-right tabular-nums">{food.calories}</td>
      <td className="px-3 py-2 text-sm text-right tabular-nums text-muted-foreground">{food.protein}g</td>
      <td className="px-3 py-2 text-sm text-right tabular-nums text-muted-foreground">{food.carbs}g</td>
      <td className="px-3 py-2 text-sm text-right tabular-nums text-muted-foreground">{food.fat}g</td>
      <td className="px-3 py-2">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setDraft({ ...food }); setEditing(true) }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => { onDelete(); setConfirmDelete(false) }}
          title="Delete food" message={`Delete "${food.name}"?`} confirmLabel="Delete" loading={false} />
      </td>
    </tr>
  )
}

// ── Inline editable shopping item row ────────────────────────────────────────
type ShopRowProps = {
  item: ShoppingItem & { imageUrl?: string }
  onSave: (updated: ShoppingItem & { imageUrl?: string }) => void
  onDelete: () => void
  onImageUpload: (f: File) => Promise<string>
}

function ShopRow({ item, onSave, onDelete, onImageUpload }: ShopRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...item })
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    try { const url = await onImageUpload(file); setDraft(d => ({ ...d, imageUrl: url })) }
    catch (e) { toast.error((e as Error).message) }
    finally { setUploading(false) }
  }

  if (editing) {
    return (
      <tr className="bg-primary/5">
        <td className="px-3 py-2">
          <RowThumbnail url={draft.imageUrl} onUpload={handleImageUpload} uploading={uploading} />
        </td>
        <td className="px-3 py-2">
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-3 py-2">
          <input value={draft.name_am} onChange={e => setDraft(d => ({ ...d, name_am: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button onClick={() => { onSave(draft); setEditing(false) }}
              className="flex h-7 w-7 items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setEditing(false)}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-muted/20 group">
      <td className="px-3 py-2">
        <RowThumbnail url={item.imageUrl} onUpload={async (f) => {
          const url = await onImageUpload(f); onSave({ ...item, imageUrl: url })
        }} uploading={uploading} />
      </td>
      <td className="px-3 py-2 font-medium text-sm">{item.name}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{item.name_am}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setDraft({ ...item }); setEditing(true) }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setConfirmDelete(true)}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <ConfirmDialog open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={() => { onDelete(); setConfirmDelete(false) }}
          title="Delete item" message={`Delete "${item.name}"?`} confirmLabel="Delete" loading={false} />
      </td>
    </tr>
  )
}

// ── Meal Plans Tab ─────────────────────────────────────────────────────────────
function MealPlansTab() {
  const qc = useQueryClient()
  const [weightFilter, setWeightFilter] = useState<WeightCategory>('weight-gain')
  const [expandedDay, setExpandedDay] = useState<string | null>('Monday')
  const [saving, setSaving] = useState(false)

  const { data: dbRows = [], isLoading } = useQuery({
    queryKey: ['presets', 'meal'],
    queryFn: () => fetchPresets('meal'),
  })

  const dbRow = dbRows.find(r => r.id === weightFilter) ?? null
  // Use DB days if saved, else static seed
  const getDays = (): MealPlanDays => (dbRow?.data as any)?.days ?? PRESET_MEAL_PLAN_DATA[weightFilter]

  const saveBack = async (newDays: MealPlanDays) => {
    setSaving(true)
    try {
      await upsertPreset({
        id: weightFilter, type: 'meal',
        name: dbRow?.name ?? (weightFilter === 'weight-gain' ? 'Weight Gain Plan' : 'Weight Loss Plan'),
        name_am: dbRow?.name_am ?? null,
        description: dbRow?.description ?? null, description_am: dbRow?.description_am ?? null,
        tags: null, tags_am: null,
        target_goals: weightFilter === 'weight-gain' ? ['muscle','strength'] : ['fat'],
        target_bmi_categories: weightFilter === 'weight-gain' ? ['underweight'] : ['overweight','obese'],
        image_url: dbRow?.image_url ?? null,
        data: { days: newDays },
      })
      qc.invalidateQueries({ queryKey: ['presets', 'meal'] })

      // ── Auto-sync new foods into matching shopping list ───────────────────
      // Collect all food names from the updated meal plan
      const allFoodNames = new Set<string>()
      for (const day of Object.values(newDays)) {
        for (const slot of Object.values(day)) {
          for (const food of slot) {
            if (food.name) allFoodNames.add(food.name.toLowerCase().trim())
          }
        }
      }

      // Load current shopping list preset
      const shopRows = await fetchPresets('shopping')
      const shopRow = shopRows.find(r => r.id === weightFilter)
      const currentCats: ShoppingCategories = (shopRow?.data as any)?.categories ?? PRESET_SHOPPING_DATA[weightFilter]
      const newCats: ShoppingCategories = JSON.parse(JSON.stringify(currentCats))

      // Check which foods are missing from shopping list
      const existingNames = new Set<string>()
      for (const items of Object.values(newCats)) {
        for (const item of items as ShoppingItem[]) {
          if (item.name) existingNames.add(item.name.toLowerCase().trim())
        }
      }

      let added = 0
      for (const foodName of allFoodNames) {
        if (!existingNames.has(foodName)) {
          // Find the matching food item for its amharic name
          let amName = ''
          outer: for (const day of Object.values(newDays)) {
            for (const slot of Object.values(day)) {
              for (const food of slot) {
                if (food.name?.toLowerCase().trim() === foodName) {
                  amName = food.name_am ?? ''
                  break outer
                }
              }
            }
          }
          // Add to 'Other' category (admin can move it later)
          if (!newCats['Other']) newCats['Other'] = []
          newCats['Other'].push({ name: foodName.charAt(0).toUpperCase() + foodName.slice(1), name_am: amName })
          existingNames.add(foodName)
          added++
        }
      }

      if (added > 0) {
        await upsertPreset({
          id: weightFilter, type: 'shopping',
          name: shopRow?.name ?? (weightFilter === 'weight-gain' ? 'Weight Gain Shopping List' : 'Weight Loss Shopping List'),
          name_am: shopRow?.name_am ?? null,
          description: shopRow?.description ?? null, description_am: shopRow?.description_am ?? null,
          tags: null, tags_am: null,
          target_goals: weightFilter === 'weight-gain' ? ['muscle','strength'] : ['fat'],
          target_bmi_categories: weightFilter === 'weight-gain' ? ['underweight'] : ['overweight','obese'],
          image_url: shopRow?.image_url ?? null,
          data: { categories: newCats },
        })
        qc.invalidateQueries({ queryKey: ['presets', 'shopping'] })
        toast.success(`Saved · Added ${added} new item${added > 1 ? 's' : ''} to shopping list`)
      } else {
        toast.success('Saved')
      }
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleFoodSave = async (day: string, slot: string, index: number, updated: FoodItem & { imageUrl?: string }) => {
    const days = getDays()
    const newDays: MealPlanDays = JSON.parse(JSON.stringify(days))
    ;(newDays[day] as any)[slot][index] = updated
    await saveBack(newDays)
  }

  const handleFoodDelete = async (day: string, slot: string, index: number) => {
    const days = getDays()
    const newDays: MealPlanDays = JSON.parse(JSON.stringify(days))
    ;(newDays[day] as any)[slot].splice(index, 1)
    await saveBack(newDays)
  }

  const handleFoodAdd = async (day: string, slot: string) => {
    const days = getDays()
    const newDays: MealPlanDays = JSON.parse(JSON.stringify(days))
    ;(newDays[day] as any)[slot].push({ name: 'New food', name_am: '', calories: 0, protein: 0, carbs: 0, fat: 0 })
    await saveBack(newDays)
  }

  const handleFoodImageUpload = async (day: string, slot: string, index: number, file: File): Promise<string> => {
    const key = `meal-${weightFilter}-${day}-${slot}-${index}`
    const url = await uploadPresetImage(key, file)
    const days = getDays()
    const newDays: MealPlanDays = JSON.parse(JSON.stringify(days))
    ;(newDays[day] as any)[slot][index] = { ...(newDays[day] as any)[slot][index], imageUrl: url }
    await saveBack(newDays)
    return url
  }

  const opt = WEIGHT_OPTIONS.find(o => o.id === weightFilter)!
  const CatIcon = opt.icon

  return (
    <div className="space-y-5 pt-5">
      {/* Weight filter tabs */}
      <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg w-fit">
        {WEIGHT_OPTIONS.map(o => {
          const Icon = o.icon
          return (
            <button key={o.id} onClick={() => setWeightFilter(o.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${weightFilter === o.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className={`h-4 w-4 ${o.color}`} />
              {o.label}
            </button>
          )
        })}
        {saving && <Spinner size="sm" className="ml-2" />}
      </div>

      {/* Category header with icon */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${opt.bg}`}>
        <CatIcon className={`h-6 w-6 ${opt.color}`} />
        <div>
          <p className="font-semibold text-sm">{weightFilter === 'weight-gain' ? 'Weight Gain Meal Plan' : 'Weight Loss Meal Plan'}</p>
          <p className="text-xs text-muted-foreground">7-day Ethiopian preset · click any row to edit</p>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="space-y-3">
          {DAYS_ORDER.map(day => {
            const slots = getDays()[day] ?? {}
            const totalFoods = Object.values(slots).flat().length
            const totalCals = Object.values(slots).flat().reduce((s, f: any) => s + (f.calories ?? 0), 0)
            const isExpanded = expandedDay === day
            return (
              <div key={day} className="rounded-lg border border-border overflow-hidden">
                <button type="button" onClick={() => setExpandedDay(isExpanded ? null : day)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{day}</span>
                    <Badge variant="default" className="text-[10px]">{totalFoods} foods</Badge>
                    <span className="text-xs text-muted-foreground">{totalCals} kcal</span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="divide-y divide-border/40">
                    {Object.entries(SLOT_LABELS).map(([slotId, slotLabel]) => {
                      const foods: (FoodItem & { imageUrl?: string })[] = (slots as any)[slotId] ?? []
                      return (
                        <div key={slotId} className="px-0">
                          <div className="flex items-center justify-between px-4 py-2 bg-muted/10">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{slotLabel}</span>
                            <PermissionGate permission="nutrition.delete">
                              <button onClick={() => handleFoodAdd(day, slotId)}
                                className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Plus className="h-3 w-3" />Add
                              </button>
                            </PermissionGate>
                          </div>
                          {foods.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead><tr className="border-b border-border/40 bg-muted/5">
                                  <th className="px-3 py-1.5 w-12"></th>
                                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Name (EN)</th>
                                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Name (AM)</th>
                                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground w-20">kcal</th>
                                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground w-16 hidden md:table-cell">Prot</th>
                                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground w-16 hidden md:table-cell">Carb</th>
                                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground w-16 hidden md:table-cell">Fat</th>
                                  <th className="px-3 py-1.5 w-20"></th>
                                </tr></thead>
                                <tbody className="divide-y divide-border/30">
                                  {foods.map((food, i) => (
                                    <FoodRow key={i} food={food} index={i}
                                      onSave={(updated) => handleFoodSave(day, slotId, i, updated)}
                                      onDelete={() => handleFoodDelete(day, slotId, i)}
                                      onImageUpload={(f) => handleFoodImageUpload(day, slotId, i, f)} />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Shopping Lists Tab ────────────────────────────────────────────────────────
function ShoppingListsTab() {
  const qc = useQueryClient()
  const [weightFilter, setWeightFilter] = useState<WeightCategory>('weight-gain')
  const [saving, setSaving] = useState(false)

  const { data: dbRows = [], isLoading } = useQuery({
    queryKey: ['presets', 'shopping'],
    queryFn: () => fetchPresets('shopping'),
  })

  const dbRow = dbRows.find(r => r.id === weightFilter) ?? null
  const getCategories = (): ShoppingCategories => (dbRow?.data as any)?.categories ?? PRESET_SHOPPING_DATA[weightFilter]

  const saveBack = async (newCats: ShoppingCategories) => {
    setSaving(true)
    try {
      await upsertPreset({
        id: weightFilter, type: 'shopping',
        name: dbRow?.name ?? (weightFilter === 'weight-gain' ? 'Weight Gain Shopping List' : 'Weight Loss Shopping List'),
        name_am: dbRow?.name_am ?? null,
        description: dbRow?.description ?? null, description_am: dbRow?.description_am ?? null,
        tags: null, tags_am: null,
        target_goals: weightFilter === 'weight-gain' ? ['muscle','strength'] : ['fat'],
        target_bmi_categories: weightFilter === 'weight-gain' ? ['underweight'] : ['overweight','obese'],
        image_url: dbRow?.image_url ?? null,
        data: { categories: newCats },
      })
      qc.invalidateQueries({ queryKey: ['presets', 'shopping'] })
      toast.success('Saved')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleItemSave = async (cat: string, index: number, updated: ShoppingItem & { imageUrl?: string }) => {
    const cats = getCategories()
    const newCats: ShoppingCategories = JSON.parse(JSON.stringify(cats))
    newCats[cat][index] = updated
    await saveBack(newCats)
  }

  const handleItemDelete = async (cat: string, index: number) => {
    const cats = getCategories()
    const newCats: ShoppingCategories = JSON.parse(JSON.stringify(cats))
    newCats[cat].splice(index, 1)
    await saveBack(newCats)
  }

  const handleItemAdd = async (cat: string) => {
    const cats = getCategories()
    const newCats: ShoppingCategories = JSON.parse(JSON.stringify(cats))
    newCats[cat].push({ name: 'New item', name_am: '' })
    await saveBack(newCats)
  }

  const handleItemImageUpload = async (cat: string, index: number, file: File): Promise<string> => {
    const key = `shopping-${weightFilter}-${cat}-${index}`
    const url = await uploadPresetImage(key, file)
    const cats = getCategories()
    const newCats: ShoppingCategories = JSON.parse(JSON.stringify(cats))
    newCats[cat][index] = { ...newCats[cat][index], imageUrl: url } as any
    await saveBack(newCats)
    return url
  }

  const opt = WEIGHT_OPTIONS.find(o => o.id === weightFilter)!
  const CatIcon = opt.icon
  const categories = getCategories()
  const totalItems = Object.values(categories).flat().length

  return (
    <div className="space-y-5 pt-5">
      {/* Weight filter */}
      <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-lg w-fit">
        {WEIGHT_OPTIONS.map(o => {
          const Icon = o.icon
          return (
            <button key={o.id} onClick={() => setWeightFilter(o.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${weightFilter === o.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className={`h-4 w-4 ${o.color}`} />
              {o.label}
            </button>
          )
        })}
        {saving && <Spinner size="sm" className="ml-2" />}
      </div>

      {/* Category header icon */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${opt.bg}`}>
        <CatIcon className={`h-6 w-6 ${opt.color}`} />
        <div>
          <p className="font-semibold text-sm">{weightFilter === 'weight-gain' ? 'Weight Gain Shopping List' : 'Weight Loss Shopping List'}</p>
          <p className="text-xs text-muted-foreground">{totalItems} items across {Object.keys(categories).length} categories</p>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <div className="space-y-3">
          {Object.entries(categories).map(([cat, items]) => (
            <div key={cat} className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{cat}</span>
                  <Badge variant="default" className="text-[10px]">{(items as ShoppingItem[]).length}</Badge>
                </div>
                <PermissionGate permission="nutrition.delete">
                  <button onClick={() => handleItemAdd(cat)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus className="h-3 w-3" />Add item
                  </button>
                </PermissionGate>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border/40 bg-muted/5">
                    <th className="px-3 py-1.5 w-12"></th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Name (EN)</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Name (AM)</th>
                    <th className="px-3 py-1.5 w-20"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/30">
                    {(items as (ShoppingItem & { imageUrl?: string })[]).map((item, i) => (
                      <ShopRow key={i} item={item}
                        onSave={(updated) => handleItemSave(cat, i, updated)}
                        onDelete={() => handleItemDelete(cat, i)}
                        onImageUpload={(f) => handleItemImageUpload(cat, i, f)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function NutritionPage() {
  const [activeTab, setActiveTab] = useState('mealplans')
  return (
    <PageShell title="Nutrition" description="Manage preset meal plans and shopping lists." icon={Salad}>
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="mealplans" active={activeTab}><MealPlansTab /></TabPanel>
      <TabPanel id="shopping"  active={activeTab}><ShoppingListsTab /></TabPanel>
    </PageShell>
  )
}
