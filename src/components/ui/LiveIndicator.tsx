import { cn } from '@/utils/cn'

interface LiveIndicatorProps {
  title?: string
  className?: string
  size?: 'sm' | 'md'
}

export function LiveIndicator({
  title = 'En curso',
  className,
  size = 'sm',
}: LiveIndicatorProps) {
  const dot = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'

  return (
    <span className={cn('relative flex shrink-0', dot, className)} title={title}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
      <span className={cn('relative inline-flex rounded-full bg-primary', dot)} />
    </span>
  )
}

interface LiveBadgeProps {
  label?: string
  className?: string
}

export function LiveBadge({ label = 'Repartiendo en vivo', className }: LiveBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-hover ring-1 ring-primary/20',
        className,
      )}
    >
      <LiveIndicator title={label} />
      {label}
    </span>
  )
}
