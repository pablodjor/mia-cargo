import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const areaId = id ?? props.name
    return (
      <label className="flex w-full flex-col gap-1.5 text-sm">
        {label ? <span className="font-medium text-text-primary">{label}</span> : null}
        <textarea
          ref={ref}
          id={areaId}
          className={cn(
            'min-h-24 w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20',
            error && 'border-danger',
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </label>
    )
  },
)

Textarea.displayName = 'Textarea'
