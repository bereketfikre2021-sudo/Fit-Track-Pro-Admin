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
import { Dumbbell, Search, ImageIcon, Flame, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/Badge'
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
type TplExercise = { name: string; sets: string; reps: string; rest: string }

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

type LibraryEx = typeof PRESET_EXERCISES[0]

const WEIGHT_PLAN_GOALS: Record<string, string[]> = {
  'weight-gain': ['Muscle Gain', 'Strength', 'General Fitness'],
  'weight-loss': ['Weight Loss', 'General Fitness'],
}

// ── Shared image thumbnail for exercise rows ──────────────────────────────────
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

// ── Tab 1: Exercise Library ────────────────────────────────────────────────────
function ExerciseLibraryTab() {
  const qc = useQueryClient()
  const [weightFilter, setWeightFilter] = useState<'all' | 'weight-gain' | 'weight-loss'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Strength' | 'Cardio' | 'Mobility'>('all')
  const [search, setSearch] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const { data: savedPresets = [] } = useQuery({
    queryKey: ['presets', 'exercise'],
    queryFn: () => fetchPresets('exercise'),
  })

  // Build image map from saved preset rows keyed by exercise id
  const imageMap: Record<string, string> = {}
  for (const row of savedPresets) {
    for (const ex of ((row.data as any)?.exercises ?? [])) {
      if (ex.id && ex.imageUrl) imageMap[ex.id] = ex.imageUrl
    }
  }

  const handleImageUpload = async (ex: LibraryEx, file: File) => {
    setUploadingId(ex.id)
    try {
      const url = await uploadPresetImage(`library-${ex.id}`, file)
      const planId = ex.goals.includes('Weight Loss') && !ex.goals.includes('Muscle Gain')
        ? 'exercise-weight-loss' : 'exercise-weight-gain'
      const existing = savedPresets.find(r => r.id === planId)
      const exercises: any[] = existing ? [...((existing.data as any).exercises ?? [])] : []
      const idx = exercises.findIndex((e: any) => e.id === ex.id)
      if (idx >= 0) exercises[idx] = { ...exercises[idx], imageUrl: url }
      else exercises.push({ id: ex.id, name: ex.name, imageUrl: url })
      await upsertPreset({
        id: planId, type: 'exercise',
        name: planId === 'exercise-weight-gain' ? 'Weight Gain Exercises' : 'Weight Loss Exercises',
        name_am: null, description: null, description_am: null, tags: null, tags_am: null,
        target_goals: planId === 'exercise-weight-gain' ? ['muscle','strength'] : ['fat'],
        target_bmi_categories: planId === 'exercise-weight-gain' ? ['underweight'] : ['overweight','obese'],
        image_url: null, data: { exercises },
      })
      qc.invalidateQueries({ queryKey: ['presets', 'exercise'] })
      toast.success(`Image saved for ${ex.name}`)
    } catch (e) { toast.error((e as Error).message) }
    finally { setUploadingId(null) }
  }

  const filtered = PRESET_EXERCISES.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter !== 'all' && ex.category !== categoryFilter) return false
    if (weightFilter !== 'all') {
      const allowed = WEIGHT_PLAN_GOALS[weightFilter] ?? []
      if (!ex.goals.some(g => allowed.includes(g))) return false
    }
    return true
  })

  const groups = (['Strength','Cardio','Mobility'] as const)
    .map(cat => ({ category: cat, items: filtered.filter(e => e.category === cat) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="space-y-5 pt-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
          {(['all','weight-gain','weight-loss'] as const).map(v => (
            <button key={v} onClick={() => setWeightFilter(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${weightFilter === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {v === 'weight-gain' && <Dumbbell className="h-3.5 w-3.5 text-blue-400" />}
              {v === 'weight-loss' && <Flame className="h-3.5 w-3.5 text-orange-400" />}
              {v === 'all' ? 'All Plans' : v === 'weight-gain' ? 'Weight Gain' : 'Weight Loss'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
          {(['all','Strength','Cardio','Mobility'] as const).map(v => (
            <button key={v} onClick={() => setCategoryFilter(v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${categoryFilter === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {v === 'all' ? 'All' : v}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="search" placeholder="Search exercises…" value={search} onChange={e => setSearch(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} exercises</span>
      </div>

      {/* Grouped tables */}
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group.category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {group.category} · {group.items.length}
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2.5 w-12"></th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Exercise</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Muscle</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Equipment</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Difficulty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Sets/Reps</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Plans</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {group.items.map(ex => (
                    <tr key={ex.id} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <ExThumbnail url={imageMap[ex.id]} uploading={uploadingId === ex.id}
                          title={`Upload image for ${ex.name}`} onUpload={(f) => handleImageUpload(ex, f)} />
                      </td>
                      <td className="px-4 py-2.5 font-medium">{ex.name}</td>
                      <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{ex.muscleGroup}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground">{ex.equipment}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={DIFF_BADGE[ex.difficulty.toLowerCase()] ?? 'outline'}>{ex.difficulty}</Badge>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell text-muted-foreground text-xs">{ex.sets} × {ex.reps}</td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(ex.goals.includes('Muscle Gain') || ex.goals.includes('Strength')) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">Gain</span>
                          )}
                          {ex.goals.includes('Weight Loss') && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">Loss</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No exercises match the current filters.</div>
        )}
      </div>
    </div>
  )
}

// ── Tab 2: Workout Templates ──────────────────────────────────────────────────
function WorkoutTemplatesTab() {
  const qc = useQueryClient()
  const [goalFilter, setGoalFilter] = useState<'all' | 'muscle' | 'strength' | 'fat'>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>('full-body')
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  const { data: savedPresets = [] } = useQuery({
    queryKey: ['presets', 'exercise'],
    queryFn: () => fetchPresets('exercise'),
  })

  // Build image map: `${templateId}-${exerciseName}` → imageUrl
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
      qc.invalidateQueries({ queryKey: ['presets', 'exercise'] })
      toast.success(`Image saved for ${exName}`)
    } catch (e) { toast.error((e as Error).message) }
    finally { setUploadingKey(null) }
  }

  const filtered = WORKOUT_TEMPLATES.filter(t => {
    if (goalFilter !== 'all' && t.goal !== goalFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const nameMatch = t.name.toLowerCase().includes(q)
      const exMatch = Object.values(t.scheduleMap).flat().some((ex: TplExercise) => ex.name.toLowerCase().includes(q))
      if (!nameMatch && !exMatch) return false
    }
    return true
  })

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
          const totalExercises = Object.values(tpl.scheduleMap).flat().length
          const isFat = tpl.goal === 'fat'
          const GoalIcon = isFat ? Flame : Dumbbell
          const goalColor = isFat ? 'text-orange-400' : 'text-blue-400'
          const goalBg = isFat ? 'border-orange-500/30 bg-orange-500/10' : 'border-blue-500/30 bg-blue-500/10'

          return (
            <div key={tpl.id} className="rounded-xl border border-border overflow-hidden">
              {/* Card header — click to expand */}
              <button type="button" onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                className="w-full flex items-start justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition-colors text-left">
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg border ${goalBg} flex-shrink-0 mt-0.5`}>
                    <GoalIcon className={`h-5 w-5 ${goalColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{tpl.name}</span>
                      {tpl.tags.map(tag => (
                        <Badge key={tag} variant="default" className="text-[10px] px-1.5 py-0 h-4">{tag}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Object.keys(tpl.scheduleMap).length} days · {totalExercises} exercises
                    </p>
                  </div>
                </div>
                {isExpanded
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />}
              </button>

              {/* Expanded: each day → exercise table with sets/reps/rest */}
              {isExpanded && (
                <div className="divide-y divide-border/40">
                  {Object.entries(tpl.scheduleMap).map(([dayName, exercises]) => (
                    <div key={dayName}>
                      <div className="px-4 py-2 bg-muted/10 flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{dayName}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{(exercises as TplExercise[]).length} exercises</Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border/30 bg-muted/5">
                            <th className="px-3 py-1.5 w-12 text-left text-xs font-medium text-muted-foreground">Image</th>
                            <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Exercise</th>
                            <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground w-14">Sets</th>
                            <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground w-16">Reps</th>
                            <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground w-14 hidden sm:table-cell">Rest</th>
                          </tr></thead>
                          <tbody className="divide-y divide-border/20">
                            {(exercises as TplExercise[]).map((ex, i) => {
                              const key = `${tpl.id}-${ex.name}`
                              return (
                                <tr key={i} className="hover:bg-muted/20">
                                  <td className="px-3 py-2">
                                    <ExThumbnail url={imageMap[key]} uploading={uploadingKey === key}
                                      title={`Upload image for ${ex.name}`} onUpload={(f) => handleImageUpload(tpl, ex.name, f)} />
                                  </td>
                                  <td className="px-3 py-2 font-medium text-sm">{ex.name}</td>
                                  <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums">{ex.sets}</td>
                                  <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums">{ex.reps}</td>
                                  <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums hidden sm:table-cell">{ex.rest}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
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
