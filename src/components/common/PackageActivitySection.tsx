import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, History } from 'lucide-react'
import { PackageTimelineItem } from '@/components/packages/PackageTimelineItem'
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
import { buildPackageTimeline, getPackageDeliveredAt } from '@/utils/package-timeline'
import { cn } from '@/utils/cn'

interface PackageActivitySectionProps {
  pkg: Package
  className?: string
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
        <div className="flex items-start gap-3 rounded-[12px] border border-border bg-surface px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border">
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

      {timeline.length > 0 ? (
        <div className="rounded-[14px] border border-border bg-background/60 px-4 py-4">
          <ol className="m-0 list-none p-0">
            {timeline.map((event, index) => (
              <PackageTimelineItem
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
