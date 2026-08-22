/**
 * TopNav.tsx
 * Minimal top bar — breadcrumb only.
 * Adjusts left/right offsets to match both sidebar widths.
 */

import { Menu } from 'lucide-react'
import { Breadcrumbs } from './Breadcrumbs'
import { cn } from '@/lib/utils'

interface TopNavProps {
  onMobileMenuOpen: () => void
  sidebarCollapsed: boolean
  rightCollapsed?: boolean
}

export function TopNav({ onMobileMenuOpen, sidebarCollapsed, rightCollapsed = false }: TopNavProps) {
  return (
    <header
      className={cn(
        'fixed top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm',
        'flex items-center gap-3 px-4 transition-all duration-200 ease-in-out',
        // left edge tracks left sidebar
        sidebarCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-60',
        // right edge tracks right panel
        rightCollapsed   ? 'right-0 lg:right-10' : 'right-0 lg:right-72',
      )}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* Date */}
      <span className="hidden sm:block text-xs text-muted-foreground shrink-0">
        {new Date().toLocaleDateString('en-ET', { weekday: 'short', month: 'short', day: 'numeric' })}
      </span>
    </header>
  )
}
