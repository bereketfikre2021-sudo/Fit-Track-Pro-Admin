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

/** Format an ETB (Ethiopian Birr) amount. */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Truncate a string to `max` characters. */
export function truncate(str: string, max = 40): string {
  return str.length <= max ? str : str.slice(0, max) + '…'
}
