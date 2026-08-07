/**
 * ExercisesPage.tsx
 * Redirects to the Workout Administration page (exercises tab).
 * The full exercise management is now part of WorkoutsPage.
 */

import { Navigate } from 'react-router-dom'

export function ExercisesPage() {
  return <Navigate to="/workouts" replace />
}
