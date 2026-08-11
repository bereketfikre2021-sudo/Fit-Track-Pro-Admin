/**
 * WorkoutsPage.tsx — Workout Administration
 * Two tabs:
 *   1. Exercise Library — the 60 built-in preset exercises with weight-plan
 *      filter (All / Weight Gain / Weight Loss), category filter, search,
 *      and per-row image upload that saves to Supabase.
 *   2. Workout Templates — the 6 built-in workout templates (Full Body,
 *      Push/Pull/Legs, Upper/Lower, Bro Split, Fat Burn, Metabolic) each
 *      with their named split days and exercise tables (sets · reps · rest)
 *      plus per-exercise image upload.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useRef } from 'react'
import { Dumbbell, Search, ImageIcon, Flame, ChevronDown, ChevronUp, Copy, Plus, Trash2, Check, X, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { toast } from 'sonner'
import { uploadPresetImage, upsertPreset, fetchPresets } from '@/lib/preset.queries'

const DIFF_BADGE: Record<string, 'outline' | 'info' | 'warning' | 'danger'> = {
  beginner: 'outline', intermediate: 'info', advanced: 'warning', elite: 'danger',
}

const PAGE_TABS = [
  { id: 'library',   label: 'Exercise Library',  icon: Dumbbell },
  { id: 'templates', label: 'Workout Templates', icon: Copy },
]

// ── 6 workout templates matching frontend presetTemplates.js ─────────────────
const WORKOUT_TEMPLATES = [
  {
    id: 'full-body', name: 'Full Body', goal: 'strength',
    description: '3-day full body program hitting all major muscle groups every session. Great for beginners.',
    tags: ['Beginner', '3 days'],
    scheduleMap: {
      'Day A': [
        { name:'Goblet Squat',        sets:'3', reps:'10-12', rest:'60s' },
        { name:'Dumbbell Row',        sets:'3', reps:'10',    rest:'60s' },
        { name:'Push-Up',             sets:'3', reps:'12-15', rest:'60s' },
        { name:'Dumbbell Bicep Curl', sets:'3', reps:'12',    rest:'45s' },
        { name:'Tricep Dip',          sets:'3', reps:'12',    rest:'45s' },
        { name:'Plank',               sets:'3', reps:'30-45s',rest:'45s' },
      ],
      'Day B': [
        { name:'Dumbbell Deadlift', sets:'3', reps:'10',       rest:'60s' },
        { name:'Arnold Press',      sets:'3', reps:'12',       rest:'60s' },
        { name:'Dumbbell Lunge',    sets:'3', reps:'10 each',  rest:'60s' },
        { name:'Dumbbell Row',      sets:'3', reps:'10',       rest:'60s' },
        { name:'Glute Bridge',      sets:'3', reps:'15-20',    rest:'45s' },
        { name:'Plank',             sets:'3', reps:'30-45s',   rest:'45s' },
      ],
      'Day C': [
        { name:'Goblet Squat',        sets:'3', reps:'10-12', rest:'60s' },
        { name:'Push-Up',             sets:'3', reps:'12-15', rest:'60s' },
        { name:'Dumbbell Lunge',      sets:'3', reps:'10 each',rest:'60s' },
        { name:'Arnold Press',        sets:'3', reps:'12',    rest:'60s' },
        { name:'Dumbbell Bicep Curl', sets:'3', reps:'12',    rest:'45s' },
        { name:'Plank',               sets:'3', reps:'30-45s',rest:'45s' },
      ],
    },
  },
  {
    id: 'push-pull-legs', name: 'Push / Pull / Legs', goal: 'muscle',
    description: 'Classic 3-day split targeting pushing muscles, pulling muscles, and legs separately.',
    tags: ['Intermediate', '3 days'],
    scheduleMap: {
      'Push Day': [
        { name:'Barbell Bench Press',    sets:'4', reps:'8',  rest:'90s' },
        { name:'Incline Dumbbell Press', sets:'3', reps:'10', rest:'75s' },
        { name:'Overhead Press',         sets:'3', reps:'8',  rest:'90s' },
        { name:'Lateral Raises',         sets:'3', reps:'15', rest:'45s' },
        { name:'Tricep Pushdown',        sets:'3', reps:'12', rest:'45s' },
      ],
      'Pull Day': [
        { name:'Pull-Up',          sets:'4', reps:'8',  rest:'90s' },
        { name:'Barbell Row',      sets:'4', reps:'8',  rest:'90s' },
        { name:'Seated Cable Row', sets:'3', reps:'12', rest:'60s' },
        { name:'Face Pull',        sets:'3', reps:'15', rest:'45s' },
        { name:'Barbell Curl',     sets:'3', reps:'12', rest:'45s' },
      ],
      'Legs Day': [
        { name:'Barbell Squat',     sets:'4', reps:'8',  rest:'120s' },
        { name:'Romanian Deadlift', sets:'3', reps:'10', rest:'90s'  },
        { name:'Leg Press',         sets:'3', reps:'12', rest:'60s'  },
        { name:'Leg Curl',          sets:'3', reps:'12', rest:'60s'  },
        { name:'Calf Raise',        sets:'4', reps:'15', rest:'45s'  },
      ],
    },
  },
  {
    id: 'upper-lower', name: 'Upper / Lower', goal: 'strength',
    description: '4-day split alternating upper and lower body sessions for balanced development.',
    tags: ['Intermediate', '4 days'],
    scheduleMap: {
      'Upper A': [
        { name:'Bench Press',             sets:'4', reps:'8',  rest:'90s' },
        { name:'Pendlay Row',             sets:'4', reps:'8',  rest:'90s' },
        { name:'Dumbbell Shoulder Press', sets:'3', reps:'10', rest:'60s' },
        { name:'Lat Pulldown',            sets:'3', reps:'12', rest:'60s' },
        { name:'Hammer Curl',             sets:'3', reps:'12', rest:'45s' },
        { name:'Skull Crusher',           sets:'3', reps:'12', rest:'45s' },
      ],
      'Lower A': [
        { name:'Squat',                 sets:'4', reps:'8',       rest:'120s' },
        { name:'Romanian Deadlift',     sets:'3', reps:'10',      rest:'90s'  },
        { name:'Bulgarian Split Squat', sets:'3', reps:'10 each', rest:'75s'  },
        { name:'Hip Thrust',            sets:'3', reps:'12',      rest:'60s'  },
        { name:'Standing Calf Raise',   sets:'4', reps:'15',      rest:'45s'  },
      ],
      'Upper B': [
        { name:'Bench Press',             sets:'4', reps:'8',  rest:'90s' },
        { name:'Pendlay Row',             sets:'4', reps:'8',  rest:'90s' },
        { name:'Cable Fly',               sets:'3', reps:'15', rest:'45s' },
        { name:'Lat Pulldown',            sets:'3', reps:'12', rest:'60s' },
        { name:'Dumbbell Shoulder Press', sets:'3', reps:'10', rest:'60s' },
        { name:'Hammer Curl',             sets:'3', reps:'12', rest:'45s' },
      ],
      'Lower B': [
        { name:'Deadlift',              sets:'3', reps:'6',       rest:'120s' },
        { name:'Bulgarian Split Squat', sets:'3', reps:'10 each', rest:'75s'  },
        { name:'Nordic Curl',           sets:'3', reps:'8',       rest:'60s'  },
        { name:'Hip Thrust',            sets:'3', reps:'12',      rest:'60s'  },
        { name:'Standing Calf Raise',   sets:'4', reps:'15',      rest:'45s'  },
      ],
    },
  },
  {
    id: 'bro-split', name: 'Bro Split', goal: 'muscle',
    description: '5-day split dedicating each day to one muscle group. Classic bodybuilding style.',
    tags: ['Intermediate', '5 days'],
    scheduleMap: {
      'Chest Day': [
        { name:'Flat Barbell Bench Press', sets:'4', reps:'8',  rest:'90s' },
        { name:'Incline Barbell Press',    sets:'4', reps:'10', rest:'90s' },
        { name:'Dumbbell Fly',             sets:'3', reps:'12', rest:'60s' },
        { name:'Cable Crossover',          sets:'3', reps:'15', rest:'45s' },
      ],
      'Back Day': [
        { name:'Deadlift',              sets:'4', reps:'6',  rest:'120s' },
        { name:'Wide-Grip Pull-Up',     sets:'4', reps:'8',  rest:'90s'  },
        { name:'T-Bar Row',             sets:'3', reps:'10', rest:'90s'  },
        { name:'Straight-Arm Pulldown', sets:'3', reps:'15', rest:'45s'  },
      ],
      'Shoulders Day': [
        { name:'Seated Barbell Press',   sets:'4', reps:'8',  rest:'90s' },
        { name:'Dumbbell Lateral Raise', sets:'4', reps:'15', rest:'45s' },
        { name:'Rear Delt Fly',          sets:'3', reps:'15', rest:'45s' },
        { name:'Upright Row',            sets:'3', reps:'12', rest:'60s' },
      ],
      'Arms Day': [
        { name:'EZ Bar Curl',                 sets:'4', reps:'10', rest:'60s' },
        { name:'Incline Dumbbell Curl',        sets:'3', reps:'12', rest:'45s' },
        { name:'Close-Grip Bench Press',       sets:'4', reps:'10', rest:'60s' },
        { name:'Overhead Tricep Extension',    sets:'3', reps:'12', rest:'45s' },
      ],
      'Legs Day': [
        { name:'Back Squat',       sets:'4', reps:'8',  rest:'120s' },
        { name:'Hack Squat',       sets:'3', reps:'12', rest:'90s'  },
        { name:'Leg Extension',    sets:'3', reps:'15', rest:'45s'  },
        { name:'Lying Leg Curl',   sets:'3', reps:'12', rest:'45s'  },
        { name:'Seated Calf Raise',sets:'4', reps:'15', rest:'45s'  },
      ],
    },
  },
  {
    id: 'fat-burn-circuit', name: 'Fat Burn Circuit', goal: 'fat',
    description: '3-day full-body circuit with high reps, short rest, and cardio bursts. Maximises calorie burn.',
    tags: ['Beginner', '3 days', 'Weight Loss'],
    scheduleMap: {
      'Circuit A': [
        { name:'Jumping Jacks',    sets:'2', reps:'45s',     rest:'15s' },
        { name:'Bodyweight Squat', sets:'3', reps:'20',      rest:'30s' },
        { name:'Push-Up',          sets:'3', reps:'15',      rest:'30s' },
        { name:'Mountain Climbers',sets:'3', reps:'30s',     rest:'30s' },
        { name:'Plank',            sets:'3', reps:'30s',     rest:'30s' },
      ],
      'Circuit B': [
        { name:'High Knees',      sets:'2', reps:'30s',     rest:'15s' },
        { name:'Reverse Lunge',   sets:'3', reps:'12 each', rest:'30s' },
        { name:'Dumbbell Row',    sets:'3', reps:'15',      rest:'30s' },
        { name:'Glute Bridge',    sets:'3', reps:'20',      rest:'30s' },
        { name:'Burpee',          sets:'3', reps:'10',      rest:'45s' },
      ],
      'Circuit C': [
        { name:'Jumping Jacks',          sets:'2', reps:'45s', rest:'15s' },
        { name:'Bodyweight Squat',        sets:'3', reps:'20',  rest:'30s' },
        { name:'Dumbbell Shoulder Press', sets:'3', reps:'15',  rest:'30s' },
        { name:'Mountain Climbers',       sets:'3', reps:'30s', rest:'30s' },
        { name:'Burpee',                  sets:'3', reps:'10',  rest:'45s' },
      ],
    },
  },
  {
    id: 'metabolic-conditioning', name: 'Metabolic Conditioning', goal: 'fat',
    description: '4-day program combining compound strength moves with cardio finishers. Burns fat while building lean muscle.',
    tags: ['Intermediate', '4 days', 'Weight Loss'],
    scheduleMap: {
      'Lower Power': [
        { name:'Jump Rope',         sets:'2', reps:'60s',     rest:'20s' },
        { name:'Goblet Squat',      sets:'4', reps:'15',      rest:'45s' },
        { name:'Romanian Deadlift', sets:'4', reps:'12',      rest:'60s' },
        { name:'Walking Lunge',     sets:'3', reps:'12 each', rest:'45s' },
        { name:'Step-Up',           sets:'3', reps:'12 each', rest:'45s' },
      ],
      'Upper Power': [
        { name:'Jump Rope',            sets:'2', reps:'60s',     rest:'20s' },
        { name:'Dumbbell Bench Press', sets:'4', reps:'12',      rest:'45s' },
        { name:'Dumbbell Row',         sets:'4', reps:'12',      rest:'45s' },
        { name:'Dumbbell Lateral Raise',sets:'3', reps:'15',     rest:'30s' },
        { name:'Renegade Row',         sets:'3', reps:'10 each', rest:'45s' },
      ],
      'Lower Cardio': [
        { name:'Jump Rope',      sets:'2', reps:'60s', rest:'20s' },
        { name:'Goblet Squat',   sets:'3', reps:'15',  rest:'30s' },
        { name:'Box Jump',       sets:'3', reps:'10',  rest:'60s' },
        { name:'Kettlebell Swing',sets:'4', reps:'20', rest:'30s' },
        { name:'Jump Squat',     sets:'3', reps:'15',  rest:'30s' },
      ],
      'Upper Cardio': [
        { name:'Jump Rope',             sets:'2', reps:'60s',     rest:'20s' },
        { name:'Push-Up to T-Rotation', sets:'3', reps:'10 each', rest:'45s' },
        { name:'Dumbbell Row',          sets:'3', reps:'12',      rest:'45s' },
        { name:'Battle Rope Waves',     sets:'3', reps:'30s',     rest:'30s' },
        { name:'Sled Push',             sets:'4', reps:'20s',     rest:'60s' },
      ],
    },
  },
]

type WorkoutTpl = typeof WORKOUT_TEMPLATES[0]
type TplExercise = { name: string; sets: string; reps: string; rest: string; imageUrl?: string }
type ScheduleMap = Record<string, TplExercise[]>

// ── 60 preset exercises ───────────────────────────────────────────────────────
const PRESET_EXERCISES = [
  { id:'p-0',  name:'Push-Up',                   category:'Strength', muscleGroup:'Chest',     difficulty:'Beginner',     equipment:'Bodyweight', goals:['Muscle Gain','Weight Loss','General Fitness'], sets:'3', reps:'10-15' },
  { id:'p-1',  name:'Bench Press',                category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'4', reps:'6-8'   },
  { id:'p-2',  name:'Incline Dumbbell Press',     category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-3',  name:'Chest Dip',                  category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Bodyweight', goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-12'  },
  { id:'p-4',  name:'Cable Fly',                  category:'Strength', muscleGroup:'Chest',     difficulty:'Intermediate', equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-5',  name:'Pull-Up',                    category:'Strength', muscleGroup:'Back',      difficulty:'Advanced',     equipment:'Bodyweight', goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'5-8'   },
  { id:'p-6',  name:'Chin-Up',                    category:'Strength', muscleGroup:'Back',      difficulty:'Advanced',     equipment:'Bodyweight', goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'5-8'   },
  { id:'p-7',  name:'Lat Pulldown',               category:'Strength', muscleGroup:'Back',      difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'8-10'  },
  { id:'p-8',  name:'Seated Cable Row',           category:'Strength', muscleGroup:'Back',      difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-9',  name:'One-Arm Dumbbell Row',       category:'Strength', muscleGroup:'Back',      difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10 each' },
  { id:'p-10', name:'Deadlift',                   category:'Strength', muscleGroup:'Back',      difficulty:'Advanced',     equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'5'     },
  { id:'p-11', name:'Overhead Press',             category:'Strength', muscleGroup:'Shoulders', difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'6-8'   },
  { id:'p-12', name:'Dumbbell Shoulder Press',    category:'Strength', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'8-10'  },
  { id:'p-13', name:'Lateral Raise',              category:'Strength', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-14', name:'Face Pull',                  category:'Strength', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Cable',      goals:['General Fitness','Strength'],                    sets:'3', reps:'12-15' },
  { id:'p-15', name:'Upright Row',                category:'Strength', muscleGroup:'Shoulders', difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-16', name:'Dumbbell Curl',              category:'Strength', muscleGroup:'Biceps',    difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-17', name:'Hammer Curl',                category:'Strength', muscleGroup:'Biceps',    difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-18', name:'Barbell Curl',               category:'Strength', muscleGroup:'Biceps',    difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-19', name:'Preacher Curl',              category:'Strength', muscleGroup:'Biceps',    difficulty:'Intermediate', equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'8-10'  },
  { id:'p-20', name:'Triceps Pushdown',           category:'Strength', muscleGroup:'Triceps',   difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-21', name:'Overhead Triceps Extension', category:'Strength', muscleGroup:'Triceps',   difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-22', name:'Close-Grip Bench Press',     category:'Strength', muscleGroup:'Triceps',   difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-23', name:'Skull Crusher',              category:'Strength', muscleGroup:'Triceps',   difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-24', name:'Bodyweight Squat',           category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Muscle Gain'],  sets:'3', reps:'15-20' },
  { id:'p-25', name:'Goblet Squat',               category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'10-12' },
  { id:'p-26', name:'Barbell Back Squat',         category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'4', reps:'6-8'   },
  { id:'p-27', name:'Romanian Deadlift',          category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-28', name:'Leg Press',                  category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-29', name:'Walking Lunge',              category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Dumbbell',   goals:['Muscle Gain','General Fitness','Weight Loss'],  sets:'3', reps:'10 each' },
  { id:'p-30', name:'Bulgarian Split Squat',      category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8 each' },
  { id:'p-31', name:'Leg Extension',              category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-32', name:'Leg Curl',                   category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-33', name:'Standing Calf Raise',        category:'Strength', muscleGroup:'Legs',      difficulty:'Beginner',     equipment:'Machine',    goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-34', name:'Hip Thrust',                 category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Barbell',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-12'  },
  { id:'p-35', name:'Hack Squat',                 category:'Strength', muscleGroup:'Legs',      difficulty:'Intermediate', equipment:'Machine',    goals:['Muscle Gain','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-36', name:'Plank',                      category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['General Fitness','Strength','Weight Loss'],     sets:'3', reps:'45s'   },
  { id:'p-37', name:'Side Plank',                 category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['General Fitness','Strength'],                    sets:'3', reps:'30s'   },
  { id:'p-38', name:'Hanging Knee Raise',         category:'Strength', muscleGroup:'Core',      difficulty:'Intermediate', equipment:'Bodyweight', goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'10-12' },
  { id:'p-39', name:'Dead Bug',                   category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['General Fitness','Mobility'],                    sets:'3', reps:'10 each' },
  { id:'p-40', name:'Cable Crunch',               category:'Strength', muscleGroup:'Core',      difficulty:'Beginner',     equipment:'Cable',      goals:['Muscle Gain','General Fitness'],                 sets:'3', reps:'12-15' },
  { id:'p-41', name:'Kettlebell Swing',           category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Kettlebell', goals:['Weight Loss','Strength','General Fitness'],     sets:'3', reps:'15'    },
  { id:'p-42', name:'Burpee',                     category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Strength'],     sets:'3', reps:'8-10'  },
  { id:'p-43', name:"Farmer's Carry",             category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Dumbbell',   goals:['Strength','General Fitness','Muscle Gain'],     sets:'3', reps:'40s'   },
  { id:'p-44', name:'Thruster',                   category:'Strength', muscleGroup:'Full Body', difficulty:'Intermediate', equipment:'Barbell',    goals:['Weight Loss','Strength','General Fitness'],     sets:'3', reps:'8-10'  },
  { id:'p-45', name:'Walking',                    category:'Cardio',   muscleGroup:'Running',   difficulty:'Beginner',     equipment:'Bodyweight', goals:['Weight Loss','General Fitness'],                 sets:'1', reps:'20min' },
  { id:'p-46', name:'Running',                    category:'Cardio',   muscleGroup:'Running',   difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'20min' },
  { id:'p-47', name:'Cycling',                    category:'Cardio',   muscleGroup:'Cycling',   difficulty:'Beginner',     equipment:'Machine',    goals:['Weight Loss','General Fitness'],                 sets:'1', reps:'20min' },
  { id:'p-48', name:'Jump Rope',                  category:'Cardio',   muscleGroup:'Running',   difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness'],                 sets:'3', reps:'60s'   },
  { id:'p-49', name:'Rowing',                     category:'Cardio',   muscleGroup:'Rowing',    difficulty:'Intermediate', equipment:'Machine',    goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'15min' },
  { id:'p-50', name:'Stair Climber',              category:'Cardio',   muscleGroup:'Running',   difficulty:'Intermediate', equipment:'Machine',    goals:['Weight Loss','General Fitness'],                 sets:'1', reps:'15min' },
  { id:'p-51', name:'Swimming',                   category:'Cardio',   muscleGroup:'Rowing',    difficulty:'Intermediate', equipment:'Bodyweight', goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'20min' },
  { id:'p-52', name:'Assault Bike',               category:'Cardio',   muscleGroup:'Cycling',   difficulty:'Intermediate', equipment:'Machine',    goals:['Weight Loss','General Fitness','Strength'],     sets:'1', reps:'15min' },
  { id:'p-53', name:'Dead Hang',                  category:'Mobility', muscleGroup:'Shoulders', difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'3', reps:'30s'   },
  { id:'p-54', name:'Cat-Cow Stretch',            category:'Mobility', muscleGroup:'Spine',     difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'10'    },
  { id:'p-55', name:'Hip Flexor Stretch',         category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'45s'   },
  { id:'p-56', name:"World's Greatest Stretch",   category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'5 each' },
  { id:'p-57', name:'Thoracic Rotation',          category:'Mobility', muscleGroup:'Spine',     difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'8 each' },
  { id:'p-58', name:'Couch Stretch',              category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'45s'   },
  { id:'p-59', name:'Deep Squat Hold',            category:'Mobility', muscleGroup:'Hips',      difficulty:'Beginner',     equipment:'Bodyweight', goals:['Mobility','General Fitness'],                    sets:'2', reps:'60s'   },
]

const WEIGHT_PLAN_GOALS: Record<string, string[]> = {
  'weight-gain': ['Muscle Gain', 'Strength', 'General Fitness'],
  'weight-loss': ['Weight Loss', 'General Fitness'],
}

// ── Shared image thumbnail ────────────────────────────────────────────────────
function ExThumbnail({ url, onUpload, uploading, title }: {
  url?: string; onUpload: (f: File) => void; uploading: boolean; title?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  if (uploading) return <div className="w-9 h-9 rounded-md flex items-center justify-center"><Spinner size="sm" /></div>
  return (
    <div className="w-9 h-9 rounded-md overflow-hidden border border-dashed border-border cursor-pointer group relative flex-shrink-0"
      onClick={() => ref.current?.click()} title={title ?? 'Upload image'}>
      {url
        ? <img src={url} alt="" className="w-full h-full object-cover" />
        : <div className="w-full h-full bg-muted/30 flex items-center justify-center">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
          </div>}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <ImageIcon className="h-3 w-3 text-white" />
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
    </div>
  )
}

// ── Exercise library editable row ─────────────────────────────────────────────

type LibraryExFull = {
  id: string; name: string; category: string; muscleGroup: string
  difficulty: string; equipment: string; goals: string[]; sets: string; reps: string; imageUrl?: string
}

const GOALS_OPTIONS = ['Muscle Gain', 'Strength', 'Weight Loss', 'General Fitness', 'Mobility']
const DIFF_OPTIONS  = ['Beginner', 'Intermediate', 'Advanced', 'Elite']
const CAT_OPTIONS   = ['Strength', 'Cardio', 'Mobility']

function LibraryExRow({ ex, imgUrl, uploading, onUploadImage, onSave, onDelete }: {
  ex: LibraryExFull; imgUrl?: string; uploading: boolean
  onUploadImage: (f: File) => void
  onSave: (updated: LibraryExFull) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<LibraryExFull>({ ...ex })
  const ipt = 'h-7 text-xs px-1.5 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
  const commit = () => { onSave(draft); setEditing(false) }
  const cancel = () => { setDraft({ ...ex }); setEditing(false) }
  return (
    <tr className={`hover:bg-muted/20 group ${editing ? 'bg-primary/5' : ''}`}>
      <td className="px-3 py-2 w-12">
        <ExThumbnail url={imgUrl ?? ex.imageUrl} uploading={uploading} title={`Upload image for ${ex.name}`} onUpload={onUploadImage} />
      </td>
      {editing ? (
        <>
          <td className="px-2 py-2"><input autoFocus value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} className={`${ipt} w-full min-w-[120px]`} /></td>
          <td className="px-2 py-2 hidden sm:table-cell"><input value={draft.muscleGroup} onChange={e => setDraft(d => ({ ...d, muscleGroup: e.target.value }))} className={`${ipt} w-24`} /></td>
          <td className="px-2 py-2 hidden md:table-cell"><input value={draft.equipment} onChange={e => setDraft(d => ({ ...d, equipment: e.target.value }))} className={`${ipt} w-24`} /></td>
          <td className="px-2 py-2"><select value={draft.difficulty} onChange={e => setDraft(d => ({ ...d, difficulty: e.target.value }))} className={`${ipt} w-28 pr-1`}>{DIFF_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></td>
          <td className="px-2 py-2 hidden lg:table-cell">
            <div className="flex gap-1">
              <input value={draft.sets} onChange={e => setDraft(d => ({ ...d, sets: e.target.value }))} className={`${ipt} w-10 text-center`} placeholder="3" />
              <span className="text-muted-foreground self-center text-xs">×</span>
              <input value={draft.reps} onChange={e => setDraft(d => ({ ...d, reps: e.target.value }))} className={`${ipt} w-16 text-center`} placeholder="10" />
            </div>
          </td>
          <td className="px-2 py-2 hidden lg:table-cell">
            <div className="flex flex-wrap gap-1">
              {GOALS_OPTIONS.map(g => (
                <label key={g} className="flex items-center gap-1 text-[10px] cursor-pointer select-none">
                  <input type="checkbox" checked={draft.goals.includes(g)} onChange={e => setDraft(d => ({ ...d, goals: e.target.checked ? [...d.goals, g] : d.goals.filter(x => x !== g) }))} className="w-3 h-3" />{g}
                </label>
              ))}
            </div>
          </td>
          <td className="px-2 py-2"><div className="flex gap-1">
            <button onClick={commit} className="h-6 w-6 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={cancel} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
          </div></td>
        </>
      ) : (
        <>
          <td className="px-4 py-2.5 font-medium text-sm">{ex.name}</td>
          <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground text-sm">{ex.muscleGroup}</td>
          <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground text-sm">{ex.equipment}</td>
          <td className="px-4 py-2.5"><Badge variant={DIFF_BADGE[ex.difficulty.toLowerCase()] ?? 'outline'}>{ex.difficulty}</Badge></td>
          <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">{ex.sets} × {ex.reps}</td>
          <td className="px-4 py-2.5 hidden lg:table-cell">
            <div className="flex flex-wrap gap-1">
              {(ex.goals.includes('Muscle Gain') || ex.goals.includes('Strength')) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Gain</span>}
              {ex.goals.includes('Weight Loss') && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">Loss</span>}
              {ex.goals.includes('Mobility') && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">Mobility</span>}
            </div>
          </td>
          <td className="px-2 py-2.5"><div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setDraft({ ...ex }); setEditing(true) }} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit"><Pencil className="h-3 w-3" /></button>
            <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete"><Trash2 className="h-3 w-3" /></button>
          </div></td>
        </>
      )}
    </tr>
  )
}

// ── LibraryExRow with checkbox ────────────────────────────────────────────────
function LibraryExRowSelectable({ ex, imgUrl, uploading, selected, onToggleSelect, onUploadImage, onSave, onDelete }: {
  ex: LibraryExFull; imgUrl?: string; uploading: boolean; selected: boolean
  onToggleSelect: () => void
  onUploadImage: (f: File) => void
  onSave: (updated: LibraryExFull) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<LibraryExFull>({ ...ex })
  const ipt = 'h-7 text-xs px-1.5 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
  const commit = () => { onSave(draft); setEditing(false) }
  const cancel = () => { setDraft({ ...ex }); setEditing(false) }
  return (
    <tr className={`hover:bg-muted/20 group ${selected ? 'bg-primary/5' : ''} ${editing ? '!bg-primary/5' : ''}`}>
      <td className="px-3 py-2 w-8">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-3.5 h-3.5 rounded border-border cursor-pointer" />
      </td>
      <td className="px-3 py-2 w-12">
        <ExThumbnail url={imgUrl ?? ex.imageUrl} uploading={uploading} title={`Upload image for ${ex.name}`} onUpload={onUploadImage} />
      </td>
      {editing ? (
        <>
          <td className="px-2 py-2"><input autoFocus value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} className={`${ipt} w-full min-w-[120px]`} /></td>
          <td className="px-2 py-2 hidden sm:table-cell"><input value={draft.muscleGroup} onChange={e => setDraft(d => ({ ...d, muscleGroup: e.target.value }))} className={`${ipt} w-24`} /></td>
          <td className="px-2 py-2 hidden md:table-cell"><input value={draft.equipment} onChange={e => setDraft(d => ({ ...d, equipment: e.target.value }))} className={`${ipt} w-24`} /></td>
          <td className="px-2 py-2"><select value={draft.difficulty} onChange={e => setDraft(d => ({ ...d, difficulty: e.target.value }))} className={`${ipt} w-28 pr-1`}>{DIFF_OPTIONS.map(o => <option key={o}>{o}</option>)}</select></td>
          <td className="px-2 py-2 hidden lg:table-cell">
            <div className="flex gap-1">
              <input value={draft.sets} onChange={e => setDraft(d => ({ ...d, sets: e.target.value }))} className={`${ipt} w-10 text-center`} />
              <span className="text-muted-foreground self-center text-xs">×</span>
              <input value={draft.reps} onChange={e => setDraft(d => ({ ...d, reps: e.target.value }))} className={`${ipt} w-16 text-center`} />
            </div>
          </td>
          <td className="px-2 py-2 hidden lg:table-cell">
            <div className="flex flex-wrap gap-1">{GOALS_OPTIONS.map(g => <label key={g} className="flex items-center gap-1 text-[10px] cursor-pointer"><input type="checkbox" checked={draft.goals.includes(g)} onChange={e => setDraft(d => ({ ...d, goals: e.target.checked ? [...d.goals, g] : d.goals.filter(x => x !== g) }))} className="w-3 h-3" />{g}</label>)}</div>
          </td>
          <td className="px-2 py-2"><div className="flex gap-1">
            <button onClick={commit} className="h-6 w-6 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={cancel} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
          </div></td>
        </>
      ) : (
        <>
          <td className="px-4 py-2.5 font-medium text-sm">{ex.name}</td>
          <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground text-sm">{ex.muscleGroup}</td>
          <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground text-sm">{ex.equipment}</td>
          <td className="px-4 py-2.5"><Badge variant={DIFF_BADGE[ex.difficulty.toLowerCase()] ?? 'outline'}>{ex.difficulty}</Badge></td>
          <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">{ex.sets} × {ex.reps}</td>
          <td className="px-4 py-2.5 hidden lg:table-cell">
            <div className="flex flex-wrap gap-1">
              {(ex.goals.includes('Muscle Gain') || ex.goals.includes('Strength')) && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Gain</span>}
              {ex.goals.includes('Weight Loss') && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">Loss</span>}
              {ex.goals.includes('Mobility') && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30">Mobility</span>}
            </div>
          </td>
          <td className="px-2 py-2.5"><div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setDraft({ ...ex }); setEditing(true) }} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-3 w-3" /></button>
            <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
          </div></td>
        </>
      )}
    </tr>
  )
}

// ── Tab 1: Exercise Library ───────────────────────────────────────────────────
function ExerciseLibraryTab() {
  const qc = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<string>('Strength')
  const [search, setSearch] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [localExercises, setLocalExercises] = useState<LibraryExFull[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { data: savedPresets = [] } = useQuery({
    queryKey: ['presets', 'exercise'],
    queryFn: () => fetchPresets('exercise'),
  })

  const dbLibraryRow = savedPresets.find(r => r.id === 'library-exercises')
  const dbExercises = dbLibraryRow ? ((dbLibraryRow.data as any)?.exercises as LibraryExFull[]) ?? null : null
  const baseExercises: LibraryExFull[] = (dbExercises ?? PRESET_EXERCISES.map(e => ({ ...e }))) as LibraryExFull[]
  const exercises = localExercises ?? baseExercises
  const isDirty = localExercises !== null

  const imageMap: Record<string, string> = {}
  for (const row of savedPresets) {
    for (const ex of ((row.data as any)?.exercises ?? [])) {
      if (ex.id && ex.imageUrl) imageMap[ex.id] = ex.imageUrl
    }
  }

  const mutate = (fn: (list: LibraryExFull[]) => LibraryExFull[]) =>
    setLocalExercises(fn([...(localExercises ?? baseExercises)]))

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleSelectAll = (ids: string[]) => {
    const all = ids.every(id => selected.has(id))
    setSelected(prev => { const n = new Set(prev); ids.forEach(id => all ? n.delete(id) : n.add(id)); return n })
  }

  const handleBulkDelete = async () => {
    if (!selected.size) return
    setBulkDeleting(true)
    try {
      const updated = (localExercises ?? baseExercises).filter(e => !selected.has(e.id))
      setLocalExercises(updated)
      setSelected(new Set())
    } finally { setBulkDeleting(false) }
  }

  const saveLibrary = async () => {
    if (!localExercises) return
    setSaving(true)
    try {
      await upsertPreset({
        id: 'library-exercises', type: 'exercise',
        name: 'Exercise Library', name_am: null,
        description: null, description_am: null, tags: null, tags_am: null,
        target_goals: [], target_bmi_categories: [],
        image_url: null, data: { exercises: localExercises },
      })
      // Refetch first — clears local state only after cache is warm
      await qc.refetchQueries({ queryKey: ['presets', 'exercise'] })
      setLocalExercises(null)
      toast.success('Exercise library saved')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSaving(false) }
  }

  const handleImageUpload = async (ex: LibraryExFull, file: File) => {
    setUploadingId(ex.id)
    try {
      const url = await uploadPresetImage(`library-${ex.id}`, file)
      const updated = (localExercises ?? baseExercises).map(e => e.id === ex.id ? { ...e, imageUrl: url } : e)
      mutate(() => updated)
      await upsertPreset({
        id: 'library-exercises', type: 'exercise',
        name: 'Exercise Library', name_am: null,
        description: null, description_am: null, tags: null, tags_am: null,
        target_goals: [], target_bmi_categories: [],
        image_url: null, data: { exercises: updated },
      })
      await qc.refetchQueries({ queryKey: ['presets', 'exercise'] })
      toast.success(`Image saved for ${ex.name}`)
    } catch (e) { toast.error((e as Error).message) }
    finally { setUploadingId(null) }
  }

  const addExercise = (category: string) => {
    mutate(list => [...list, {
      id: `custom-${Date.now()}`, name: 'New Exercise', category,
      muscleGroup: '', equipment: 'Bodyweight',
      difficulty: 'Beginner', goals: ['General Fitness'], sets: '3', reps: '10',
    }])
  }

  const filtered = exercises.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false
    return true
  })

  const categories = ['Strength', 'Cardio', 'Mobility', ...new Set(exercises.map(e => e.category).filter(c => !['Strength','Cardio','Mobility'].includes(c)))]
  const activeItems = filtered.filter(e => e.category === categoryFilter || categoryFilter === 'all')

  return (
    <div className="space-y-5 pt-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search exercises…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <span className="text-xs text-muted-foreground">{activeItems.length} exercises</span>
        {isDirty && (
          <>
            <button onClick={saveLibrary} disabled={saving}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5" />} Save library
            </button>
            <button onClick={() => setLocalExercises(null)}
              className="h-8 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted">
              Discard
            </button>
          </>
        )}
      </div>

      {isDirty && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <span className="text-xs text-amber-400">Unsaved changes — click "Save library" to persist to all users.</span>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5">
          <span className="text-sm font-medium text-destructive">{selected.size} exercise{selected.size > 1 ? 's' : ''} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 disabled:opacity-50">
            {bulkDeleting ? <Spinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />} Delete selected
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>
        </div>
      )}

      {/* Horizontal category tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 border-b border-border" role="tablist">
        {categories.map(cat => {
          const count = exercises.filter(e => e.category === cat && (!search || e.name.toLowerCase().includes(search.toLowerCase()))).length
          return (
            <button key={cat} role="tab" aria-selected={categoryFilter === cat}
              onClick={() => { setCategoryFilter(cat); setSelected(new Set()) }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${categoryFilter === cat ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
              {cat}
              <span className="text-[10px] tabular-nums opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Active category table */}
      {(() => {
        const groupIds = activeItems.map(e => e.id)
        const allGroupSel = groupIds.length > 0 && groupIds.every(id => selected.has(id))
        const someGroupSel = groupIds.some(id => selected.has(id))
        return (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2.5 w-8">
                  <input type="checkbox" checked={allGroupSel}
                    ref={el => { if (el) el.indeterminate = someGroupSel && !allGroupSel }}
                    onChange={() => toggleSelectAll(groupIds)}
                    className="w-3.5 h-3.5 rounded border-border cursor-pointer" />
                </th>
                <th className="px-3 py-2.5 w-12"></th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Exercise</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Muscle</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Equipment</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Difficulty</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Sets / Reps</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Plans</th>
                <th className="px-4 py-2.5 w-16"></th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {activeItems.map(ex => (
                  <LibraryExRowSelectable
                    key={ex.id}
                    ex={ex}
                    imgUrl={imageMap[ex.id]}
                    uploading={uploadingId === ex.id}
                    selected={selected.has(ex.id)}
                    onToggleSelect={() => toggleSelect(ex.id)}
                    onUploadImage={f => handleImageUpload(ex, f)}
                    onSave={updated => mutate(list => list.map(e => e.id === ex.id ? updated : e))}
                    onDelete={() => mutate(list => list.filter(e => e.id !== ex.id))}
                  />
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-border/40">
              <button onClick={() => addExercise(categoryFilter)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">
                <Plus className="h-3.5 w-3.5" /> Add exercise to {categoryFilter}
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Inline editable exercise row for templates ────────────────────────────────
type TplExRowProps = {
  ex: TplExercise
  rowKey: string
  index: number
  totalRows: number
  uploadingKey: string | null
  onSave: (updated: TplExercise) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onImageUpload: (f: File) => void
}

function TplExRow({ ex, rowKey, index, totalRows, uploadingKey, onSave, onDelete, onMoveUp, onMoveDown, onImageUpload }: TplExRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<TplExercise>({ ...ex })

  if (editing) {
    return (
      <tr className="bg-primary/5">
        <td className="px-3 py-2">
          <ExThumbnail url={draft.imageUrl} uploading={uploadingKey === rowKey}
            title={`Upload image for ${draft.name}`} onUpload={onImageUpload} />
        </td>
        <td className="px-3 py-2">
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-16">
          <input value={draft.sets} onChange={e => setDraft(d => ({ ...d, sets: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-20">
          <input value={draft.reps} onChange={e => setDraft(d => ({ ...d, reps: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-16 hidden sm:table-cell">
          <input value={draft.rest} onChange={e => setDraft(d => ({ ...d, rest: e.target.value }))}
            className="flex h-8 w-full rounded border border-input bg-background px-2 text-sm text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </td>
        <td className="px-2 py-2 w-24">
          <div className="flex gap-1">
            <button onClick={() => { onSave(draft); setEditing(false) }}
              className="flex h-7 w-7 items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Save">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => { setDraft({ ...ex }); setEditing(false) }}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary transition-colors" title="Cancel">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="hover:bg-muted/20 group">
      <td className="px-3 py-2">
        <ExThumbnail url={ex.imageUrl} uploading={uploadingKey === rowKey}
          title={`Upload image for ${ex.name}`} onUpload={onImageUpload} />
      </td>
      <td className="px-3 py-2 font-medium text-sm cursor-pointer" onClick={() => { setDraft({ ...ex }); setEditing(true) }}>
        {ex.name || <span className="text-muted-foreground italic">Unnamed exercise</span>}
      </td>
      <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums cursor-pointer"
        onClick={() => { setDraft({ ...ex }); setEditing(true) }}>{ex.sets}</td>
      <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums cursor-pointer"
        onClick={() => { setDraft({ ...ex }); setEditing(true) }}>{ex.reps}</td>
      <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell cursor-pointer"
        onClick={() => { setDraft({ ...ex }); setEditing(true) }}>{ex.rest}</td>
      <td className="px-2 py-2 w-24">
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onMoveUp} disabled={index === 0}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors" title="Move up">
            <ArrowUp className="h-3 w-3" />
          </button>
          <button onClick={onMoveDown} disabled={index === totalRows - 1}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors" title="Move down">
            <ArrowDown className="h-3 w-3" />
          </button>
          <button onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete exercise">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Editable exercise row for templates ──────────────────────────────────────
function ExerciseRow({ ex, imgUrl, uploading, isFirst, isLast, onUploadImage, onSave, onDelete, onMoveUp, onMoveDown }: {
  ex: TplExercise; imgUrl?: string; uploading: boolean
  isFirst: boolean; isLast: boolean
  onUploadImage: (f: File) => void
  onSave: (updated: TplExercise) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [buf, setBuf] = useState<TplExercise>(ex)
  const ipt = 'h-7 text-xs px-1.5 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  const commit = () => { onSave(buf); setEditing(false) }
  const cancel = () => { setBuf(ex); setEditing(false) }

  return (
    <tr className="hover:bg-muted/20 group">
      <td className="px-3 py-2">
        <ExThumbnail url={imgUrl} uploading={uploading} title={`Upload image for ${ex.name}`} onUpload={onUploadImage} />
      </td>
      {editing ? (
        <>
          <td className="px-3 py-2"><input autoFocus value={buf.name} onChange={e => setBuf(b => ({ ...b, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} className={`${ipt} w-full min-w-[120px]`} /></td>
          <td className="px-3 py-2 text-center"><input value={buf.sets} onChange={e => setBuf(b => ({ ...b, sets: e.target.value }))} className={`${ipt} w-12 text-center`} /></td>
          <td className="px-3 py-2 text-center"><input value={buf.reps} onChange={e => setBuf(b => ({ ...b, reps: e.target.value }))} className={`${ipt} w-16 text-center`} /></td>
          <td className="px-3 py-2 text-center hidden sm:table-cell"><input value={buf.rest} onChange={e => setBuf(b => ({ ...b, rest: e.target.value }))} className={`${ipt} w-14 text-center`} /></td>
          <td className="px-3 py-2 text-right">
            <div className="flex items-center justify-end gap-1">
              <button onClick={commit} className="h-6 w-6 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={cancel} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-3 py-2 font-medium text-sm">{ex.name}</td>
          <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums">{ex.sets}</td>
          <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums">{ex.reps}</td>
          <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">{ex.rest}</td>
          <td className="px-3 py-2 text-right">
            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setBuf(ex); setEditing(true) }} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Edit"><Pencil className="h-3 w-3" /></button>
              <button disabled={isFirst} onClick={onMoveUp} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30" title="Move up"><ArrowUp className="h-3 w-3" /></button>
              <button disabled={isLast} onClick={onMoveDown} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30" title="Move down"><ArrowDown className="h-3 w-3" /></button>
              <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete"><Trash2 className="h-3 w-3" /></button>
            </div>
          </td>
        </>
      )}
    </tr>
  )
}

// ── ExerciseRow with checkbox ─────────────────────────────────────────────────
function ExerciseRowSelectable({ ex, imgUrl, uploading, selected, onToggleSelect, isFirst, isLast, onUploadImage, onSave, onDelete, onMoveUp, onMoveDown }: {
  ex: TplExercise; imgUrl?: string; uploading: boolean; selected: boolean
  onToggleSelect: () => void; isFirst: boolean; isLast: boolean
  onUploadImage: (f: File) => void
  onSave: (updated: TplExercise) => void
  onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [buf, setBuf] = useState<TplExercise>(ex)
  const ipt = 'h-7 text-xs px-1.5 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
  const commit = () => { onSave(buf); setEditing(false) }
  const cancel = () => { setBuf(ex); setEditing(false) }
  return (
    <tr className={`hover:bg-muted/20 group ${selected ? 'bg-primary/5' : ''} ${editing ? '!bg-primary/5' : ''}`}>
      <td className="px-3 py-2 w-8">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="w-3.5 h-3.5 rounded border-border cursor-pointer" />
      </td>
      <td className="px-3 py-2 w-12">
        <ExThumbnail url={imgUrl} uploading={uploading} title={`Upload image for ${ex.name}`} onUpload={onUploadImage} />
      </td>
      {editing ? (
        <>
          <td className="px-3 py-2"><input autoFocus value={buf.name} onChange={e => setBuf(b => ({ ...b, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} className={`${ipt} w-full min-w-[120px]`} /></td>
          <td className="px-3 py-2 text-center"><input value={buf.sets} onChange={e => setBuf(b => ({ ...b, sets: e.target.value }))} className={`${ipt} w-12 text-center`} /></td>
          <td className="px-3 py-2 text-center"><input value={buf.reps} onChange={e => setBuf(b => ({ ...b, reps: e.target.value }))} className={`${ipt} w-16 text-center`} /></td>
          <td className="px-3 py-2 text-center hidden sm:table-cell"><input value={buf.rest} onChange={e => setBuf(b => ({ ...b, rest: e.target.value }))} className={`${ipt} w-14 text-center`} /></td>
          <td className="px-3 py-2"><div className="flex gap-1">
            <button onClick={commit} className="h-6 w-6 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={cancel} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
          </div></td>
        </>
      ) : (
        <>
          <td className="px-3 py-2 font-medium text-sm">{ex.name}</td>
          <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums">{ex.sets}</td>
          <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums">{ex.reps}</td>
          <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">{ex.rest}</td>
          <td className="px-3 py-2"><div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setBuf(ex); setEditing(true) }} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"><Pencil className="h-3 w-3" /></button>
            <button disabled={isFirst} onClick={onMoveUp} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
            <button disabled={isLast} onClick={onMoveDown} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
            <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></button>
          </div></td>
        </>
      )}
    </tr>
  )
}

// ── Tab 2: Workout Templates ──────────────────────────────────────────────────
function WorkoutTemplatesTab() {
  const qc = useQueryClient()
  const [goalFilter, setGoalFilter] = useState<'all' | 'muscle' | 'strength' | 'fat'>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>('full-body')
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [localSchedules, setLocalSchedules] = useState<Record<string, ScheduleMap>>({})
  const [addingDay, setAddingDay] = useState<{ tplId: string; name: string } | null>(null)
  // bulk selection: key = `${tplId}|${dayName}|${exIdx}`
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: savedPresets = [] } = useQuery({
    queryKey: ['presets', 'exercise'],
    queryFn: () => fetchPresets('exercise'),
  })

  // Get editable schedule for a template: prefer local edits → DB → hardcoded
  const getSchedule = (tpl: WorkoutTpl): ScheduleMap => {
    if (localSchedules[tpl.id]) return localSchedules[tpl.id]
    const dbRow = savedPresets.find(r => r.id === tpl.id)
    const dbSchedule = (dbRow?.data as any)?.scheduleMap
    if (dbSchedule && typeof dbSchedule === 'object' && Object.keys(dbSchedule).length > 0) {
      return dbSchedule as ScheduleMap
    }
    return tpl.scheduleMap as unknown as ScheduleMap
  }

  // Build image map from DB: `${templateId}-${exerciseName}` → imageUrl
  const imageMap: Record<string, string> = {}
  for (const row of savedPresets) {
    for (const ex of ((row.data as any)?.exercises ?? [])) {
      if (ex.key && ex.imageUrl) imageMap[ex.key] = ex.imageUrl
    }
  }

  const handleImageUpload = async (template: WorkoutTpl, exName: string, file: File) => {
    const key = `${template.id}-${exName}`
    setUploadingKey(key)
    try {
      const url = await uploadPresetImage(key.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, ''), file)
      const existing = savedPresets.find(r => r.id === template.id)
      const exercises: any[] = existing ? [...((existing.data as any).exercises ?? [])] : []
      const idx = exercises.findIndex((e: any) => e.key === key)
      if (idx >= 0) exercises[idx] = { ...exercises[idx], imageUrl: url }
      else exercises.push({ key, name: exName, imageUrl: url })
      await upsertPreset({
        id: template.id, type: 'exercise',
        name: template.name, name_am: null,
        description: template.description, description_am: null,
        tags: template.tags, tags_am: null,
        target_goals: template.goal === 'fat' ? ['fat'] : template.goal === 'muscle' ? ['muscle','strength'] : ['strength'],
        target_bmi_categories: template.goal === 'fat' ? ['overweight','obese'] : ['underweight'],
        image_url: existing?.image_url ?? null,
        data: { ...((existing?.data as object) ?? {}), exercises },
      })
      await qc.refetchQueries({ queryKey: ['presets', 'exercise'] })
      toast.success(`Image saved for ${exName}`)
    } catch (e) { toast.error((e as Error).message) }
    finally { setUploadingKey(null) }
  }

  const mutateSchedule = (tpl: WorkoutTpl, fn: (s: ScheduleMap) => ScheduleMap) => {
    const current = getSchedule(tpl)
    const next = fn(JSON.parse(JSON.stringify(current)))
    setLocalSchedules(prev => ({ ...prev, [tpl.id]: next }))
  }

  const toggleSelect = (key: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const toggleSelectDay = (tplId: string, dayName: string, exCount: number) => {
    const keys = Array.from({ length: exCount }, (_, i) => `${tplId}|${dayName}|${i}`)
    const all = keys.every(k => selected.has(k))
    setSelected(prev => { const n = new Set(prev); keys.forEach(k => all ? n.delete(k) : n.add(k)); return n })
  }

  const bulkDeleteFromTpl = (tpl: WorkoutTpl) => {
    const tplSelected = [...selected].filter(k => k.startsWith(`${tpl.id}|`))
    if (!tplSelected.length) return
    const groups: Record<string, number[]> = {}
    for (const key of tplSelected) {
      const [, day, idx] = key.split('|')
      if (!groups[day]) groups[day] = []
      groups[day].push(Number(idx))
    }
    mutateSchedule(tpl, s => {
      for (const [day, indices] of Object.entries(groups)) {
        const sorted = [...indices].sort((a, b) => b - a)
        for (const i of sorted) s[day].splice(i, 1)
      }
      return s
    })
    setSelected(prev => { const n = new Set(prev); tplSelected.forEach(k => n.delete(k)); return n })
  }

  const saveSchedule = async (tpl: WorkoutTpl) => {
    const schedule = getSchedule(tpl)
    setSavingId(tpl.id)
    try {
      const existing = savedPresets.find(r => r.id === tpl.id)
      const existingExercises = (existing?.data as any)?.exercises ?? []
      await upsertPreset({
        id: tpl.id, type: 'exercise',
        name: tpl.name, name_am: null,
        description: tpl.description, description_am: null,
        tags: tpl.tags, tags_am: null,
        target_goals: tpl.goal === 'fat' ? ['fat'] : tpl.goal === 'muscle' ? ['muscle','strength'] : ['strength'],
        target_bmi_categories: tpl.goal === 'fat' ? ['overweight','obese'] : ['underweight'],
        image_url: existing?.image_url ?? null,
        data: { exercises: existingExercises, scheduleMap: schedule },
      })
      await qc.refetchQueries({ queryKey: ['presets', 'exercise'] })
      setLocalSchedules(prev => { const n = { ...prev }; delete n[tpl.id]; return n })
      toast.success('Template saved')
    } catch (e) { toast.error((e as Error).message) }
    finally { setSavingId(null) }
  }

  const filtered = WORKOUT_TEMPLATES.filter(t => {
    if (goalFilter !== 'all' && t.goal !== goalFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = t.name.toLowerCase().includes(q)
      const schedule = getSchedule(t)
      const exMatch = Object.values(schedule).flat().some((ex: TplExercise) => ex.name.toLowerCase().includes(q))
      if (!nameMatch && !exMatch) return false
    }
    return true
  })

  const ipt = 'h-7 text-xs px-1.5 rounded border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

  return (
    <div className="space-y-5 pt-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
          {(['all','muscle','strength','fat'] as const).map(v => (
            <button key={v} onClick={() => setGoalFilter(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${goalFilter === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {v === 'fat' && <Flame className="h-3.5 w-3.5 text-orange-400" />}
              {(v === 'muscle' || v === 'strength') && <Dumbbell className="h-3.5 w-3.5 text-blue-400" />}
              {v === 'all' ? 'All Plans' : v === 'fat' ? 'Weight Loss' : v === 'muscle' ? 'Muscle Gain' : 'Strength'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search templates or exercises…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} templates</span>
      </div>

      {/* Template cards */}
      <div className="space-y-4">
        {filtered.map(tpl => {
          const isExpanded = expandedId === tpl.id
          const schedule = getSchedule(tpl)
          const isDirty = !!localSchedules[tpl.id]
          const isSaving = savingId === tpl.id
          const totalExercises = Object.values(schedule).flat().length
          const isFat = tpl.goal === 'fat'
          const GoalIcon = isFat ? Flame : Dumbbell
          const goalColor = isFat ? 'text-orange-400' : 'text-blue-400'
          const goalBg = isFat ? 'border-orange-500/30 bg-orange-500/10' : 'border-blue-500/30 bg-blue-500/10'

          return (
            <div key={tpl.id} className="rounded-xl border border-border overflow-hidden">
              {/* Card header */}
              <div className="flex items-start gap-2 px-4 py-3 bg-muted/20">
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                  className="flex items-start gap-3 flex-1 text-left">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg border ${goalBg} flex-shrink-0 mt-0.5`}>
                    <GoalIcon className={`h-5 w-5 ${goalColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{tpl.name}</span>
                      {tpl.tags.map(tag => <Badge key={tag} variant="default" className="text-[10px] px-1.5 py-0 h-4">{tag}</Badge>)}
                      {isDirty && <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4">Unsaved</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{Object.keys(schedule).length} days · {totalExercises} exercises</p>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                  {isDirty && (
                    <button onClick={() => saveSchedule(tpl)} disabled={isSaving}
                      className="flex items-center gap-1 h-7 px-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50">
                      {isSaving ? <Spinner size="sm" /> : <Check className="h-3.5 w-3.5" />} Save
                    </button>
                  )}
                  {isDirty && (
                    <button onClick={() => setLocalSchedules(prev => { const n={...prev}; delete n[tpl.id]; return n })}
                      className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted" title="Discard changes">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setExpandedId(null)} />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setExpandedId(tpl.id)} />}
                </div>
              </div>

              {/* Expanded days */}
              {isExpanded && (
                <div className="divide-y divide-border/40">
                  {/* Bulk action bar for this template */}
                  {[...selected].some(k => k.startsWith(`${tpl.id}|`)) && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
                      <span className="text-sm font-medium text-destructive">
                        {[...selected].filter(k => k.startsWith(`${tpl.id}|`)).length} exercise{[...selected].filter(k => k.startsWith(`${tpl.id}|`)).length > 1 ? 's' : ''} selected
                      </span>
                      <button onClick={() => bulkDeleteFromTpl(tpl)}
                        className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90">
                        <Trash2 className="h-3.5 w-3.5" /> Delete selected
                      </button>
                      <button onClick={() => setSelected(prev => { const n = new Set(prev); [...prev].filter(k => k.startsWith(`${tpl.id}|`)).forEach(k => n.delete(k)); return n })}
                        className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>
                    </div>
                  )}

                  {Object.entries(schedule).map(([dayName, exercises], dayIdx) => {
                    const dayCount = Object.keys(schedule).length
                    const dayKeys = exercises.map((_, i) => `${tpl.id}|${dayName}|${i}`)
                    const allDaySel = dayKeys.length > 0 && dayKeys.every(k => selected.has(k))
                    const someDaySel = dayKeys.some(k => selected.has(k))
                    return (
                      <div key={dayName}>
                        {/* Day header */}
                        <div className="px-4 py-2 bg-muted/10 flex items-center gap-2">
                          {exercises.length > 0 && (
                            <input type="checkbox" checked={allDaySel}
                              ref={el => { if (el) el.indeterminate = someDaySel && !allDaySel }}
                              onChange={() => toggleSelectDay(tpl.id, dayName, exercises.length)}
                              className="w-3.5 h-3.5 rounded border-border cursor-pointer" />
                          )}
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dayName}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{exercises.length} exercises</Badge>
                          <div className="ml-auto flex items-center gap-1">
                            {dayCount > 1 && (
                              <button onClick={() => mutateSchedule(tpl, s => { const n={...s}; delete n[dayName]; return n })}
                                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete day">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Exercise rows */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-border/30 bg-muted/5">
                              <th className="px-3 py-1.5 w-8"></th>
                              <th className="px-3 py-1.5 w-12 text-left text-xs font-medium text-muted-foreground">Img</th>
                              <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Exercise</th>
                              <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground w-14">Sets</th>
                              <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground w-16">Reps</th>
                              <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground w-14 hidden sm:table-cell">Rest</th>
                              <th className="px-3 py-1.5 w-20"></th>
                            </tr></thead>
                            <tbody className="divide-y divide-border/20">
                              {exercises.map((ex, exIdx) => {
                                const imgKey = `${tpl.id}-${ex.name}`
                                const selKey = `${tpl.id}|${dayName}|${exIdx}`
                                return (
                                  <ExerciseRowSelectable
                                    key={exIdx}
                                    ex={ex}
                                    imgUrl={ex.imageUrl ?? imageMap[imgKey]}
                                    uploading={uploadingKey === imgKey}
                                    selected={selected.has(selKey)}
                                    onToggleSelect={() => toggleSelect(selKey)}
                                    isFirst={exIdx === 0}
                                    isLast={exIdx === exercises.length - 1}
                                    onUploadImage={f => handleImageUpload(tpl, ex.name, f)}
                                    onSave={updated => mutateSchedule(tpl, s => { s[dayName][exIdx] = updated; return s })}
                                    onDelete={() => mutateSchedule(tpl, s => { s[dayName] = s[dayName].filter((_,i) => i !== exIdx); return s })}
                                    onMoveUp={() => mutateSchedule(tpl, s => { const a=[...s[dayName]]; [a[exIdx-1],a[exIdx]]=[a[exIdx],a[exIdx-1]]; s[dayName]=a; return s })}
                                    onMoveDown={() => mutateSchedule(tpl, s => { const a=[...s[dayName]]; [a[exIdx],a[exIdx+1]]=[a[exIdx+1],a[exIdx]]; s[dayName]=a; return s })}
                                  />
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Add exercise */}
                        <div className="px-4 py-2 border-t border-border/20">
                          <button onClick={() => mutateSchedule(tpl, s => {
                            s[dayName] = [...s[dayName], { name: 'New Exercise', sets: '3', reps: '10', rest: '60s' }]; return s
                          })} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">
                            <Plus className="h-3.5 w-3.5" /> Add exercise to {dayName}
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add day */}
                  <div className="px-4 py-3 bg-muted/5">
                    {addingDay?.tplId === tpl.id ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus placeholder="Day name (e.g. Day D)" value={addingDay.name}
                          onChange={e => setAddingDay({ tplId: tpl.id, name: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const n = addingDay.name.trim()
                              if (n) mutateSchedule(tpl, s => { s[n] = []; return s })
                              setAddingDay(null)
                            } else if (e.key === 'Escape') setAddingDay(null)
                          }}
                          className={`${ipt} w-48`} />
                        <button onClick={() => {
                          const n = addingDay.name.trim()
                          if (n) mutateSchedule(tpl, s => { s[n] = []; return s })
                          setAddingDay(null)
                        }} className="h-7 w-7 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setAddingDay(null)} className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingDay({ tplId: tpl.id, name: '' })}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Add day
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No templates match the current filters.</div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function WorkoutsPage() {
  const [activeTab, setActiveTab] = useState('library')
  return (
    <PageShell title="Workouts" description="Manage preset exercise library and workout templates." icon={Dumbbell}>
      <Tabs tabs={PAGE_TABS} active={activeTab} onChange={setActiveTab} />
      <TabPanel id="library"   active={activeTab}><ExerciseLibraryTab /></TabPanel>
      <TabPanel id="templates" active={activeTab}><WorkoutTemplatesTab /></TabPanel>
    </PageShell>
  )
}
