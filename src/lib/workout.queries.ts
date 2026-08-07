/**
 * workout.queries.ts
 * All Supabase queries for the Workout Administration module.
 * Uses existing tables only — no schema changes.
 */

import { supabase } from './supabase'

// ── Reference data (enum values as constants) ─────────────────────────────────

export const CATEGORIES = ['strength', 'cardio', 'mobility', 'yoga', 'pilates', 'crossfit', 'sport', 'other'] as const
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'elite'] as const
export const PHASES = ['warmup', 'main', 'cooldown'] as const
export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'glutes', 'quads', 'hamstrings', 'calves', 'full_body', 'other',
] as const
export const EQUIPMENT_LIST = [
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight',
  'kettlebell', 'bands', 'trx', 'foam_roller', 'box',
  'battle_ropes', 'sled', 'other',
] as const

export type Category   = typeof CATEGORIES[number]
export type Difficulty = typeof DIFFICULTIES[number]
export type Phase      = typeof PHASES[number]
export type MuscleGroup = typeof MUSCLE_GROUPS[number]
export type Equipment   = typeof EQUIPMENT_LIST[number]

// ── Exercise types ────────────────────────────────────────────────────────────

export interface Exercise {
  id: string
  name: string
  muscle_group: string | null
  equipment: string | null
  category: string | null
  difficulty: string | null
  phase: string | null
  is_featured: boolean
  is_compound: boolean
  is_time_based: boolean
  like_count: number | null
  view_count: number | null
  instructions: string | null
  tips: string | null
  met_value: number | null
  calories_per_min: number | null
  video_url: string | null
  thumbnail_url: string | null
  secondary_muscles: string[] | null
  deleted_at: string | null
  user_id: string | null
}

export interface ExerciseFilters {
  search: string
  category: string
  difficulty: string
  muscle_group: string
  equipment: string
  phase: string
  featured_only: boolean
}

// ── Exercise queries ──────────────────────────────────────────────────────────

export async function fetchExercises(
  page: number,
  pageSize: number,
  filters: ExerciseFilters,
) {
  const from = page * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('exercises')
    .select(
      'id, name, muscle_group, equipment, category, difficulty, phase, is_featured, is_compound, is_time_based, like_count, view_count, instructions, tips, met_value, calories_per_min, video_url, thumbnail_url, secondary_muscles, deleted_at, user_id',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })
    .range(from, to)

  if (filters.search.trim()) q = q.ilike('name', `%${filters.search.trim()}%`)
  if (filters.category)      q = q.eq('category', filters.category)
  if (filters.difficulty)    q = q.eq('difficulty', filters.difficulty)
  if (filters.muscle_group)  q = q.eq('muscle_group', filters.muscle_group)
  if (filters.equipment)     q = q.eq('equipment', filters.equipment)
  if (filters.phase)         q = q.eq('phase', filters.phase)
  if (filters.featured_only) q = q.eq('is_featured', true)

  const { data, error, count } = await q
  if (error) throw error
  return { data: (data ?? []) as Exercise[], total: count ?? 0 }
}

export async function createExercise(payload: Omit<Exercise, 'id' | 'like_count' | 'view_count' | 'deleted_at'>) {
  const { error } = await supabase.from('exercises').insert({ ...payload, user_id: null })
  if (error) throw error
}

export async function updateExercise(id: string, payload: Partial<Exercise>) {
  const { error } = await supabase.from('exercises').update(payload).eq('id', id)
  if (error) throw error
}

export async function softDeleteExercise(id: string) {
  const { error } = await supabase
    .from('exercises')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function restoreExercise(id: string) {
  const { error } = await supabase
    .from('exercises')
    .update({ deleted_at: null })
    .eq('id', id)
  if (error) throw error
}

export async function bulkDeleteExercises(ids: string[]) {
  const { error } = await supabase
    .from('exercises')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw error
}

/** Export all exercises as JSON */
export async function exportExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(10000)
  if (error) throw error
  return (data ?? []) as Exercise[]
}

/** Bulk import exercises from JSON array */
export async function importExercises(
  rows: Partial<Exercise>[],
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = []
  let inserted = 0

  const clean = rows.map((r, i) => {
    if (!r.name?.trim()) { errors.push(`Row ${i + 1}: missing name`); return null }
    return {
      name: r.name.trim(),
      muscle_group: r.muscle_group ?? null,
      equipment: r.equipment ?? null,
      category: r.category ?? null,
      difficulty: r.difficulty ?? null,
      phase: r.phase ?? 'main',
      is_featured: r.is_featured ?? false,
      is_compound: r.is_compound ?? false,
      is_time_based: r.is_time_based ?? false,
      instructions: r.instructions ?? null,
      tips: r.tips ?? null,
      met_value: r.met_value ?? null,
      calories_per_min: r.calories_per_min ?? null,
      video_url: r.video_url ?? null,
      thumbnail_url: r.thumbnail_url ?? null,
      secondary_muscles: r.secondary_muscles ?? null,
      user_id: null,
    }
  }).filter(Boolean)

  if (clean.length > 0) {
    const { error, data } = await supabase
      .from('exercises')
      .insert(clean as object[])
      .select('id')
    if (error) errors.push(error.message)
    else inserted = data?.length ?? 0
  }

  return { inserted, errors }
}

// ── Workout Template types ────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string
  user_id: string | null
  name: string
  description: string | null
  exercises: WorkoutTemplateExercise[]
  is_public: boolean
  is_featured: boolean
  category: string | null
  difficulty: string | null
  duration_min: number | null
  tags: string[] | null
  view_count: number | null
  fork_count: number | null
  forked_from: string | null
  deleted_at: string | null
  created_at: string
}

export interface WorkoutTemplateExercise {
  name: string
  sets?: number
  reps?: string
  restSeconds?: number
  isTimeBased?: boolean
  phase?: string
}

export interface TemplateFilters {
  search: string
  category: string
  difficulty: string
  featured_only: boolean
  global_only: boolean
}

// ── Workout Template queries ──────────────────────────────────────────────────

export async function fetchTemplates(
  page: number,
  pageSize: number,
  filters: TemplateFilters,
) {
  const from = page * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('workout_templates')
    .select(
      'id, user_id, name, description, exercises, is_public, is_featured, category, difficulty, duration_min, tags, view_count, fork_count, forked_from, deleted_at, created_at',
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order('is_featured', { ascending: false })
    .order('name', { ascending: true })
    .range(from, to)

  if (filters.search.trim())  q = q.ilike('name', `%${filters.search.trim()}%`)
  if (filters.category)       q = q.eq('category', filters.category)
  if (filters.difficulty)     q = q.eq('difficulty', filters.difficulty)
  if (filters.featured_only)  q = q.eq('is_featured', true)
  if (filters.global_only)    q = q.is('user_id', null)

  const { data, error, count } = await q
  if (error) throw error
  return { data: (data ?? []) as WorkoutTemplate[], total: count ?? 0 }
}

export async function createTemplate(
  payload: Omit<WorkoutTemplate, 'id' | 'view_count' | 'fork_count' | 'deleted_at' | 'created_at'>,
) {
  const { error } = await supabase.from('workout_templates').insert({ ...payload, user_id: null })
  if (error) throw error
}

export async function updateTemplate(id: string, payload: Partial<WorkoutTemplate>) {
  const { error } = await supabase.from('workout_templates').update(payload).eq('id', id)
  if (error) throw error
}

export async function softDeleteTemplate(id: string) {
  const { error } = await supabase
    .from('workout_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function bulkDeleteTemplates(ids: string[]) {
  const { error } = await supabase
    .from('workout_templates')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
  if (error) throw error
}

export async function exportTemplates(): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true })
    .limit(5000)
  if (error) throw error
  return (data ?? []) as WorkoutTemplate[]
}

export async function importTemplates(
  rows: Partial<WorkoutTemplate>[],
): Promise<{ inserted: number; errors: string[] }> {
  const errors: string[] = []
  const clean = rows.map((r, i) => {
    if (!r.name?.trim()) { errors.push(`Row ${i + 1}: missing name`); return null }
    return {
      name: r.name.trim(),
      description: r.description ?? null,
      exercises: r.exercises ?? [],
      is_public: r.is_public ?? true,
      is_featured: r.is_featured ?? false,
      category: r.category ?? null,
      difficulty: r.difficulty ?? null,
      duration_min: r.duration_min ?? null,
      tags: r.tags ?? null,
      user_id: null,
    }
  }).filter(Boolean)

  if (!clean.length) return { inserted: 0, errors }
  const { data, error } = await supabase
    .from('workout_templates')
    .insert(clean as object[])
    .select('id')
  if (error) errors.push(error.message)
  return { inserted: data?.length ?? 0, errors }
}

// ── Exercise tags ─────────────────────────────────────────────────────────────

export async function fetchExerciseTags(exerciseId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('exercise_tags')
    .select('tag')
    .eq('exercise_id', exerciseId)
  if (error) throw error
  return (data ?? []).map((t) => t.tag)
}

export async function setExerciseTags(exerciseId: string, tags: string[]): Promise<void> {
  await supabase.from('exercise_tags').delete().eq('exercise_id', exerciseId)
  if (tags.length === 0) return
  const { error } = await supabase.from('exercise_tags').insert(
    tags.map((tag) => ({ exercise_id: exerciseId, tag })),
  )
  if (error) throw error
}
