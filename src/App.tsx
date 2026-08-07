/**
 * App.tsx — Admin Dashboard entry
 *
 * Router structure:
 *   /login          → LoginPage (public)
 *   /unauthorized   → UnauthorizedPage (public)
 *   /*              → AdminRouteGuard → AdminLayout → pages
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AdminRouteGuard } from '@/components/guards/AdminRouteGuard'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt'
import { LoginPage } from '@/pages/auth/LoginPage'
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { UsersPage } from '@/pages/UsersPage'
import { UserDetailPage } from '@/pages/UserDetailPage'
import { SubscriptionsPage } from '@/pages/SubscriptionsPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { NutritionPage } from '@/pages/NutritionPage'
import { ExercisesPage } from '@/pages/ExercisesPage'
import { AiUsagePage } from '@/pages/AiUsagePage'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { RolesPage } from '@/pages/RolesPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            {/* Global toast notifications */}
            <Toaster
              position="top-right"
              expand={false}
              richColors
              closeButton
            />

            <ErrorBoundary>
              <PwaInstallPrompt />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Protected admin routes */}
                <Route element={<AdminRouteGuard />}>
                  <Route element={<AdminLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard"     element={<DashboardPage />} />
                    <Route path="/users"         element={<UsersPage />} />
                    <Route path="/users/:userId" element={<UserDetailPage />} />
                    <Route path="/subscriptions" element={<SubscriptionsPage />} />
                    <Route path="/payments"      element={<PaymentsPage />} />
                    <Route path="/workouts"      element={<WorkoutsPage />} />
                    <Route path="/nutrition"     element={<NutritionPage />} />
                    <Route path="/exercises"     element={<ExercisesPage />} />
                    <Route path="/ai-usage"      element={<AiUsagePage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/reports"       element={<ReportsPage />} />
                    <Route path="/settings"      element={<SettingsPage />} />
                    <Route path="/roles"         element={<RolesPage />} />
                    <Route path="/profile"       element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
