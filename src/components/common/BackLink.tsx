import { ArrowLeft } from 'lucide-react'
import { Link, type To } from 'react-router-dom'
import { cn } from '@/utils/cn'

export function BackLink({
  to,
  label = 'Volver',
  className,
  variant = 'link',
}: {
  to: To
  label?: string
  className?: string
  variant?: 'link' | 'button'
}) {
  return (
    <Link
      to={to}
      className={cn(
        variant === 'button'
          ? 'inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-surface px-4 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary-light hover:text-primary-hover'
          : 'inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-hover',
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}
