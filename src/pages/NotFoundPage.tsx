import { useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="rounded-full bg-muted p-5">
        <FileQuestion className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-5xl font-bold text-muted-foreground/30">404</h1>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
      <Button
        variant="outline"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => navigate('/dashboard')}
      >
        Back to Dashboard
      </Button>
    </div>
  )
}
