/**
 * ExerciseForm.tsx — Create / Edit exercise modal
 */

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import {
  createExercise, updateExercise,
  CATEGORIES, DIFFICULTIES, PHASES, MUSCLE_GROUPS, EQUIPMENT_LIST,
  type Exercise,
} from '@/lib/workout.queries'

const schema = z.object({
  name:              z.string().min(2, 'Name is required'),
  muscle_group:      z.string().optional(),
  equipment:         z.string().optional(),
  category:          z.string().optional(),
  difficulty:        z.string().optional(),
  phase:             z.string().optional(),
  met_value:         z.string().optional(),
  calories_per_min:  z.string().optional(),
  video_url:         z.string().optional(),
  thumbnail_url:     z.string().optional(),
  instructions:      z.string().optional(),
  tips:              z.string().optional(),
  is_featured:       z.boolean().optional(),
  is_compound:       z.boolean().optional(),
  is_time_based:     z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

interface ExerciseFormProps {
  open: boolean
  onClose: () => void
  exercise: Exercise | null
}

const toOpts = (arr: readonly string[]) =>
  arr.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))

export function ExerciseForm({ open, onClose, exercise }: ExerciseFormProps) {
  const qc = useQueryClient()
  const isEdit = !!exercise

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      reset(exercise ? {
        name: exercise.name,
        muscle_group: exercise.muscle_group ?? '',
        equipment: exercise.equipment ?? '',
        category: exercise.category ?? '',
        difficulty: exercise.difficulty ?? '',
        phase: exercise.phase ?? '',
        met_value: exercise.met_value?.toString() ?? '',
        calories_per_min: exercise.calories_per_min?.toString() ?? '',
        video_url: exercise.video_url ?? '',
        thumbnail_url: exercise.thumbnail_url ?? '',
        instructions: exercise.instructions ?? '',
        tips: exercise.tips ?? '',
        is_featured: exercise.is_featured,
        is_compound: exercise.is_compound,
        is_time_based: exercise.is_time_based,
      } : { name: '', is_featured: false, is_compound: false, is_time_based: false })
    }
  }, [open, exercise, reset])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name:             values.name,
      muscle_group:     values.muscle_group || null,
      equipment:        values.equipment || null,
      category:         values.category || null,
      difficulty:       values.difficulty || null,
      phase:            values.phase || null,
      met_value:        values.met_value ? parseFloat(values.met_value) : null,
      calories_per_min: values.calories_per_min ? parseFloat(values.calories_per_min) : null,
      video_url:        values.video_url || null,
      thumbnail_url:    values.thumbnail_url || null,
      instructions:     values.instructions || null,
      tips:             values.tips || null,
      is_featured:      values.is_featured ?? false,
      is_compound:      values.is_compound ?? false,
      is_time_based:    values.is_time_based ?? false,
      secondary_muscles: null,
    }
    try {
      if (isEdit) {
        await updateExercise(exercise.id, payload)
        toast.success('Exercise updated')
      } else {
        await createExercise({ ...payload, user_id: null })
        toast.success('Exercise created')
      }
      qc.invalidateQueries({ queryKey: ['exercises'] })
      onClose()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit: ${exercise?.name}` : 'New Exercise'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Name *" error={errors.name?.message} {...register('name')} />
          <Select label="Muscle group" options={toOpts(MUSCLE_GROUPS)} placeholder="Select…" {...register('muscle_group')} />
          <Select label="Equipment" options={toOpts(EQUIPMENT_LIST)} placeholder="Select…" {...register('equipment')} />
          <Select label="Category" options={toOpts(CATEGORIES)} placeholder="Select…" {...register('category')} />
          <Select label="Difficulty" options={toOpts(DIFFICULTIES)} placeholder="Select…" {...register('difficulty')} />
          <Select label="Phase" options={toOpts(PHASES)} placeholder="Select…" {...register('phase')} />
          <Input label="MET value" type="number" step="0.1" {...register('met_value')} />
          <Input label="Calories/min" type="number" step="0.01" {...register('calories_per_min')} />
          <Input label="Video URL" type="url" {...register('video_url')} />
          <Input label="Thumbnail URL" type="url" {...register('thumbnail_url')} />
        </div>

        <div className="flex items-center gap-6 flex-wrap">
          {(['is_featured', 'is_compound', 'is_time_based'] as const).map((field) => (
            <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded" {...register(field)} />
              {field.replace('is_', '').replace('_', ' ')}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Instructions</label>
            <textarea rows={4} className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" {...register('instructions')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Tips & cues</label>
            <textarea rows={4} className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" {...register('tips')} />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create exercise'}</Button>
        </div>
      </form>
    </Modal>
  )
}
