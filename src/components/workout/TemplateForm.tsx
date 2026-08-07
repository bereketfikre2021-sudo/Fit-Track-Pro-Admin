/**
 * TemplateForm.tsx — Create / Edit workout template modal
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import {
  createTemplate, updateTemplate,
  CATEGORIES, DIFFICULTIES,
  type WorkoutTemplate, type WorkoutTemplateExercise,
} from '@/lib/workout.queries'

const schema = z.object({
  name:        z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  category:    z.string().optional(),
  difficulty:  z.string().optional(),
  duration_min: z.string().optional(),
  tags:        z.string().optional(),
  is_public:   z.boolean().optional(),
  is_featured: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

const toOpts = (arr: readonly string[]) =>
  arr.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))

const PHASE_OPTS = [
  { value: 'warmup', label: 'Warm-up' },
  { value: 'main', label: 'Main' },
  { value: 'cooldown', label: 'Cool-down' },
]

interface TemplateFormProps {
  open: boolean
  onClose: () => void
  template: WorkoutTemplate | null
}

const emptyExercise = (): WorkoutTemplateExercise => ({
  name: '', sets: 3, reps: '10', restSeconds: 60, isTimeBased: false, phase: 'main',
})

export function TemplateForm({ open, onClose, template }: TemplateFormProps) {
  const qc = useQueryClient()
  const isEdit = !!template
  const [exercises, setExercises] = useState<WorkoutTemplateExercise[]>([emptyExercise()])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      if (template) {
        reset({
          name: template.name,
          description: template.description ?? '',
          category: template.category ?? '',
          difficulty: template.difficulty ?? '',
          duration_min: template.duration_min?.toString() ?? '',
          tags: template.tags?.join(', ') ?? '',
          is_public: template.is_public,
          is_featured: template.is_featured,
        })
        setExercises(template.exercises?.length ? template.exercises : [emptyExercise()])
      } else {
        reset({ name: '', is_public: true, is_featured: false })
        setExercises([emptyExercise()])
      }
    }
  }, [open, template, reset])

  const updateEx = (idx: number, patch: Partial<WorkoutTemplateExercise>) => {
    setExercises((prev) => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }

  const removeEx = (idx: number) => setExercises((prev) => prev.filter((_, i) => i !== idx))
  const addEx    = () => setExercises((prev) => [...prev, emptyExercise()])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:         values.name,
      description:  values.description || null,
      category:     values.category || null,
      difficulty:   values.difficulty || null,
      duration_min: values.duration_min ? parseInt(values.duration_min) : null,
      tags:         values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : null,
      is_public:    values.is_public ?? true,
      is_featured:  values.is_featured ?? false,
      exercises:    exercises.filter((e) => e.name.trim()),
    }
    try {
      if (isEdit) {
        await updateTemplate(template.id, payload)
        toast.success('Template updated')
      } else {
        await createTemplate({ ...payload, user_id: null, forked_from: null })
        toast.success('Template created')
      }
      qc.invalidateQueries({ queryKey: ['templates'] })
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit: ${template?.name}` : 'New Workout Template'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name *" error={errors.name?.message} {...register('name')} />
          <Select label="Category" options={toOpts(CATEGORIES)} placeholder="Select…" {...register('category')} />
          <Select label="Difficulty" options={toOpts(DIFFICULTIES)} placeholder="Select…" {...register('difficulty')} />
          <Input label="Duration (min)" type="number" min="1" {...register('duration_min')} />
          <Input label="Tags (comma-separated)" placeholder="e.g. push, chest, beginner" {...register('tags')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Description</label>
          <textarea rows={2} className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" {...register('description')} />
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('is_public')} />Public
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('is_featured')} />Featured
          </label>
        </div>

        {/* Exercise list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Exercises ({exercises.length})</h3>
            <Button type="button" size="sm" variant="outline" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addEx}>Add exercise</Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {exercises.map((ex, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={ex.name}
                  onChange={(e) => updateEx(idx, { name: e.target.value })}
                  placeholder="Exercise name *"
                  className="flex-1 min-w-0 h-7 rounded border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <input
                  type="number" min="1" max="20" value={ex.sets ?? 3}
                  onChange={(e) => updateEx(idx, { sets: parseInt(e.target.value) || 1 })}
                  className="w-14 h-7 rounded border border-input bg-background px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title="Sets"
                />
                <input
                  value={ex.reps ?? '10'}
                  onChange={(e) => updateEx(idx, { reps: e.target.value })}
                  placeholder="Reps"
                  className="w-16 h-7 rounded border border-input bg-background px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title="Reps"
                />
                <select
                  value={ex.phase ?? 'main'}
                  onChange={(e) => updateEx(idx, { phase: e.target.value })}
                  className="h-7 rounded border border-input bg-background px-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {PHASE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" onClick={() => removeEx(idx)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create template'}</Button>
        </div>
      </form>
    </Modal>
  )
}
