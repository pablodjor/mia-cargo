import { forwardRef, type InputHTMLAttributes } from 'react'
import { Button } from '@/components/ui/Button'
import {
  addDaysISODate,
  formatDeliveryDateDisplay,
  todayISODate,
} from '@/utils/date'
import { cn } from '@/utils/cn'

interface DateFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string
  error?: string
  value: string
  onChange: (value: string) => void
  showQuickSelect?: boolean
}

export const DateField = forwardRef<HTMLInputElement, DateFieldProps>(
  ({ className, label, error, value, onChange, showQuickSelect = true, id, name, ...props }, ref) => {
    const inputId = id ?? name
    const today = todayISODate()

    return (
      <div className="flex w-full flex-col gap-1.5 text-sm">
        {label ? (
          <label htmlFor={inputId} className="font-medium text-text-primary">
            {label}
          </label>
        ) : null}

        <input
          ref={ref}
          id={inputId}
          name={name}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-10 w-full rounded-[10px] border border-border bg-surface px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className,
          )}
          {...props}
        />

        {value ? (
          <p className="mt-0.5 rounded-[10px] bg-primary-light px-3 py-2 text-sm font-medium text-primary-hover">
            {formatDeliveryDateDisplay(value)}
          </p>
        ) : null}

        {showQuickSelect ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {[
              { label: 'Hoy', date: today },
              { label: 'Mañana', date: addDaysISODate(1) },
              { label: 'Pasado mañana', date: addDaysISODate(2) },
            ].map((option) => (
              <Button
                key={option.date}
                type="button"
                size="sm"
                variant={value === option.date ? 'primary' : 'outline'}
                onClick={() => onChange(option.date)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        ) : null}

        {error ? <span className="text-xs text-danger">{error}</span> : null}
      </div>
    )
  },
)

DateField.displayName = 'DateField'
