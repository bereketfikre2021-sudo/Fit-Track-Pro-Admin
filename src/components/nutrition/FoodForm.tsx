/**
 * FoodForm.tsx — Create / Edit food item modal
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
import { createFood, updateFood, FOOD_SOURCES, type Food } from '@/lib/nutrition.queries'

const schema = z.object({
  name:          z.string().min(1, 'Name is required'),
  name_am:       z.string().optional(),
  brand:         z.string().optional(),
  source:        z.string().optional(),
  serving_size:  z.string().optional(),
  serving_unit:  z.string().optional(),
  calories:      z.string().optional(),
  protein_g:     z.string().optional(),
  carbs_g:       z.string().optional(),
  fat_g:         z.string().optional(),
  fiber_g:       z.string().optional(),
  sugar_g:       z.string().optional(),
  sodium_mg:     z.string().optional(),
  potassium_mg:  z.string().optional(),
  vitamin_c_mg:  z.string().optional(),
  iron_mg:       z.string().optional(),
  calcium_mg:    z.string().optional(),
  barcode:       z.string().optional(),
  image_url:     z.string().optional(),
  tags:          z.string().optional(),
  is_verified:   z.boolean().optional(),
  is_featured:   z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

const num = (v: unknown) => (v ? parseFloat(String(v)) : null)
const srcOpts = FOOD_SOURCES.map((s) => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))

interface FoodFormProps { open: boolean; onClose: () => void; food: Food | null }

export function FoodForm({ open, onClose, food }: FoodFormProps) {
  const qc = useQueryClient()
  const isEdit = !!food

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset(food ? {
      name: food.name, name_am: food.name_am ?? '', brand: food.brand ?? '',
      source: food.source ?? 'custom', serving_size: food.serving_size?.toString() ?? '',
      serving_unit: food.serving_unit ?? 'g',
      calories: food.calories?.toString() ?? '', protein_g: food.protein_g?.toString() ?? '',
      carbs_g: food.carbs_g?.toString() ?? '', fat_g: food.fat_g?.toString() ?? '',
      fiber_g: food.fiber_g?.toString() ?? '', sugar_g: food.sugar_g?.toString() ?? '',
      sodium_mg: food.sodium_mg?.toString() ?? '', potassium_mg: food.potassium_mg?.toString() ?? '',
      vitamin_c_mg: food.vitamin_c_mg?.toString() ?? '', iron_mg: food.iron_mg?.toString() ?? '',
      calcium_mg: food.calcium_mg?.toString() ?? '', barcode: food.barcode ?? '',
      image_url: food.image_url ?? '', tags: food.tags?.join(', ') ?? '',
      is_verified: food.is_verified, is_featured: food.is_featured,
    } : { name: '', source: 'custom', serving_unit: 'g', is_verified: false, is_featured: false })
  }, [open, food, reset])

  const onSubmit = async (v: FormValues) => {
    const payload: Partial<Food> = {
      name: v.name, name_am: v.name_am || null, brand: v.brand || null,
      source: v.source ?? 'custom', serving_size: num(v.serving_size),
      serving_unit: v.serving_unit || 'g',
      calories: num(v.calories), protein_g: num(v.protein_g), carbs_g: num(v.carbs_g),
      fat_g: num(v.fat_g), fiber_g: num(v.fiber_g), sugar_g: num(v.sugar_g),
      sodium_mg: num(v.sodium_mg), potassium_mg: num(v.potassium_mg),
      vitamin_c_mg: num(v.vitamin_c_mg), iron_mg: num(v.iron_mg), calcium_mg: num(v.calcium_mg),
      barcode: v.barcode || null, image_url: v.image_url || null,
      tags: v.tags ? v.tags.split(',').map((t) => t.trim()).filter(Boolean) : null,
      is_verified: v.is_verified ?? false, is_featured: v.is_featured ?? false,
    }
    try {
      if (isEdit) { await updateFood(food.id, payload); toast.success('Food updated') }
      else { await createFood(payload); toast.success('Food created') }
      qc.invalidateQueries({ queryKey: ['foods'] })
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  }

  const numField = (label: string, name: keyof FormValues, unit?: string) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}{unit && <span className="text-xs text-muted-foreground ml-1">({unit})</span>}</label>
      <input type="number" step="0.01" {...register(name)}
        className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit: ${food?.name}` : 'New Food'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2"><Input label="Name (English) *" error={errors.name?.message} {...register('name')} /></div>
          <Input label="Name (Amharic)" {...register('name_am')} />
          <Input label="Brand" {...register('brand')} />
          <Select label="Source" options={srcOpts} {...register('source')} />
          <Input label="Barcode" {...register('barcode')} />
          <Input label="Serving size" type="number" step="0.1" {...register('serving_size')} />
          <Input label="Serving unit" placeholder="g, ml, cup…" {...register('serving_unit')} />
          <Input label="Image URL" type="url" {...register('image_url')} />
        </div>

        {/* Macros */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Macronutrients (per serving)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {numField('Calories', 'calories', 'kcal')}
            {numField('Protein', 'protein_g', 'g')}
            {numField('Carbs', 'carbs_g', 'g')}
            {numField('Fat', 'fat_g', 'g')}
            {numField('Fiber', 'fiber_g', 'g')}
            {numField('Sugar', 'sugar_g', 'g')}
          </div>
        </div>

        {/* Micros */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Micronutrients</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {numField('Sodium', 'sodium_mg', 'mg')}
            {numField('Potassium', 'potassium_mg', 'mg')}
            {numField('Vitamin C', 'vitamin_c_mg', 'mg')}
            {numField('Iron', 'iron_mg', 'mg')}
            {numField('Calcium', 'calcium_mg', 'mg')}
          </div>
        </div>

        <Input label="Tags (comma-separated)" placeholder="high-protein, vegan, breakfast…" {...register('tags')} />

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" {...register('is_verified')} />Verified</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" {...register('is_featured')} />Featured</label>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create food'}</Button>
        </div>
      </form>
    </Modal>
  )
}
