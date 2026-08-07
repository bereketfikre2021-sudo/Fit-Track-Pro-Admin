import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number          // 0-indexed
  pageSize: number
  total: number
  onChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  if (total === 0) return null

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-sm">
      <p className="text-muted-foreground" aria-live="polite" aria-atomic="true">
        {`${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          aria-label="Go to previous page"
          aria-disabled={page === 0}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors',
            page === 0
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-secondary',
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Page numbers */}
        {Array.from({ length: totalPages }, (_, i) => i)
          .filter((i) => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1)
          .reduce<(number | '...')[]>((acc, i, idx, arr) => {
            if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('...')
            acc.push(i)
            return acc
          }, [])
          .map((item, idx) =>
            item === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground" aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                onClick={() => onChange(item as number)}
                aria-label={`Go to page ${(item as number) + 1}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                  item === page
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-secondary',
                )}
              >
                {(item as number) + 1}
              </button>
            ),
          )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Go to next page"
          aria-disabled={page >= totalPages - 1}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors',
            page >= totalPages - 1
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:bg-secondary',
          )}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
