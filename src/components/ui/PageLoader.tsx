import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PageLoaderProps {
  className?: string
  label?: string
  fullScreen?: boolean
}

export function PageLoader({
  className,
  label = 'Cargando…',
  fullScreen = false,
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-3',
        fullScreen ? 'min-h-screen' : 'min-h-[60vh]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
      {label ? <p className="text-sm font-medium text-text-secondary">{label}</p> : null}
    </div>
  )
}
