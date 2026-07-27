import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'

interface PageLoadErrorProps {
  message: string
  onRetry: () => void
}

export function PageLoadError({ message, onRetry }: PageLoadErrorProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-light text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <Alert tone="danger" title="No se pudo cargar" className="max-w-md">
        {message}
      </Alert>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  )
}
