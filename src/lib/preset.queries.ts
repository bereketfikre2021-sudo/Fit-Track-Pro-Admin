/**
 * preset.queries.ts
 *
 * Admin CRUD for the preset_plans table.
 * Each row stores a complete preset (meal plan, shopping list, or exercise set)
 * for one weight category (weight-gain | weight-loss).
 *
 * Row shape mirrors the frontend JS constants so the app can use either
 * the DB version (preferred) or the hardcoded fallback.
 */

import { supabase } from './supabase'

export type PresetType = 'meal' | 'shopping' | 'exercise'
export type WeightCategory = 'weight-gain' | 'weight-loss'

export interface PresetPlan {
  id: string                  // e.g. 'meal-weight-gain'
  type: PresetType
  name: string
  name_am: string | null
  description: string | null
  description_am: string | null
  tags: string[] | null
  tags_am: string[] | null
  target_goals: string[]      // ['muscle','strength'] | ['fat']
  target_bmi_categories: string[]
  image_url: string | null    // admin-uploaded thumbnail
  data: Record<string, unknown> // full preset payload (days / categories / exercises)
  updated_at: string
}

// ── Fetch all presets (optionally filtered by type) ───────────────────────────
export async function fetchPresets(type?: PresetType): Promise<PresetPlan[]> {
  let q = supabase.from('preset_plans').select('*').order('type').order('id')
  if (type) q = q.eq('type', type)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

// ── Upsert (create or update) a preset ───────────────────────────────────────
export async function upsertPreset(preset: Omit<PresetPlan, 'updated_at'>): Promise<void> {
  const { error } = await supabase
    .from('preset_plans')
    .upsert({ ...preset, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw error
}

// ── Delete a preset ───────────────────────────────────────────────────────────
export async function deletePreset(id: string): Promise<void> {
  const { error } = await supabase.from('preset_plans').delete().eq('id', id)
  if (error) throw error
}

// ── Upload preset thumbnail image to Supabase Storage ────────────────────────
export async function uploadPresetImage(
  presetId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `preset-thumbnails/${presetId}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('app-assets')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw upErr

  const { data } = supabase.storage.from('app-assets').getPublicUrl(path)
  return data.publicUrl
}
