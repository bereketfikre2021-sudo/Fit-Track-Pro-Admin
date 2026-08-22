/**
 * AdminLayout.tsx
 * Three-column layout: left sidebar + main content + right notifications panel.
 * Both sidebars are collapsible. Main content always gets the remaining space.
 */

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { RightPanel } from './RightPanel'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cn } from '@/lib/utils'

export function AdminLayout() {
  const [leftCollapsed,  setLeftCollapsed]  = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [mobileOpen,     setMobileOpen]     = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Left sidebar */}
      <Sidebar
        collapsed={leftCollapsed}
        onCollapse={setLeftCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Right panel */}
      <RightPanel
        collapsed={rightCollapsed}
        onCollapse={setRightCollapsed}
      />

      {/* Top nav */}
      <TopNav
        onMobileMenuOpen={() => setMobileOpen(true)}
        sidebarCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
      />

      {/*
        Main content area.
        Left offset  = sidebar width:  w-16 (64px) collapsed | w-60 (240px) expanded
        Right offset = right panel:    w-10 (40px) collapsed | w-72 (288px) expanded
        These match the exact Tailwind widths used in Sidebar and RightPanel.
        On < lg screens both panels are hidden/overlaid so no offset needed.
      */}
      <main
        id="main-content"
        className={cn(
          'min-h-screen pt-14 transition-all duration-200 ease-in-out',
          // left offset
          leftCollapsed ? 'lg:pl-16' : 'lg:pl-60',
          // right offset
          rightCollapsed ? 'lg:pr-10' : 'lg:pr-72',
        )}
      >
        {/* min-w-0 prevents flex children from overflowing */}
        <div className="p-4 md:p-6 min-w-0 w-full">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
