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
  let q = supabase
    .from('preset_plans')
    .select('*')
    .order('type')
    .order('id')
  if (type) q = q.eq('type', type)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

// ── Upsert (create or update) a preset and return the saved row ───────────────
export async function upsertPreset(preset: Omit<PresetPlan, 'updated_at'>): Promise<PresetPlan> {
  const { data, error } = await supabase
    .from('preset_plans')
    .upsert({ ...preset, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data as PresetPlan
}

// ── Delete a preset ───────────────────────────────────────────────────────────
export async function deletePreset(id: string): Promise<void> {
  const { error } = await supabase.from('preset_plans').delete().eq('id', id)
  if (error) throw error
}

// ── MIME type → canonical extension map ──────────────────────────────────────
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg':          'jpg',
  'image/jpg':           'jpg',
  'image/png':           'png',
  'image/gif':           'gif',
  'image/webp':          'webp',
  'image/svg+xml':       'svg',
  'image/heic':          'heic',
  'image/heif':          'heif',
  'image/heic-sequence': 'heic',
  'image/heif-sequence': 'heif',
  'image/avif':          'avif',
  'image/tiff':          'tiff',
  'image/bmp':           'bmp',
}

// ── Upload preset thumbnail image to Supabase Storage ────────────────────────
export async function uploadPresetImage(
  presetId: string,
  file: File
): Promise<string> {

  // Derive extension — prefer MIME type lookup, fall back to filename extension
  const mimeExt = MIME_TO_EXT[file.type]
  const nameExt = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : null
  const ext = mimeExt ?? nameExt ?? 'jpg'

  // Sanitise presetId for use as a path segment
  const safeName = presetId.replace(/[^a-zA-Z0-9._-]/g, '-')
  const path = `preset-thumbnails/${safeName}.${ext}`

  // Use explicit content type — critical for GIFs so browsers render them animated
  const contentType = file.type || `image/${ext}`

  // Delete any existing file at this path first (avoids needing UPDATE policy)
  await supabase.storage.from('app-assets').remove([path])

  const { error: upErr } = await supabase.storage
    .from('app-assets')
    .upload(path, file, { upsert: false, contentType })
  if (upErr) throw upErr

  const { data } = supabase.storage.from('app-assets').getPublicUrl(path)
  return data.publicUrl
}
