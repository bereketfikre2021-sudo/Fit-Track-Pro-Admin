import { type ClassValue, clsx } from 'clsx'

/**
 * Merges Tailwind class names safely using clsx.
 * Kept minimal — no tailwind-merge dependency to avoid version mismatch.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Format a UTC timestamp as a readable local date string. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Format a UTC timestamp as date + time. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format a USD amount. */
export function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents)
}

/** Truncate a string to `max` characters. */
export function truncate(str: string, max = 40): string {
  return str.length <= max ? str : str.slice(0, max) + '…'
}
