import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { addDaysISODate, formatDateShort, todayISODate } from '@/utils/date'
import { cn } from '@/utils/cn'

interface DatePeriodFilterProps {
  value: string
  onChange: (value: string) => void
  className?: string
  /** Si true, el selector de fecha permite días futuros (p. ej. repartos programados). */
  allowFutureDates?: boolean
}

export function DatePeriodFilter({
  value,
  onChange,
  className,
  allowFutureDates = false,
}: DatePeriodFilterProps) {
  const today = todayISODate()
  const yesterday = addDaysISODate(-1)
  const isCustom = Boolean(value && value !== today && value !== yesterday)

  return (
    <div
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-[12px] border border-border bg-background/80 p-1',
        className,
      )}
    >
      <Button
        type="button"
        size="sm"
        variant={value === '' ? 'primary' : 'ghost'}
        className="h-8"
        onClick={() => onChange('')}
      >
        Todos
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === today ? 'primary' : 'ghost'}
        className="h-8"
        onClick={() => onChange(today)}
      >
        Hoy
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === yesterday ? 'primary' : 'ghost'}
        className="h-8"
        onClick={() => onChange(yesterday)}
      >
        Ayer
      </Button>

      <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" aria-hidden />

      <label
        className={cn(
          'relative inline-flex h-8 min-w-[7.5rem] cursor-pointer items-center gap-1.5 rounded-[8px] px-2.5 text-sm font-medium transition',
          isCustom
            ? 'bg-primary text-white shadow-sm'
            : 'text-text-secondary hover:bg-surface hover:text-text-primary',
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="truncate">{isCustom ? formatDateShort(value) : 'Elegir fecha'}</span>
        <input
          type="date"
          value={isCustom ? value : ''}
          max={allowFutureDates ? undefined : today}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value)
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Elegir fecha"
        />
      </label>
    </div>
  )
}

export function datePeriodFilterLabel(
  value: string,
  formatCustom: (iso: string) => string,
): string | null {
  if (!value) return null
  const today = todayISODate()
  const yesterday = addDaysISODate(-1)
  if (value === today) return 'hoy'
  if (value === yesterday) return 'ayer'
  return formatCustom(value)
}
