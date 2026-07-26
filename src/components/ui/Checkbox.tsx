import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <label className="inline-flex items-center gap-2 text-sm text-text-primary">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-border text-primary accent-primary focus:ring-primary',
            className,
          )}
          {...props}
        />
        <span>{label}</span>
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'
