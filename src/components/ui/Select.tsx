import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id ?? props.name
    return (
      <label className="flex w-full flex-col gap-1.5 text-sm">
        {label ? <span className="font-medium text-text-primary">{label}</span> : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20',
            error && 'border-danger',
            className,
          )}
          {...props}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </label>
    )
  },
)

Select.displayName = 'Select'
