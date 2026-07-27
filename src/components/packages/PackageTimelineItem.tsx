import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  History,
  PackagePlus,
  PackageX,
  Pencil,
  RotateCcw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { Package } from '@/types'
import { formatDateTime } from '@/utils/date'
import type { PackageTimelineEvent, PackageTimelineKind } from '@/utils/package-timeline'
import { cn } from '@/utils/cn'

const KIND_META: Record<
  PackageTimelineKind,
  { icon: LucideIcon; accent: string; surface: string; ring: string }
> = {
  created: {
    icon: PackagePlus,
    accent: 'text-primary',
    surface: 'bg-primary-light/70',
    ring: 'ring-primary/15',
  },
  updated: {
    icon: Pencil,
    accent: 'text-text-secondary',
    surface: 'bg-background',
    ring: 'ring-border',
  },
  status: {
    icon: CircleDot,
    accent: 'text-info',
    surface: 'bg-info-light/60',
    ring: 'ring-info/15',
  },
  delivered: {
    icon: CheckCircle2,
    accent: 'text-success',
    surface: 'bg-success-light/80',
    ring: 'ring-success/20',
  },
  failed: {
    icon: PackageX,
    accent: 'text-danger',
    surface: 'bg-danger-light/70',
    ring: 'ring-danger/15',
  },
  rescheduled: {
    icon: CalendarClock,
    accent: 'text-warning',
    surface: 'bg-warning-light/70',
    ring: 'ring-warning/15',
  },
  reset: {
    icon: RotateCcw,
    accent: 'text-text-secondary',
    surface: 'bg-background',
    ring: 'ring-border',
  },
  other: {
    icon: History,
    accent: 'text-text-secondary',
    surface: 'bg-background',
    ring: 'ring-border',
  },
}

const OUTCOME_STYLE: Partial<
  Record<
    PackageTimelineKind,
    { card: string; icon: string; subtitle: string; connector: string }
  >
> = {
  failed: {
    card: 'rounded-[12px] border border-danger/25 bg-danger-light/50 p-3',
    icon: 'border-2 border-danger/25 bg-danger-light/80',
    subtitle: 'text-xs font-semibold text-danger',
    connector: 'bg-danger/25',
  },
  delivered: {
    card: 'rounded-[12px] border border-success/25 bg-success-light/60 p-3',
    icon: 'border-2 border-success/25 bg-success-light/80',
    subtitle: 'text-xs font-semibold text-success',
    connector: 'bg-success/25',
  },
  rescheduled: {
    card: 'rounded-[12px] border border-warning/25 bg-warning-light/55 p-3',
    icon: 'border-2 border-warning/25 bg-warning-light/80',
    subtitle: 'text-xs font-semibold text-warning',
    connector: 'bg-warning/25',
  },
}

interface PackageTimelineItemProps {
  event: PackageTimelineEvent
  isLast: boolean
  currentStatus?: Package['status']
}

function getOutcomeStyle(kind: PackageTimelineKind) {
  return OUTCOME_STYLE[kind]
}

export function PackageTimelineItem({
  event,
  isLast,
  currentStatus = 'pending',
}: PackageTimelineItemProps) {
  const isStaleDelivery =
    event.kind === 'delivered' && currentStatus !== 'delivered' && currentStatus !== 'cancelled'
  const meta = isStaleDelivery
    ? {
        ...KIND_META.other,
        icon: History,
      }
    : KIND_META[event.kind]
  const Icon = meta.icon
  const outcomeStyle = isStaleDelivery ? undefined : getOutcomeStyle(event.kind)

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div>
          {event.attemptNumber ? (
            <>
              <p className={cn('text-sm font-semibold', outcomeStyle ? meta.accent : 'text-text-primary')}>
                Intento {event.attemptNumber}
              </p>
              <p className={outcomeStyle?.subtitle ?? 'text-xs text-text-muted'}>{event.title}</p>
            </>
          ) : (
            <p className="text-sm font-semibold text-text-primary">
              {isStaleDelivery ? 'Entrega anterior (estado corregido)' : event.title}
            </p>
          )}
        </div>
        <time className="shrink-0 text-xs text-text-muted" dateTime={event.at}>
          {formatDateTime(event.at)}
        </time>
      </div>

      {event.detail ? (
        <p
          className={cn(
            'mt-1.5 text-sm leading-relaxed',
            outcomeStyle ? 'text-text-primary' : 'rounded-[10px] border border-border/70 bg-surface/80 px-3 py-2 text-text-primary',
          )}
        >
          {event.detail}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {event.deliveryCode ? (
          <Badge tone="neutral" className="font-mono text-[11px]">
            {event.deliveryCode}
          </Badge>
        ) : null}
        {event.userName ? (
          <span className="text-xs text-text-muted">por {event.userName}</span>
        ) : null}
      </div>
    </>
  )

  if (outcomeStyle) {
    return (
      <li className="relative pb-4 last:pb-0">
        {!isLast ? (
          <span
            className={cn('absolute top-11 left-[17px] h-[calc(100%-0.75rem)] w-px', outcomeStyle.connector)}
            aria-hidden
          />
        ) : null}

        <div className={cn('relative flex gap-3', outcomeStyle.card)}>
          <span
            className={cn(
              'relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              outcomeStyle.icon,
            )}
          >
            <Icon className={cn('h-4 w-4', meta.accent)} aria-hidden />
          </span>

          <div className="min-w-0 flex-1">{body}</div>
        </div>
      </li>
    )
  }

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!isLast ? (
        <span
          className="absolute top-10 left-[17px] h-[calc(100%-1.25rem)] w-px bg-border"
          aria-hidden
        />
      ) : null}

      <span
        className={cn(
          'relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1',
          meta.surface,
          meta.ring,
        )}
      >
        <Icon className={cn('h-4 w-4', meta.accent)} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">{body}</div>
    </li>
  )
}
