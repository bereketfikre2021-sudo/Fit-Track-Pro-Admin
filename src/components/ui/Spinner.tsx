import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizes = {
  sm: 'h-4 w-4 border',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-2',
}

export function Spinner({ size = 'md', className, label = 'Loading…' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={cn(
        'rounded-full border-primary border-t-transparent animate-spin',
        sizes[size],
        className,
      )}
    />
  )
}
