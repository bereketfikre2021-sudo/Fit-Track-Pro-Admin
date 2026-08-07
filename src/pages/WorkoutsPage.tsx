/**
 * WorkoutsPage.tsx — Full Workout Administration
 * Tabs: Sessions | Exercise Library | Templates | Reference Data
 *
 * The old ExercisesPage (/exercises) still exists for the sidebar shortcut
 * but now redirects here.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { Dumbbell, RefreshCw, CheckCircle2, XCircle, Plus, Pencil, Trash2,
  Star, Download, Upload, Search, Filter, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { PermissionGate } from '@/components/guards/PermissionGate'
import { ExerciseForm } from '@/components/workout/ExerciseForm'
import { TemplateForm } from '@/components/workout/TemplateForm'
import { BulkImportModal } from '@/components/workout/BulkImportModal'
import { ReferenceDataPanel } from '@/components/workout/ReferenceDataPanel'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  fetchExercises, softDeleteExercise, bulkDeleteExercises, exportExercises, importExercises,
  fetchTemplates, softDeleteTemplate, bulkDeleteTemplates, exportTemplates, importTemplates,
  CATEGORIES, DIFFICULTIES, MUSCLE_GROUPS, EQUIPMENT_LIST,
  type Exercise, type WorkoutTemplate, type ExerciseFilters, type TemplateFilters,
} from '@/lib/workout.queries'

const PAGE_SIZE = 25

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const DEFAULT_EX_FILTERS: ExerciseFilters = {
  search: '', category: '', difficulty: '', muscle_group: '', equipment: '', phase: '', featured_only: false,
}

const DEFAULT_TPL_FILTERS: TemplateFilters = {
  search: '', category: '', difficulty: '', featured_only: false, global_only: true,
}

const PAGE_TABS = [
  { id: 'sessions',   label: 'Sessions',        icon: Dumbbell },
  { id: 'exercises',  label: 'Exercise Library', icon: Dumbbell },
  { id: 'templates',  label: 'Workout Templates', icon: Copy },
  { id: 'reference',  label: 'Reference Data',   icon: Filter },
]

// ══════════════════════════════════════════════════════════════════════════════
// SESSIONS TAB
// ══════════════════════════════════════════════════════════════════════════════

function SessionsTab() {
  const [page, setPage] = useState(0)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['all-workouts', page],
    queryFn: async () => {
      const from = page * PAGE_SIZE; const to = from + PAGE_SIZE - 1
      const { data, error, count } = await supabase
        .from('workout_sessions')
        .select('id, user_id, session_date, day_of_week, completed_count, total_count, skipped, calories_burned, perceived_effort', { count: 'exact' })
        .order('session_date', { ascending: false })
        .range(from, to)
      if (error) throw error
      const userIds = [...new Set((data ?? []).map((s) => s.user_id))]
      const userMap: Record<string, string> = {}
      if (userIds.length) {
        const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
        for (const u of users ?? []) userMap[u.id] = u.name
      }
      return { data: (data ?? []).map((s) => ({ ...s, user_name: userMap[s.user_id] ?? null })), total: count ?? 0 }
    },
    placeholderData: (p) => p,
  })

  const { data: chartData = [] } = useQuery({
    queryKey: ['workout-chart'],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 29)
      const { data } = await supabase.from('workout_sessions').select('session_date, skipped').gte('session_date', since.toISOString().slice(0, 10)).eq('skipped', false)
      const counts: Record<string, number> = {}
      for (const s of data ?? []) { const d = s.session_date as string; counts[d] = (counts[d] ?? 0) + 1 }
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i))
        const key = d.toISOString().slice(0, 10)
        return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), sessions: counts[key] ?? 0 }
      })
    },
  })

  const completed = (data?.data ?? []).filter((s) => !s.skipped).length

  return (
    <div className="space-y-5 pt-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={isFetching} onClick={() => refetch()}>Refresh</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total sessions', value: data?.total ?? '—' },
          { label: 'Completed (page)', value: completed },
          { label: 'Skipped (page)', value: (data?.data ?? []).filter((s) => s.skipped).length },
          { label: 'Avg effort (page)', value: (() => { const e = (data?.data ?? []).filter((s) => s.perceived_effort); return e.length ? (e.reduce((a, s) => a + (s.perceived_effort ?? 0), 0) / e.length).toFixed(1) : '—' })() },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Daily Completed Sessions — Last 30 days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: 12 }} />
                <Bar dataKey="sessions" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Exercises</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Calories</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Effort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium truncate max-w-[140px]">{s.user_name ?? <span className="italic text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(s.session_date)} <span className="text-xs">({(s.day_of_week as string)?.slice(0, 3) ?? '?'})</span></td>
                    <td className="px-4 py-2.5">
                      {s.skipped
                        ? <span className="flex items-center gap-1 text-amber-400 text-xs"><XCircle className="h-3.5 w-3.5" />Skipped</span>
                        : <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="h-3.5 w-3.5" />Done</span>}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{s.completed_count ?? 0}/{s.total_count ?? 0}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{s.calories_burned ?? '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{s.perceived_effort ?? '—'}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EXERCISE LIBRARY TAB
// ══════════════════════════════════════════════════════════════════════════════

function ExercisesTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<ExerciseFilters>(DEFAULT_EX_FILTERS)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Exercise | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['exercises', page, filters],
    queryFn: () => fetchExercises(page, PAGE_SIZE, filters),
    placeholderData: (p) => p,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['exercises'] })

  const handleSearch = (v: string) => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setFilters((f) => ({ ...f, search: v })); setPage(0) }, 300)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const toggleAll = () => {
    const pageIds = data?.data.map((e) => e.id) ?? []
    const allSelected = pageIds.every((id) => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(pageIds))
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { await softDeleteExercise(deleteTarget.id); toast.success('Exercise deleted'); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setDeleteTarget(null) }
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    try {
      await bulkDeleteExercises([...selectedIds])
      toast.success(`Deleted ${selectedIds.size} exercises`)
      setSelectedIds(new Set())
      invalidate()
    } catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setBulkDeleteOpen(false) }
  }

  const handleExport = async () => {
    try { const data = await exportExercises(); downloadJson(data, `exercises-${new Date().toISOString().slice(0, 10)}.json`); toast.success(`Exported ${data.length} exercises`) }
    catch (e) { toast.error((e as Error).message) }
  }

  const toggleFeatured = async (e: Exercise) => {
    const { error } = await supabase
      .from('exercises')
      .update({ is_featured: !e.is_featured })
      .eq('id', e.id)
    if (error) { toast.error(error.message); return }
    toast.success(e.is_featured ? 'Removed from featured' : 'Marked as featured')
    invalidate()
  }

  const updateFilter = (patch: Partial<ExerciseFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(0) }

  const IMPORT_TEMPLATE = [{ name: 'Squat', muscle_group: 'quads', equipment: 'barbell', category: 'strength', difficulty: 'intermediate', phase: 'main', is_compound: true, met_value: 6.0 }]

  return (
    <div className="space-y-4 pt-5">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="search" placeholder="Search exercises…" onChange={(e) => handleSearch(e.target.value)}
              className="flex h-9 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <select value={filters.category} onChange={(e) => updateFilter({ category: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(CATEGORIES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.difficulty} onChange={(e) => updateFilter({ difficulty: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(DIFFICULTIES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.muscle_group} onChange={(e) => updateFilter({ muscle_group: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(MUSCLE_GROUPS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
              Delete {selectedIds.size} selected
            </Button>
          )}
          <Button size="sm" variant="outline" leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleExport}>Export</Button>
          <Button size="sm" variant="outline" leftIcon={<Upload className="h-3.5 w-3.5" />} onClick={() => setImportOpen(true)}>Import</Button>
          <PermissionGate permission="exercises.create">
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditTarget(null); setFormOpen(true) }}>Add exercise</Button>
          </PermissionGate>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: data?.total ?? '—' },
          { label: 'Featured (page)', value: (data?.data ?? []).filter((e) => e.is_featured).length },
          { label: 'Compound (page)', value: (data?.data ?? []).filter((e) => e.is_compound).length },
          { label: 'With video (page)', value: (data?.data ?? []).filter((e) => e.video_url).length },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg" /></div> : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={data?.data.length ? data.data.every((e) => selectedIds.has(e.id)) : false}
                      onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Muscle</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Difficulty</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Phase</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((e) => (
                  <tr key={e.id} className={`hover:bg-muted/20 ${selectedIds.has(e.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{e.name}</span>
                        {e.is_featured && <Badge variant="warning">Featured</Badge>}
                        {e.is_compound && <Badge variant="info">Compound</Badge>}
                        {e.is_time_based && <Badge variant="outline">Timed</Badge>}
                        {e.video_url && <Badge variant="success">Video</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{e.muscle_group?.replace(/_/g, ' ') ?? '—'}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground capitalize">{e.category ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {e.difficulty ? <Badge variant={DIFF_BADGE[e.difficulty] ?? 'outline'}>{e.difficulty}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground capitalize">{e.phase ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleFeatured(e)}
                          title={e.is_featured ? 'Unfeature' : 'Feature'}
                          aria-label={e.is_featured ? `Remove ${e.name} from featured` : `Mark ${e.name} as featured`}
                          className={`flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-secondary ${e.is_featured ? 'text-amber-400' : 'text-muted-foreground'}`}>
                          <Star className="h-3.5 w-3.5" fill={e.is_featured ? 'currentColor' : 'none'} />
                        </button>
                        <PermissionGate permission="exercises.edit">
                          <button onClick={() => { setEditTarget(e); setFormOpen(true) }} title="Edit"
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="exercises.delete">
                          <button onClick={() => setDeleteTarget(e)} title="Delete"
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

      <ExerciseForm open={formOpen} onClose={() => setFormOpen(false)} exercise={editTarget} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Exercise" message={`Soft-delete "${deleteTarget?.name}"? Hidden from users, data preserved.`}
        confirmLabel="Delete" loading={deleting} />
      <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} exercises`} message="Soft-delete all selected exercises? They will be hidden from users."
        confirmLabel={`Delete ${selectedIds.size}`} loading={deleting} />
      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} title="Exercises"
        templateData={IMPORT_TEMPLATE} fields={['name', 'category', 'difficulty', 'muscle_group', 'equipment', 'phase']}
        onImport={(rows) => importExercises(rows as Parameters<typeof importExercises>[0])}
        onSuccess={invalidate} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATES TAB
// ══════════════════════════════════════════════════════════════════════════════

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
    searchTimeout.current = setTimeout(() => { setFilters((f) => ({ ...f, search: v })); setPage(0) }, 300)
  }

  const updateFilter = (patch: Partial<TemplateFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(0) }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const toggleAll = () => {
    const pageIds = data?.data.map((t) => t.id) ?? []
    const allSelected = pageIds.every((id) => selectedIds.has(id))
    setSelectedIds(allSelected ? new Set() : new Set(pageIds))
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
    try { await bulkDeleteTemplates([...selectedIds]); toast.success(`Deleted ${selectedIds.size} templates`); setSelectedIds(new Set()); invalidate() }
    catch (e) { toast.error((e as Error).message) }
    finally { setDeleting(false); setBulkDeleteOpen(false) }
  }

  const handleExport = async () => {
    try { const d = await exportTemplates(); downloadJson(d, `templates-${new Date().toISOString().slice(0, 10)}.json`); toast.success(`Exported ${d.length} templates`) }
    catch (e) { toast.error((e as Error).message) }
  }

  const IMPORT_TEMPLATE = [{ name: 'Push Day', category: 'strength', difficulty: 'intermediate', duration_min: 60, is_public: true, exercises: [{ name: 'Bench Press', sets: 4, reps: '8-10', restSeconds: 90, phase: 'main' }] }]

  return (
    <div className="space-y-4 pt-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input type="search" placeholder="Search templates…" onChange={(e) => handleSearch(e.target.value)}
              className="flex h-9 w-52 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          </div>
          <select value={filters.category} onChange={(e) => updateFilter({ category: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(CATEGORIES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filters.difficulty} onChange={(e) => updateFilter({ difficulty: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            {toOpts(DIFFICULTIES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={filters.global_only} onChange={(e) => updateFilter({ global_only: e.target.checked })} />
            Global only
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={filters.featured_only} onChange={(e) => updateFilter({ featured_only: e.target.checked })} />
            Featured only
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>Delete {selectedIds.size}</Button>
          )}
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
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={data?.data.length ? data.data.every((t) => selectedIds.has(t.id)) : false}
                      onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Difficulty</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Duration</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">Exercises</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.data.map((t) => (
                  <tr key={t.id} className={`hover:bg-muted/20 ${selectedIds.has(t.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="rounded" />
                    </td>
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
                    <td className="px-4 py-2.5">
                      {t.difficulty ? <Badge variant={DIFF_BADGE[t.difficulty] ?? 'outline'}>{t.difficulty}</Badge> : <span className="text-muted-foreground">—</span>}
                    </td>
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
        title="Delete Template" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" loading={deleting} />
      <ConfirmDialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)} onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} templates`} message="Soft-delete selected templates?"
        confirmLabel={`Delete ${selectedIds.size}`} loading={deleting} />
      <BulkImportModal open={importOpen} onClose={() => setImportOpen(false)} title="Templates"
        templateData={IMPORT_TEMPLATE} fields={['name', 'category', 'difficulty', 'duration_min', 'exercises']}
        onImport={(rows) => importTemplates(rows as Parameters<typeof importTemplates>[0])}
        onSuccess={invalidate} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState('sessions')

  return (
    <PageShell
      title="Workout Administration"
      description="Manage exercise library, workout templates, sessions, and reference data."
      icon={Dumbbell}
    >
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="sessions"  active={activeTab}><SessionsTab /></TabPanel>
      <TabPanel id="exercises" active={activeTab}><ExercisesTab /></TabPanel>
      <TabPanel id="templates" active={activeTab}><TemplatesTab /></TabPanel>
      <TabPanel id="reference" active={activeTab}><ReferenceDataPanel /></TabPanel>
    </PageShell>
  )
}
