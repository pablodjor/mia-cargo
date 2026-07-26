import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <label className="flex w-full flex-col gap-1.5 text-sm">
        {label ? <span className="font-medium text-text-primary">{label}</span> : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-danger">{error}</span> : null}
        {!error && hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
      </label>
    )
  },
)

Input.displayName = 'Input'
