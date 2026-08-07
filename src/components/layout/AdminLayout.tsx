/**
 * AdminLayout.tsx
 * Root layout: sidebar + top nav + main content area.
 * Each page is wrapped in an ErrorBoundary to isolate crashes.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'

export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Top nav */}
      <TopNav
        onMobileMenuOpen={() => setMobileOpen(true)}
        sidebarCollapsed={collapsed}
      />

      {/* Main content — route-level error boundary isolates page crashes */}
      <main
        className={cn(
          'min-h-screen pt-14 transition-[padding-left] duration-200 ease-in-out',
          collapsed ? 'lg:pl-16' : 'lg:pl-60',
        )}
        id="main-content"
      >
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px]">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
