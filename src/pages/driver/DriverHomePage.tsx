import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DriverDeliveriesEmpty,
  DriverDeliveriesFilteredEmpty,
} from '@/components/common/list-empty-states'
import { sumCashToCollect } from '@/components/common/PackagePaymentInfo'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DELIVERY_CHANNEL_LABELS } from '@/constants/labels'
import { useAuth } from '@/contexts/AuthContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDeliveryDayGuard } from '@/hooks/useDeliveryDayGuard'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { packagesService } from '@/services/packages.service'
import type { Delivery, DeliveryStatus, Package } from '@/types'
import { formatDeliveryDateDisplay, isDeliveryScheduledForToday } from '@/utils/date'
import { formatArs } from '@/utils/money'
import { cn } from '@/utils/cn'

type StatusFilter = 'all' | DeliveryStatus

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'in_progress', label: 'En curso' },
  { id: 'prepared', label: 'Preparados' },
  { id: 'draft', label: 'Borradores' },
  { id: 'completed', label: 'Completados' },
]

const STATUS_SORT: Record<DeliveryStatus, number> = {
  in_progress: 0,
  prepared: 1,
  draft: 2,
  completed: 3,
  cancelled: 4,
}

export default function DriverHomePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const driverId = session?.driverId ?? ''
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [startingId, setStartingId] = useState<string | null>(null)
  const { guardDeliveryDayAction, deliveryDayGuardDialog } = useDeliveryDayGuard()

  const { data, loading, reload } = useAsyncData(async () => {
    if (!driverId) return { deliveries: [], couriers: [], packages: [] }
    const [deliveries, couriers, packages] = await Promise.all([
      deliveriesService.getByDriver(driverId),
      couriersService.getAll(),
      packagesService.getAll(),
    ])
    return { deliveries, couriers, packages }
  }, [driverId])

  const deliveries = data?.deliveries ?? []
  const packageById = new Map((data?.packages ?? []).map((pkg) => [pkg.id, pkg]))
  const courierById = new Map((data?.couriers ?? []).map((courier) => [courier.id, courier]))

  const visibleDeliveries = useMemo(() => {
    const filtered =
      statusFilter === 'all'
        ? deliveries
        : deliveries.filter((delivery) => delivery.status === statusFilter)

    return [...filtered].sort((a, b) => {
      const byStatus = STATUS_SORT[a.status] - STATUS_SORT[b.status]
      if (byStatus !== 0) return byStatus
      return b.date.localeCompare(a.date) || b.code.localeCompare(a.code)
    })
  }, [deliveries, statusFilter])

  const startDelivery = async (delivery: Delivery) => {
    setStartingId(delivery.id)
    try {
      const confirmed = await guardDeliveryDayAction(delivery.date, async () => {
        await deliveriesService.setStatus(delivery.id, 'in_progress')
        toast.success(`Reparto ${delivery.code} iniciado`)
        reload()
        navigate(`/driver/deliveries/${delivery.id}`)
      })
      if (!confirmed) return
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar el reparto')
    } finally {
      setStartingId(null)
    }
  }

  if (loading) return <PageLoader label="Cargando repartos…" />

  const activeFilter = STATUS_FILTERS.find((item) => item.id === statusFilter)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Mis repartos</h1>
        <p className="text-sm text-text-secondary">
          Los repartos en curso aparecen primero. Filtrá por estado o iniciá uno preparado.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setStatusFilter(filter.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              statusFilter === filter.id
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-surface text-text-secondary hover:border-primary/30 hover:text-text-primary',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {deliveries.length === 0 ? (
        <DriverDeliveriesEmpty />
      ) : visibleDeliveries.length === 0 ? (
        <DriverDeliveriesFilteredEmpty label={activeFilter?.label.toLowerCase() ?? 'con ese filtro'} />
      ) : (
        <div className="space-y-3">
          {visibleDeliveries.map((delivery) => {
            const progress = deliveriesService.getProgress(delivery)
            const courier =
              delivery.channel === 'courier' && delivery.courierId
                ? courierById.get(delivery.courierId)
                : undefined
            const pkgs = delivery.stops
              .map((stop) => packageById.get(stop.packageId))
              .filter((pkg): pkg is Package => Boolean(pkg))
            const toCollect = sumCashToCollect(pkgs)
            const isToday = isDeliveryScheduledForToday(delivery.date)
            const canStart = delivery.status === 'prepared' || delivery.status === 'draft'
            const canContinue =
              delivery.status === 'in_progress' || delivery.status === 'prepared'

            return (
              <Card key={delivery.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {delivery.status === 'in_progress' ? (
                        <LiveIndicator title="Reparto en curso" />
                      ) : null}
                      <p className="font-semibold text-text-primary">{delivery.code}</p>
                    </div>
                    <p className="text-sm text-text-secondary">{formatDeliveryDateDisplay(delivery.date)}</p>
                    <p className="text-sm text-text-muted">
                      {courier
                        ? `Correo · ${courier.name}`
                        : DELIVERY_CHANNEL_LABELS[delivery.channel]}
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                      {progress.pending} pendientes · {progress.delivered} entregados
                      {progress.notDelivered > 0 ? ` · ${progress.notDelivered} no entregados` : ''}
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${toCollect > 0 ? 'text-warning' : 'text-success'}`}
                    >
                      {toCollect > 0 ? `Cobrar ${formatArs(toCollect)}` : 'Sin cobro'}
                    </p>
                  </div>
                  <StatusBadge status={delivery.status} type="delivery" />
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary-light">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>

                {canStart && !isToday ? (
                  <Alert tone="warning" className="mt-3">
                    Este reparto es del {formatDeliveryDateDisplay(delivery.date)}. Podés verlo, pero solo
                    iniciarlo ese día.
                  </Alert>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {canStart ? (
                    <Button
                      loading={startingId === delivery.id}
                      disabled={!isToday}
                      onClick={() => void startDelivery(delivery)}
                    >
                      <LiveIndicator tone="inverse" title="Iniciar reparto en vivo" />
                      Iniciar reparto
                    </Button>
                  ) : null}
                  {canContinue ? (
                    <Button
                      variant={canStart ? 'outline' : 'primary'}
                      onClick={() => navigate(`/driver/deliveries/${delivery.id}`)}
                    >
                      {delivery.status === 'in_progress' ? (
                        <>
                          <LiveIndicator tone={canStart ? 'primary' : 'inverse'} title="Reparto en curso" />
                          Continuar entregas
                        </>
                      ) : (
                        'Ver reparto'
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => navigate(`/driver/deliveries/${delivery.id}`)}>
                      Ver detalle
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {deliveryDayGuardDialog}
    </div>
  )
}
