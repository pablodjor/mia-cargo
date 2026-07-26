import { DRIVER_PREDEFINED_OBSERVATIONS } from '@/constants/driver-observations'
import { cn } from '@/utils/cn'

interface PredefinedObservationBadgesProps {
  value: string
  onSelect: (text: string) => void
  options?: readonly string[]
  className?: string
}

export function PredefinedObservationBadges({
  value,
  onSelect,
  options = DRIVER_PREDEFINED_OBSERVATIONS,
  className,
}: PredefinedObservationBadgesProps) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold text-text-muted">Observaciones rápidas</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.trim() === option
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={cn(
                'rounded-full px-3 py-1.5 text-left text-xs font-semibold transition',
                selected
                  ? 'bg-primary text-white shadow-sm ring-2 ring-primary/25'
                  : 'border border-border bg-surface text-text-primary hover:border-primary/40 hover:bg-primary-light',
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
