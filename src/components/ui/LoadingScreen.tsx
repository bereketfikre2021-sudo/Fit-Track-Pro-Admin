/** Full-screen loading spinner used during auth checks and lazy-loaded pages. */
export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
