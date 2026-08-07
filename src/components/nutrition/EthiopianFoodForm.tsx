/**
 * EthiopianFoodForm.tsx — Create / Edit Ethiopian food metadata
 */

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  createEthiopianFood, updateEthiopianFood,
  ETH_CATEGORIES, ETH_REGIONS, type EthiopianFood,
} from '@/lib/nutrition.queries'

const schema = z.object({
  food_id:     z.string().min(1, 'Food is required'),
  name_en:     z.string().min(1, 'English name is required'),
  name_am:     z.string().min(1, 'Amharic name is required'),
  category:    z.string().min(1, 'Category is required'),
  region:      z.string().optional(),
  description: z.string().optional(),
  image_url:   z.string().optional(),
  is_vegan:         z.boolean().optional(),
  is_vegetarian:    z.boolean().optional(),
  is_fasting_safe:  z.boolean().optional(),
  common_ingredients: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const catOpts  = ETH_CATEGORIES.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))
const regOpts  = ETH_REGIONS.map((v) => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))

interface Props { open: boolean; onClose: () => void; item: EthiopianFood | null }

export function EthiopianFoodForm({ open, onClose, item }: Props) {
  const qc = useQueryClient()
  const isEdit = !!item
  const [foods, setFoods] = useState<{ id: string; name: string }[]>([])
  const [loadingFoods, setLoadingFoods] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    reset(item ? {
      food_id: item.food_id, name_en: item.name_en, name_am: item.name_am,
      category: item.category, region: item.region ?? '',
      description: item.description ?? '', image_url: item.image_url ?? '',
      is_vegan: item.is_vegan, is_vegetarian: item.is_vegetarian,
      is_fasting_safe: item.is_fasting_safe,
      common_ingredients: item.common_ingredients?.join(', ') ?? '',
    } : { category: 'stew', is_vegan: false, is_vegetarian: false, is_fasting_safe: false })

    // Load foods for dropdown
    setLoadingFoods(true)
    supabase.from('foods').select('id, name').is('deleted_at', null).order('name').limit(500)
      .then(({ data }) => { setFoods(data ?? []); setLoadingFoods(false) })
  }, [open, item, reset])

  const onSubmit = async (v: FormValues) => {
    const payload: Partial<EthiopianFood> = {
      food_id: v.food_id, name_en: v.name_en, name_am: v.name_am,
      category: v.category, region: v.region || null,
      description: v.description || null, image_url: v.image_url || null,
      is_vegan: v.is_vegan ?? false, is_vegetarian: v.is_vegetarian ?? false,
      is_fasting_safe: v.is_fasting_safe ?? false,
      common_ingredients: v.common_ingredients
        ? v.common_ingredients.split(',').map((s) => s.trim()).filter(Boolean)
        : null,
    }
    try {
      if (isEdit) { await updateEthiopianFood(item.id, payload); toast.success('Updated') }
      else { await createEthiopianFood(payload); toast.success('Created') }
      qc.invalidateQueries({ queryKey: ['ethiopian-foods'] })
      onClose()
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit: ${item?.name_en}` : 'New Ethiopian Food'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Link to food *</label>
          {loadingFoods ? <Spinner size="sm" /> : (
            <select {...register('food_id')}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">Select a food…</option>
              {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
          {errors.food_id && <p className="text-xs text-destructive">{errors.food_id.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="English name *" error={errors.name_en?.message} {...register('name_en')} />
          <Input label="Amharic name *" error={errors.name_am?.message} {...register('name_am')} />
          <Select label="Category *" options={catOpts} error={errors.category?.message} {...register('category')} />
          <Select label="Region" options={regOpts} placeholder="Select region…" {...register('region')} />
          <Input label="Image URL" type="url" {...register('image_url')} />
          <Input label="Common ingredients (comma-separated)" {...register('common_ingredients')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Description</label>
          <textarea rows={2} className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" {...register('description')} />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" {...register('is_vegan')} />Vegan</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" {...register('is_vegetarian')} />Vegetarian</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" {...register('is_fasting_safe')} />Fasting safe</label>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}
