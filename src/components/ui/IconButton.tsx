import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  variant?: 'ghost' | 'outline' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, className, variant = 'ghost', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors',
        variant === 'ghost' && 'text-text-secondary hover:bg-secondary-light hover:text-text-primary',
        variant === 'outline' && 'border border-border bg-surface text-text-secondary hover:bg-secondary-light',
        variant === 'danger' && 'text-danger hover:bg-danger-light',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
