/**
 * NutritionPage.tsx — Full Nutrition Administration
 * Tabs: Overview | Foods | Ethiopian Foods | Meal Plans | Shopping Lists | Categories
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { Salad, RefreshCw, Plus, Pencil, Trash2, Download, Upload,
  Search, CheckCircle2, XCircle, Star } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Badge as B } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PermissionGate } from '@/components/guards/PermissionGate'
import { FoodForm } from '@/components/nutrition/FoodForm'
import { EthiopianFoodForm } from '@/components/nutrition/EthiopianFoodForm'
import { CsvImportModal } from '@/components/nutrition/CsvImportModal'
import {
  fetchFoods, fetchEthiopianFoods, fetchMealPlans, fetchShoppingItems,
  softDeleteFood, bulkDeleteFoods, exportFoods, importFoods,
  deleteEthiopianFood, exportEthiopianFoods, importEthiopianFoods,
  deleteMealPlanRow, deleteShoppingItem,
  arrayToCsv, downloadCsv, csvToArray,
  FOOD_SOURCES, ETH_CATEGORIES, MEAL_SLOTS,
  type Food, type EthiopianFood, type FoodFilters,
} from '@/lib/nutrition.queries'

const PAGE_SIZE = 25

const toOpts = (arr: readonly string[], withAll = true) => [
  ...(withAll ? [{ value: '', label: 'All' }] : []),
  ...arr.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) })),
]

const DEFAULT_FILTERS: FoodFilters = {
  search: '', source: '', verified_only: false, featured_only: false, ethiopian_only: false,
}

const PAGE_TABS = [
  { id: 'overview',   label: 'Overview',        icon: Salad },
  { id: 'foods',      label: 'Foods',           icon: Salad },
  { id: 'ethiopian',  label: 'Ethiopian Foods', icon: Salad },
  { id: 'mealplans',  label: 'Meal Plans',      icon: Salad },
  { id: 'shopping',   label: 'Shopping Lists',  icon: Salad },
  { id: 'categories', label: 'Categories',      icon: Salad },
]

const FOOD_CSV_HEADERS = ['name','name_am','brand','source','serving_size','serving_unit','calories','protein_g','carbs_g','fat_g','fiber_g','sugar_g','sodium_mg','potassium_mg','vitamin_c_mg','iron_mg','calcium_mg','barcode','is_verified','is_featured','tags']
const FOOD_CSV_TEMPLATE_ROW: Record<string, string> = { name:'Injera',name_am:'እንጀራ',brand:'',source:'ethiopian',serving_size:'100',serving_unit:'g',calories:'174',protein_g:'5.7',carbs_g:'36.5',fat_g:'0.8',fiber_g:'3.2',sugar_g:'',sodium_mg:'',potassium_mg:'',vitamin_c_mg:'',iron_mg:'',calcium_mg:'',barcode:'',is_verified:'true',is_featured:'true',tags:'grain,fermented' }

const ETH_CSV_HEADERS = ['food_id','name_en','name_am','category','region','is_vegan','is_vegetarian','is_fasting_safe','description','common_ingredients']
const ETH_CSV_TEMPLATE_ROW: Record<string, string> = { food_id:'<uuid-from-foods-table>',name_en:'Injera',name_am:'እንጀራ',category:'injera_based',region:'national',is_vegan:'true',is_vegetarian:'true',is_fasting_safe:'true',description:'Spongy sourdough flatbread',common_ingredients:'teff flour,water,salt' }

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: foodCount }     = useQuery({ queryKey: ['food-count'],     queryFn: async () => { const { count } = await supabase.from('foods').select('id', { count: 'exact', head: true }).is('deleted_at', null); return count ?? 0 } })
  const { data: ethCount }      = useQuery({ queryKey: ['eth-count'],      queryFn: async () => { const { count } = await supabase.from('ethiopian_foods').select('id', { count: 'exact', head: true }); return count ?? 0 } })
  const { data: mealPlanCount } = useQuery({ queryKey: ['meal-plan-count'],queryFn: async () => { const { count } = await supabase.from('meal_plans').select('id', { count: 'exact', head: true }); return count ?? 0 } })
  const { data: mealLogCount }  = useQuery({ queryKey: ['meal-log-count'], queryFn: async () => { const { count } = await supabase.from('meal_logs').select('id', { count: 'exact', head: true }); return count ?? 0 } })
  const { data: shopCount }     = useQuery({ queryKey: ['shop-count'],     queryFn: async () => { const { count } = await supabase.from('shopping_list_items').select('id', { count: 'exact', head: true }); return count ?? 0 } })
  const { data: verifiedCount } = useQuery({ queryKey: ['verified-count'], queryFn: async () => { const { count } = await supabase.from('foods').select('id', { count: 'exact', head: true }).eq('is_verified', true); return count ?? 0 } })

  const stats = [
    { label: 'Total foods', value: foodCount ?? '—' },
    { label: 'Ethiopian foods', value: ethCount ?? '—' },
    { label: 'Verified foods', value: verifiedCount ?? '—' },
    { label: 'Meal plan rows', value: mealPlanCount ?? '—' },
    { label: 'Meal log entries', value: mealLogCount ?? '—' },
    { label: 'Shopping items', value: shopCount ?? '—' },
  ]

  return (
    <div className="space-y-5 pt-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Source breakdown */}
      <SourceBreakdown />
    </div>
  )
}

function SourceBreakdown() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['food-source-breakdown'],
    queryFn: async () => {
      const results = await Promise.all(
        FOOD_SOURCES.map(async (src) => {
          const { count } = await supabase.from('foods').select('id', { count: 'exact', head: true }).eq('source', src).is('deleted_at', null)
          return { source: src, count: count ?? 0 }
        })
      )
      return results.filter((r) => r.count > 0)
    },
  })

  return (
    <Card>
      <CardHeader><CardTitle>Foods by Source</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : (
          <div className="flex flex-wrap gap-3">
            {data.map((r) => (
              <div key={r.source} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                <span className="text-sm font-medium capitalize">{r.source.replace(/_/g, ' ')}</span>
                <Badge variant="info">{r.count}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Foods Tab ─────────────────────────────────────────────────────────────────

function FoodsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<FoodFilters>(DEFAULT_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Food | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Food | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['foods', page, filters],
    queryFn: () => fetchFoods(page, PAGE_SIZE, filters),
    placeholderData: (p) => p,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['foods'] })

  const handleSearch = (v: string) => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setFilters((f) => ({ ...f, search: v })); setPage(0) }, 300)
  }

  const upd = (patch: Partial<FoodFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(0) }

  const toggleSelect = (id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => {
    const ids = data?.data.map((f) => f.id) ?? []
    setSelectedIds(ids.every((id) => selectedIds.has(id)) ? new Set() : new Set(ids))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await softDeleteFood(deleteTarget.id); toast.success('Food deleted'); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try { await bulkDeleteFoods([...selectedIds]); toast.success(`Deleted ${selectedIds.size} foods`); setSelectedIds(new Set()); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setBulkDeleteOpen(false) }
  }

  const handleExport = async () => {
    try {
      const foods = await exportFoods()
      const csv = arrayToCsv(foods.map((f) => ({ name: f.name, name_am: f.name_am ?? '', source: f.source, calories: f.calories ?? '', protein_g: f.protein_g ?? '', carbs_g: f.carbs_g ?? '', fat_g: f.fat_g ?? '', fiber_g: f.fiber_g ?? '', sodium_mg: f.sodium_mg ?? '', is_verified: f.is_verified, is_featured: f.is_featured, barcode: f.barcode ?? '', tags: f.tags?.join(';') ?? '' })))
      downloadCsv(csv, `foods-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`Exported ${foods.length} foods`)
    } catch (e) { toast.error((e as Error).message) }
  }

  const toggleVerified = async (food: Food) => {
    const { error } = await supabase.from('foods').update({ is_verified: !food.is_verified }).eq('id', food.id)
    if (error) { toast.error(error.message); return }
    toast.success(food.is_verified ? 'Unverified' : 'Verified')
    invalidate()
  }

  const toggleFeatured = async (food: Food) => {
    const { error } = await supabase.from('foods').update({ is_featured: !food.is_featured }).eq('id', food.id)
    if (error) { toast.error(error.message); return }
    toast.success(food.is_featured ? 'Removed from featured' : 'Marked as featured')
    invalidate()
  }

  return (
    <div className="space-y-4 pt-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="search" placeholder="Search foods…" onChange={(e) => handleSearch(e.target.value)}
              className="flex h-9 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <select value={filters.source} onChange={(e) => upd({ source: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(FOOD_SOURCES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={filters.verified_only} onChange={(e) => upd({ verified_only: e.target.checked })} />Verified only
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={filters.featured_only} onChange={(e) => upd({ featured_only: e.target.checked })} />Featured only
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>Delete {selectedIds.size}</Button>}
          <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>Export CSV</Button>
          <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>Import CSV</Button>
          <PermissionGate permission="nutrition.delete">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditTarget(null); setFormOpen(true) }}>Add food</Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>Total: <strong className="text-foreground">{data?.total ?? '—'}</strong></span>
        <span>Verified: <strong className="text-foreground">{(data?.data ?? []).filter((f) => f.is_verified).length}</strong></span>
        <span>Featured: <strong className="text-foreground">{(data?.data ?? []).filter((f) => f.is_featured).length}</strong></span>
        {isFetching && <Spinner size="sm" />}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 w-10"><input type="checkbox" checked={!!data?.data.length && data.data.every((f) => selectedIds.has(f.id))} onChange={toggleAll} className="rounded" /></th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Source</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Cal</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Protein</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Carbs</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">Fat</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((f) => (
                  <tr key={f.id} className={`hover:bg-muted/20 ${selectedIds.has(f.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2.5 w-10"><input type="checkbox" checked={selectedIds.has(f.id)} onChange={() => toggleSelect(f.id)} className="rounded" /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{f.name}</span>
                        {f.name_am && <span className="text-muted-foreground text-xs">{f.name_am}</span>}
                        {f.is_featured && <Badge variant="warning">Featured</Badge>}
                        {f.is_verified && <Badge variant="success">Verified</Badge>}
                        {f.image_url && <Badge variant="info">Image</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{f.source?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell tabular-nums">{f.calories?.toFixed(0) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">{f.protein_g ? `${f.protein_g}g` : '—'}</td>
                    <td className="px-4 py-2.5 text-right hidden lg:table-cell text-muted-foreground tabular-nums">{f.carbs_g ? `${f.carbs_g}g` : '—'}</td>
                    <td className="px-4 py-2.5 text-right hidden lg:table-cell text-muted-foreground tabular-nums">{f.fat_g ? `${f.fat_g}g` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleVerified(f)} title={f.is_verified ? 'Unverify' : 'Verify'}
                          className={`flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-secondary ${f.is_verified ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => toggleFeatured(f)} title={f.is_featured ? 'Unfeature' : 'Feature'}
                          className={`flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-secondary ${f.is_featured ? 'text-amber-400' : 'text-muted-foreground'}`}>
                          <Star className="h-3.5 w-3.5" fill={f.is_featured ? 'currentColor' : 'none'} />
                        </button>
                        <PermissionGate permission="nutrition.delete">
                          <button onClick={() => { setEditTarget(f); setFormOpen(true) }} title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(f)} title="Delete"
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

      <FoodForm open={formOpen} onClose={() => setFormOpen(false)} food={editTarget} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Food" message={`Soft-delete "${deleteTarget?.name}"?`} confirmLabel="Delete" loading={deleting} />
      <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} foods`} message="Soft-delete selected foods?" confirmLabel={`Delete ${selectedIds.size}`} loading={deleting} />
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} title="Foods"
        templateHeaders={FOOD_CSV_HEADERS} templateRow={FOOD_CSV_TEMPLATE_ROW}
        onImport={(rows) => importFoods(rows as Parameters<typeof importFoods>[0])}
        onSuccess={invalidate} />
    </div>
  )
}

// ── Ethiopian Foods Tab ───────────────────────────────────────────────────────

function EthiopianFoodsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EthiopianFood | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EthiopianFood | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['ethiopian-foods', page, search, category],
    queryFn: () => fetchEthiopianFoods(page, PAGE_SIZE, search, category),
    placeholderData: (p) => p,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['ethiopian-foods'] })

  const handleSearch = (v: string) => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setSearch(v); setPage(0) }, 300)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteEthiopianFood(deleteTarget.id); toast.success('Deleted'); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const handleExport = async () => {
    try {
      const items = await exportEthiopianFoods()
      const csv = arrayToCsv(items.map((i) => ({ food_id: i.food_id, name_en: i.name_en, name_am: i.name_am, category: i.category, region: i.region ?? '', is_vegan: i.is_vegan, is_vegetarian: i.is_vegetarian, is_fasting_safe: i.is_fasting_safe, description: i.description ?? '', common_ingredients: i.common_ingredients?.join(';') ?? '' })))
      downloadCsv(csv, `ethiopian-foods-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`Exported ${items.length} items`)
    } catch (e) { toast.error((e as Error).message) }
  }

  const catOpts = toOpts(ETH_CATEGORIES)

  return (
    <div className="space-y-4 pt-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="search" placeholder="Search Ethiopian foods…" onChange={(e) => handleSearch(e.target.value)}
              className="flex h-9 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0) }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {catOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>Export CSV</Button>
          <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>Import CSV</Button>
          <PermissionGate permission="nutrition.delete">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditTarget(null); setFormOpen(true) }}>Add</Button>
          </PermissionGate>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name (EN)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name (AM)</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Region</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Dietary</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      <div className="font-medium">{item.name_en}</div>
                      {item.food_name && item.food_name !== item.name_en && (
                        <div className="text-xs text-muted-foreground">{item.food_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.name_am}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{item.category?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground capitalize">{item.region?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {item.is_vegan && <Badge variant="success">Vegan</Badge>}
                        {item.is_fasting_safe && <Badge variant="info">Fasting</Badge>}
                        {!item.is_vegan && item.is_vegetarian && <Badge variant="outline">Veg</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <PermissionGate permission="nutrition.delete">
                          <button onClick={() => { setEditTarget(item); setFormOpen(true) }} title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(item)} title="Delete"
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

      <EthiopianFoodForm open={formOpen} onClose={() => setFormOpen(false)} item={editTarget} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Ethiopian Food" message={`Delete "${deleteTarget?.name_en}"? This is a hard delete.`}
        confirmLabel="Delete" loading={deleting} />
      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} title="Ethiopian Foods"
        templateHeaders={ETH_CSV_HEADERS} templateRow={ETH_CSV_TEMPLATE_ROW}
        onImport={(rows) => importEthiopianFoods(rows as Parameters<typeof importEthiopianFoods>[0])}
        onSuccess={invalidate} />
    </div>
  )
}

// ── Meal Plans Tab ────────────────────────────────────────────────────────────

function MealPlansTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; day: string; slot: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['meal-plans-admin', page],
    queryFn: () => fetchMealPlans(page, PAGE_SIZE),
    placeholderData: (p) => p,
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteMealPlanRow(deleteTarget.userId, deleteTarget.day, deleteTarget.slot); toast.success('Meal plan row deleted'); qc.invalidateQueries({ queryKey: ['meal-plans-admin'] }) }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const handleExport = () => {
    const rows = data?.data ?? []
    const csv = arrayToCsv(rows.map((r) => ({ user_id: r.user_id, user_name: r.user_name ?? '', day_of_week: r.day_of_week, meal_slot: r.meal_slot, food_name: r.food_name, calories: r.calories ?? '', protein_g: r.protein_g ?? '', carbs_g: r.carbs_g ?? '', fat_g: r.fat_g ?? '' })))
    downloadCsv(csv, `meal-plans-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Exported current page')
  }

  const SLOT_LABELS: Record<string, string> = { breakfast: 'Breakfast', morningSnack: 'AM Snack', lunch: 'Lunch', afternoonSnack: 'PM Snack', dinner: 'Dinner', beforeBed: 'Before Bed' }

  return (
    <div className="space-y-4 pt-5">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>Export page CSV</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Day</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Meal</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Food</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Cal</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Protein</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium truncate max-w-[120px]">{r.user_name ?? <span className="italic text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.day_of_week}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{SLOT_LABELS[r.meal_slot] ?? r.meal_slot}</td>
                    <td className="px-4 py-2.5 max-w-[160px] truncate">{r.food_name}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">{r.calories?.toFixed(0) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right hidden md:table-cell text-muted-foreground tabular-nums">{r.protein_g ? `${r.protein_g}g` : '—'}</td>
                    <td className="px-4 py-2.5">
                      <PermissionGate permission="nutrition.delete">
                        <button onClick={() => setDeleteTarget({ userId: r.user_id, day: r.day_of_week, slot: r.meal_slot, name: r.food_name })} title="Delete row"
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-auto">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Meal Plan Row" message={`Delete "${deleteTarget?.name}" from ${deleteTarget?.day} ${deleteTarget?.slot}?`}
        confirmLabel="Delete" loading={deleting} />
    </div>
  )
}

// ── Shopping Lists Tab ────────────────────────────────────────────────────────

function ShoppingListsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['shopping-admin', page],
    queryFn: () => fetchShoppingItems(page, PAGE_SIZE),
    placeholderData: (p) => p,
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await deleteShoppingItem(deleteTarget.id); toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['shopping-admin'] }) }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const handleExport = () => {
    const csv = arrayToCsv((data?.data ?? []).map((r) => ({ user_name: r.user_name ?? '', name: r.name, category: r.category, quantity: r.quantity ?? '', unit: r.unit ?? '', is_checked: r.is_checked, week_of: r.week_of ?? '' })))
    downloadCsv(csv, `shopping-lists-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('Exported current page')
  }

  return (
    <div className="space-y-4 pt-5">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>Export page CSV</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Qty</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Week</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium truncate max-w-[120px]">{item.user_name ?? <span className="italic text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5">{item.name}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{item.category}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{item.quantity ? `${item.quantity} ${item.unit ?? ''}`.trim() : '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{item.week_of ? formatDate(item.week_of) : '—'}</td>
                    <td className="px-4 py-2.5">
                      {item.is_checked
                        ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Done</span>
                        : <span className="flex items-center gap-1 text-muted-foreground text-xs"><XCircle className="h-3.5 w-3.5" />Pending</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <PermissionGate permission="nutrition.delete">
                        <button onClick={() => setDeleteTarget({ id: item.id, name: item.name })} title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-auto">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Shopping Item" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" loading={deleting} />
    </div>
  )
}

// ── Categories Tab ────────────────────────────────────────────────────────────

function CategoriesTab() {
  const ethCatQuery = useQuery({
    queryKey: ['eth-cat-breakdown'],
    queryFn: async () => {
      const results = await Promise.all(
        ETH_CATEGORIES.map(async (cat) => {
          const { count } = await supabase.from('ethiopian_foods').select('id', { count: 'exact', head: true }).eq('category', cat)
          return { category: cat, count: count ?? 0 }
        })
      )
      return results
    },
  })

  const slotQuery = useQuery({
    queryKey: ['meal-slot-breakdown'],
    queryFn: async () => {
      const results = await Promise.all(
        MEAL_SLOTS.map(async (slot) => {
          const { count } = await supabase.from('meal_plans').select('id', { count: 'exact', head: true }).eq('meal_slot', slot)
          return { slot, count: count ?? 0 }
        })
      )
      return results
    },
  })

  return (
    <div className="space-y-5 pt-5">
      <Card>
        <CardHeader><CardTitle>Ethiopian Food Categories</CardTitle></CardHeader>
        <CardContent>
          {ethCatQuery.isLoading ? <Spinner /> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(ethCatQuery.data ?? []).map((c) => (
                <div key={c.category} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <span className="text-sm font-medium capitalize">{c.category.replace(/_/g, ' ')}</span>
                  <Badge variant={c.count > 0 ? 'info' : 'outline'}>{c.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Meal Slots</CardTitle></CardHeader>
        <CardContent>
          {slotQuery.isLoading ? <Spinner /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(slotQuery.data ?? []).map((s) => (
                <div key={s.slot} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                  <span className="text-sm font-medium">{s.slot.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                  <Badge variant={s.count > 0 ? 'success' : 'outline'}>{s.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Food Source Types</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FOOD_SOURCES.map((src) => (
              <div key={src} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-medium capitalize">
                {src.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Source types are database enum values. To add a new source, run an <code className="bg-muted px-1 rounded">ALTER TYPE food_source ADD VALUE</code> migration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function NutritionPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <PageShell
      title="Nutrition Administration"
      description="Manage the food database, Ethiopian foods, meal plans, and shopping lists."
      icon={Salad}
    >
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="overview"   active={activeTab}><OverviewTab /></TabPanel>
      <TabPanel id="foods"      active={activeTab}><FoodsTab /></TabPanel>
      <TabPanel id="ethiopian"  active={activeTab}><EthiopianFoodsTab /></TabPanel>
      <TabPanel id="mealplans"  active={activeTab}><MealPlansTab /></TabPanel>
      <TabPanel id="shopping"   active={activeTab}><ShoppingListsTab /></TabPanel>
      <TabPanel id="categories" active={activeTab}><CategoriesTab /></TabPanel>
    </PageShell>
  )
}
