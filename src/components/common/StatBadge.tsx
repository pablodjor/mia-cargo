import { Badge } from '@/components/ui/Badge'
import { formatArs } from '@/utils/money'

type StatTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

export function StatBadge({
  value,
  tone = 'neutral',
  label,
}: {
  value: number
  tone?: StatTone
  label?: string
}) {
  if (value <= 0) {
    return <span className="text-xs text-text-muted">—</span>
  }

  return (
    <Badge tone={tone}>
      {label ?? value}
    </Badge>
  )
}

export function MoneyBadge({ value, tone }: { value: number; tone: StatTone }) {
  if (value <= 0) {
    return <span className="text-xs text-text-muted">—</span>
  }

  return <Badge tone={tone}>{formatArs(value)}</Badge>
}

export function personInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
