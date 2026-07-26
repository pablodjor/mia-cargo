import { useMemo } from 'react'
import { Link } from 'react-router-dom'
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
import { PackageDeliveryNote } from '@/components/driver/PackageDeliveryNote'
import { Badge } from '@/components/ui/Badge'
import { useAsyncData } from '@/hooks/useAsyncData'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { historyService } from '@/services/history.service'
import { settingsService } from '@/services/settings.service'
import type { Package } from '@/types'
import { formatDateTime } from '@/utils/date'
import { getPackageDeliveredBy } from '@/utils/package-delivery-info'
import {
  buildPackageTimeline,
  getPackageDeliveredAt,
  isOperationalPackageNote,
  type PackageTimelineEvent,
  type PackageTimelineKind,
} from '@/utils/package-timeline'
import { cn } from '@/utils/cn'

interface PackageActivitySectionProps {
  pkg: Package
  className?: string
}

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

function TimelineItem({
  event,
  isLast,
  currentStatus,
}: {
  event: PackageTimelineEvent
  isLast: boolean
  currentStatus: Package['status']
}) {
  const isStaleDelivery =
    event.kind === 'delivered' && currentStatus !== 'delivered' && currentStatus !== 'cancelled'
  const meta = isStaleDelivery
    ? {
        ...KIND_META.other,
        icon: History,
      }
    : KIND_META[event.kind]
  const Icon = meta.icon

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

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div>
            {event.attemptNumber ? (
              <>
                <p className="text-sm font-semibold text-text-primary">
                  Intento {event.attemptNumber}
                </p>
                <p className="text-xs text-text-muted">{event.title}</p>
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
          <p className="mt-1.5 rounded-[10px] border border-border/70 bg-surface/80 px-3 py-2 text-sm leading-relaxed text-text-primary">
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
      </div>
    </li>
  )
}

export function PackageActivitySection({ pkg, className }: PackageActivitySectionProps) {
  const { data: failureReasons = [] } = useAsyncData(() => settingsService.getFailureReasons(), [])
  const { data: history = [] } = useAsyncData(() => historyService.getAll(), [])
  const { data: deliveryContext } = useAsyncData(async () => {
    const [deliveries, drivers, couriers] = await Promise.all([
      deliveriesService.getAll(),
      driversService.getAll(),
      couriersService.getAll(),
    ])
    return { deliveries, drivers, couriers }
  }, [])

  const reasonById = useMemo(
    () => new Map((failureReasons ?? []).map((reason) => [reason.id, reason.label])),
    [failureReasons],
  )

  const deliveredBy = useMemo(() => {
    if (!deliveryContext || pkg.status !== 'delivered') return undefined
    return getPackageDeliveredBy(
      pkg,
      deliveryContext.deliveries,
      deliveryContext.drivers,
      deliveryContext.couriers,
    )
  }, [pkg, deliveryContext])

  const timeline = useMemo(
    () => buildPackageTimeline(pkg, history ?? [], reasonById),
    [pkg, history, reasonById],
  )

  const deliveredAt = deliveredBy?.deliveredAt ?? getPackageDeliveredAt(pkg)
  const operationalNote = isOperationalPackageNote(pkg.notes) ? pkg.notes : undefined

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Movimientos del paquete</h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Entregas, reprogramaciones, cambios de estado e incidencias.
          </p>
        </div>
        {timeline.length > 0 ? (
          <Badge tone="neutral">{timeline.length}</Badge>
        ) : null}
      </div>

      {deliveredAt || deliveredBy ? (
        <div className="flex items-start gap-3 rounded-[12px] border border-success/20 bg-success-light/80 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-success/20">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-wide text-success uppercase">
              Entregado
            </p>
            {deliveredAt ? (
              <p className="mt-1 text-sm font-semibold text-text-primary">
                {formatDateTime(deliveredAt)}
              </p>
            ) : null}
            {deliveredBy ? (
              <p className="mt-1.5 text-sm text-text-secondary">
                {deliveredBy.kind === 'driver' ? (
                  <>
                    Chofer <strong className="text-text-primary">{deliveredBy.name}</strong>
                  </>
                ) : (
                  <>
                    Correo <strong className="text-text-primary">{deliveredBy.name}</strong>
                  </>
                )}
                {' · '}
                <Link
                  to={`/deliveries/${deliveredBy.deliveryId}`}
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  {deliveredBy.deliveryCode}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {operationalNote ? <PackageDeliveryNote note={operationalNote} /> : null}

      {timeline.length > 0 ? (
        <div className="rounded-[14px] border border-border bg-background/60 px-4 py-4">
          <ol className="m-0 list-none p-0">
            {timeline.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={index === timeline.length - 1}
                currentStatus={pkg.status}
              />
            ))}
          </ol>
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-border px-4 py-8 text-center">
          <History className="mx-auto h-8 w-8 text-text-muted/60" />
          <p className="mt-2 text-sm font-medium text-text-secondary">Sin movimientos registrados</p>
          <p className="mt-1 text-xs text-text-muted">
            Acá vas a ver entregas, intentos fallidos y reprogramaciones.
          </p>
        </div>
      )}
    </section>
  )
}
