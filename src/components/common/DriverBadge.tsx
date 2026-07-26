import { UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'

function driverInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

interface DriverBadgeProps {
  name?: string | null
  active?: boolean
  className?: string
}

export function DriverBadge({ name, active = false, className }: DriverBadgeProps) {
  if (!name) {
    return (
      <Badge tone="neutral" className={className}>
        Sin chofer
      </Badge>
    )
  }

  const initials = driverInitials(name) || '?'

  return (
    <span
      className={cn(
        'inline-flex max-w-[168px] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-semibold',
        active
          ? 'bg-primary-light text-primary-hover ring-1 ring-primary/20'
          : 'bg-secondary-light text-secondary ring-1 ring-secondary/10',
        className,
      )}
      title={name}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          active ? 'bg-primary text-white' : 'bg-secondary text-white',
        )}
      >
        {initials.length >= 2 ? initials : <UserRound className="h-3.5 w-3.5" />}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}
