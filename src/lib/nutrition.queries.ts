/**
 * nutrition.queries.ts
 * All Supabase queries for the Nutrition Administration module.
 * No schema changes — uses existing tables only.
 */

import { supabase } from './supabase'

// ── Reference constants ───────────────────────────────────────────────────────

export const FOOD_SOURCES = ['usda', 'openfoodfacts', 'ethiopian', 'custom', 'ai_generated'] as const
export const MEAL_SLOTS   = ['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'beforeBed'] as const
export const ETH_CATEGORIES = ['injera_based', 'stew', 'salad', 'grain', 'beverage', 'snack', 'legume', 'vegetable', 'dairy', 'bread', 'spice', 'other'] as const
export const ETH_REGIONS    = ['national', 'addis_ababa', 'tigray', 'oromia', 'amhara', 'sidama', 'somali', 'afar', 'other'] as const

export type FoodSource    = typeof FOOD_SOURCES[number]
export type MealSlot      = typeof MEAL_SLOTS[number]
export type EthCategory   = typeof ETH_CATEGORIES[number]
export type EthRegion     = typeof ETH_REGIONS[number]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Food {
  id: string
  user_id: string | null
  name: string
  name_am: string | null
  brand: string | null
  source: string
  serving_size: number | null
  serving_unit: string | null
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  potassium_mg: number | null
  vitamin_c_mg: number | null
  iron_mg: number | null
  calcium_mg: number | null
  is_verified: boolean
  is_featured: boolean
  barcode: string | null
  image_url: string | null
  tags: string[] | null
  deleted_at: string | null
  created_at: string
}

export interface EthiopianFood {
  id: string
  food_id: string
  name_en: string
  name_am: string
  category: string
  region: string | null
  description: string | null
  is_vegan: boolean
  is_vegetarian: boolean
  is_fasting_safe: boolean
  common_ingredients: string[] | null
  image_url: string | null
  // joined
  food_name?: string | null
  food_calories?: number | null
}

export interface MealPlanRow {
  id: string
  user_id: string
  day_of_week: string
  meal_slot: string
  food_name: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  user_name?: string | null
}

export interface ShoppingItem {
  id: string
  user_id: string
  name: string
  category: string
  quantity: number | null
  unit: string | null
  is_checked: boolean
  notes: string | null
  week_of: string | null
  created_at: string
  user_name?: string | null
}

export interface FoodFilters {
  search: string
  source: string
  verified_only: boolean
  featured_only: boolean
  ethiopian_only: boolean
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

export function arrayToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n')
}

export function csvToArray(csv: string): Record<string, string>[] {
  const lines = csv.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? line.split(',')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? '').trim().replace(/^"|"$/g, '')
    })
    return row
  })
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

// ── Foods ─────────────────────────────────────────────────────────────────────

export async function fetchFoods(
  page: number,
  pageSize: number,
  filters: FoodFilters,
): Promise<{ data: Food[]; total: number }> {
  const from = page * pageSize
  const to = from + pageSize - 1
  let q = supabase
    .from('foods')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })
    .range(from, to)

  if (filters.search.trim())   q = q.ilike('name', `%${filters.search.trim()}%`)
  if (filters.source)          q = q.eq('source', filters.source)
  if (filters.verified_only)   q = q.eq('is_verified', true)
  if (filters.featured_only)   q = q.eq('is_featured', true)
  if (filters.ethiopian_only)  q = q.eq('source', 'ethiopian')

  const { data, error, count } = await q
  if (error) throw error
  return { data: (data ?? []) as Food[], total: count ?? 0 }
}

export async function createFood(payload: Partial<Food>): Promise<void> {
  const { error } = await supabase.from('foods').insert({ ...payload, user_id: null })
  if (error) throw error
}

export async function updateFood(id: string, payload: Partial<Food>): Promise<void> {
  const { error } = await supabase.from('foods').update(payload).eq('id', id)
  if (error) throw error
}

export async function softDeleteFood(id: string): Promise<void> {
  const { error } = await supabase
    .from('foods')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function bulkDeleteFoods(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('foods')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw error
}

export async function exportFoods(): Promise<Food[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .is('deleted_at', null)
    .order('name')
    .limit(10000)
  if (error) throw error
  return (data ?? []) as Food[]
}

export async function importFoods(
  rows: Partial<Food>[],
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = []
  const clean = rows.map((r, i) => {
    if (!r.name?.trim()) { errors.push(`Row ${i + 1}: missing name`); return null }
    return {
      name:         r.name.trim(),
      name_am:      r.name_am ?? null,
      brand:        r.brand ?? null,
      source:       r.source ?? 'custom',
      serving_size: r.serving_size ? Number(r.serving_size) : null,
      serving_unit: r.serving_unit ?? 'g',
      calories:     r.calories ? Number(r.calories) : null,
      protein_g:    r.protein_g ? Number(r.protein_g) : null,
      carbs_g:      r.carbs_g ? Number(r.carbs_g) : null,
      fat_g:        r.fat_g ? Number(r.fat_g) : null,
      fiber_g:      r.fiber_g ? Number(r.fiber_g) : null,
      sugar_g:      r.sugar_g ? Number(r.sugar_g) : null,
      sodium_mg:    r.sodium_mg ? Number(r.sodium_mg) : null,
      is_verified:  String(r.is_verified) === 'true',
      is_featured:  String(r.is_featured) === 'true',
      barcode:      r.barcode ?? null,
      user_id:      null,
    }
  }).filter(Boolean)

  if (!clean.length) return { inserted: 0, errors }
  const { data, error } = await supabase.from('foods').insert(clean as object[]).select('id')
  if (error) errors.push(error.message)
  return { inserted: data?.length ?? 0, errors }
}

// ── Ethiopian Foods ───────────────────────────────────────────────────────────

export async function fetchEthiopianFoods(
  page: number,
  pageSize: number,
  search: string,
  category: string,
): Promise<{ data: EthiopianFood[]; total: number }> {
  const from = page * pageSize; const to = from + pageSize - 1
  let q = supabase
    .from('ethiopian_foods')
    .select('*, foods!inner(name, calories)', { count: 'exact' })
    .order('name_en', { ascending: true })
    .range(from, to)

  if (search.trim()) q = q.ilike('name_en', `%${search.trim()}%`)
  if (category)      q = q.eq('category', category)

  const { data, error, count } = await q
  if (error) throw error

  return {
    data: (data ?? []).map((r) => ({
      ...r,
      food_name: (r.foods as { name: string } | null)?.name ?? null,
      food_calories: (r.foods as { calories: number } | null)?.calories ?? null,
    })) as EthiopianFood[],
    total: count ?? 0,
  }
}

export async function createEthiopianFood(payload: Partial<EthiopianFood>): Promise<void> {
  const { food_name, food_calories, ...rest } = payload
  const { error } = await supabase.from('ethiopian_foods').insert(rest)
  if (error) throw error
}

export async function updateEthiopianFood(id: string, payload: Partial<EthiopianFood>): Promise<void> {
  const { food_name, food_calories, ...rest } = payload
  const { error } = await supabase.from('ethiopian_foods').update(rest).eq('id', id)
  if (error) throw error
}

export async function deleteEthiopianFood(id: string): Promise<void> {
  const { error } = await supabase.from('ethiopian_foods').delete().eq('id', id)
  if (error) throw error
}

export async function exportEthiopianFoods(): Promise<EthiopianFood[]> {
  const { data, error } = await supabase.from('ethiopian_foods').select('*').order('name_en').limit(5000)
  if (error) throw error
  return (data ?? []) as EthiopianFood[]
}

export async function importEthiopianFoods(
  rows: Partial<EthiopianFood>[],
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = []
  const clean = rows.map((r, i) => {
    if (!r.name_en?.trim()) { errors.push(`Row ${i + 1}: missing name_en`); return null }
    if (!r.name_am?.trim()) { errors.push(`Row ${i + 1}: missing name_am`); return null }
    if (!r.food_id)         { errors.push(`Row ${i + 1}: missing food_id`); return null }
    return {
      food_id: r.food_id,
      name_en: r.name_en.trim(),
      name_am: r.name_am.trim(),
      category: r.category ?? 'other',
      region: r.region ?? null,
      description: r.description ?? null,
      is_vegan: String(r.is_vegan) === 'true',
      is_vegetarian: String(r.is_vegetarian) === 'true',
      is_fasting_safe: String(r.is_fasting_safe) === 'true',
      common_ingredients: Array.isArray(r.common_ingredients) ? r.common_ingredients : null,
      image_url: r.image_url ?? null,
    }
  }).filter(Boolean)

  if (!clean.length) return { inserted: 0, errors }
  const { data, error } = await supabase.from('ethiopian_foods').insert(clean as object[]).select('id')
  if (error) errors.push(error.message)
  return { inserted: data?.length ?? 0, errors }
}

// ── Meal Plans ────────────────────────────────────────────────────────────────

export async function fetchMealPlans(
  page: number,
  pageSize: number,
  userId?: string,
): Promise<{ data: MealPlanRow[]; total: number }> {
  const from = page * pageSize; const to = from + pageSize - 1
  let q = supabase
    .from('meal_plans')
    .select('*', { count: 'exact' })
    .order('day_of_week', { ascending: true })
    .range(from, to)

  if (userId) q = q.eq('user_id', userId)

  const { data, error, count } = await q
  if (error) throw error

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.name
  }

  return {
    data: (data ?? []).map((r) => ({ ...r, user_name: userMap[r.user_id] ?? null })) as MealPlanRow[],
    total: count ?? 0,
  }
}

export async function deleteMealPlanRow(userId: string, dayOfWeek: string, mealSlot: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('user_id', userId)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_slot', mealSlot)
  if (error) throw error
}

// ── Shopping Lists ────────────────────────────────────────────────────────────

export async function fetchShoppingItems(
  page: number,
  pageSize: number,
): Promise<{ data: ShoppingItem[]; total: number }> {
  const from = page * pageSize; const to = from + pageSize - 1
  const { data, error, count } = await supabase
    .from('shopping_list_items')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error

  const userIds = [...new Set((data ?? []).map((r) => r.user_id))]
  const userMap: Record<string, string> = {}
  if (userIds.length) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds)
    for (const u of users ?? []) userMap[u.id] = u.name
  }

  return {
    data: (data ?? []).map((r) => ({ ...r, user_name: userMap[r.user_id] ?? null })) as ShoppingItem[],
    total: count ?? 0,
  }
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const { error } = await supabase.from('shopping_list_items').delete().eq('id', id)
  if (error) throw error
}
