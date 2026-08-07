import { Menu, Sun, Moon, Monitor } from 'lucide-react'
import { Breadcrumbs } from './Breadcrumbs'
import { UserMenu } from './UserMenu'
import { useTheme, type Theme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface TopNavProps {
  onMobileMenuOpen: () => void
  sidebarCollapsed: boolean
}

const THEMES: { value: Theme; icon: React.ElementType; label: string }[] = [
  { value: 'light',  icon: Sun,     label: 'Light' },
  { value: 'dark',   icon: Moon,    label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
]

export function TopNav({ onMobileMenuOpen, sidebarCollapsed }: TopNavProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-sm',
        'flex items-center gap-3 px-4 transition-[left] duration-200 ease-in-out',
        // Match sidebar width
        sidebarCollapsed ? 'left-16' : 'left-0 lg:left-60',
      )}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <Breadcrumbs />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        {/* Theme switcher */}
        <div
          className="hidden sm:flex items-center rounded-md border border-border bg-secondary p-0.5 gap-0.5"
          role="group"
          aria-label="Choose theme"
        >
          {THEMES.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              aria-label={`${label} theme`}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded transition-colors',
                theme === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
