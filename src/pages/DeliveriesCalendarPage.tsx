import { ExternalLink, Pencil, Route } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DriverBadge } from '@/components/common/DriverBadge'
import { PackageShCodeButton } from '@/components/common/PackageShCodeButton'
import { BackLink } from '@/components/common/BackLink'
import {
  DeliveryCalendar,
  groupDeliveriesByDate,
} from '@/components/deliveries/DeliveryCalendar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  DELIVERY_CHANNEL_LABELS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_ZONE_LABELS,
} from '@/constants/labels'
import { useAsyncData } from '@/hooks/useAsyncData'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { Delivery } from '@/types'
import { formatDeliveryDateDisplay, toISODate, todayISODate } from '@/utils/date'
import { canEditDelivery } from '@/utils/delivery-report-export'
import { cn } from '@/utils/cn'

function parseMonthFromParam(value: string | null): Date {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return new Date()
  return new Date(`${value}-01T12:00:00`)
}

export default function DeliveriesCalendarPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [month, setMonth] = useState(() => parseMonthFromParam(searchParams.get('month')))
  const [selectedDate, setSelectedDate] = useState<string | null>(
    () => searchParams.get('date') ?? todayISODate(),
  )
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(
    () => searchParams.get('delivery'),
  )
  const [showCancelled, setShowCancelled] = useState(false)

  const { data, loading } = useAsyncData(async () => {
    const [deliveries, packages, drivers, vehicles, couriers] = await Promise.all([
      deliveriesService.getAll(),
      packagesService.getAll(),
      driversService.getAll(),
      vehiclesService.getAll(),
      couriersService.getAll(),
    ])
    return { deliveries, packages, drivers, vehicles, couriers }
  })

  const deliveriesByDate = useMemo(
    () => groupDeliveriesByDate(data?.deliveries ?? [], showCancelled),
    [data?.deliveries, showCancelled],
  )

  const selectedDayDeliveries = selectedDate ? (deliveriesByDate.get(selectedDate) ?? []) : []

  const selectedDelivery = useMemo(() => {
    if (!selectedDeliveryId) return selectedDayDeliveries[0] ?? null
    return (
      selectedDayDeliveries.find((delivery) => delivery.id === selectedDeliveryId) ??
      data?.deliveries.find((delivery) => delivery.id === selectedDeliveryId) ??
      null
    )
  }, [selectedDeliveryId, selectedDayDeliveries, data?.deliveries])

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('month', toISODate(month).slice(0, 7))
    if (selectedDate) params.set('date', selectedDate)
    if (selectedDeliveryId) params.set('delivery', selectedDeliveryId)
    setSearchParams(params, { replace: true })
  }, [month, selectedDate, selectedDeliveryId, setSearchParams])

  useEffect(() => {
    if (!selectedDate) return
    if (selectedDayDeliveries.length === 0) {
      setSelectedDeliveryId(null)
      return
    }
    if (!selectedDeliveryId || !selectedDayDeliveries.some((d) => d.id === selectedDeliveryId)) {
      setSelectedDeliveryId(selectedDayDeliveries[0]?.id ?? null)
    }
  }, [selectedDate, selectedDayDeliveries, selectedDeliveryId])

  const driverById = useMemo(
    () => new Map((data?.drivers ?? []).map((driver) => [driver.id, driver])),
    [data?.drivers],
  )
  const vehicleById = useMemo(
    () => new Map((data?.vehicles ?? []).map((vehicle) => [vehicle.id, vehicle])),
    [data?.vehicles],
  )
  const courierById = useMemo(
    () => new Map((data?.couriers ?? []).map((courier) => [courier.id, courier])),
    [data?.couriers],
  )
  const packageById = useMemo(
    () => new Map((data?.packages ?? []).map((pkg) => [pkg.id, pkg])),
    [data?.packages],
  )

  const handleSelectDate = (isoDate: string) => {
    setSelectedDate(isoDate)
    setSelectedDeliveryId(null)
  }

  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDeliveryId(delivery.id)
  }

  if (loading) return <PageLoader label="Cargando calendario…" />

  const detailDriver = selectedDelivery ? driverById.get(selectedDelivery.driverId) : undefined
  const detailVehicle = selectedDelivery ? vehicleById.get(selectedDelivery.vehicleId) : undefined
  const detailCourier =
    selectedDelivery?.courierId ? courierById.get(selectedDelivery.courierId) : undefined

  const deliveredCount =
    selectedDelivery?.stops.filter((stop) => stop.status === 'delivered').length ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BackLink to="/deliveries" label="Volver a la tabla de repartos" />
          <h1 className="mt-2 text-2xl font-bold">Calendario de repartos</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Todos los repartos armados por fecha. Elegí uno para ver el detalle o ir a la página completa.
          </p>
        </div>
        <Link
          to={selectedDate ? `/deliveries/new?date=${selectedDate}` : '/deliveries/new'}
          className="inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
        >
          Crear reparto
        </Link>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={showCancelled}
          onChange={(event) => setShowCancelled(event.target.checked)}
        />
        Mostrar repartos cancelados
      </label>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_600px]">
        <DeliveryCalendar
          month={month}
          deliveriesByDate={deliveriesByDate}
          selectedDate={selectedDate}
          onMonthChange={setMonth}
          onSelectDate={handleSelectDate}
          onSelectDelivery={handleSelectDelivery}
        />

        <div className="space-y-4">
          <Card title={selectedDate ? formatDeliveryDateDisplay(selectedDate) : 'Seleccioná un día'}>
            {selectedDate && selectedDayDeliveries.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-text-secondary">No hay repartos para este día.</p>
                <Link
                  to={`/deliveries/new?date=${selectedDate}`}
                  className="inline-flex h-9 items-center rounded-[10px] bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  Crear reparto para este día
                </Link>
              </div>
            ) : null}

            {selectedDayDeliveries.length > 0 ? (
              <ul className="space-y-2">
                {selectedDayDeliveries.map((delivery) => {
                  const driver = driverById.get(delivery.driverId)
                  const isActive = selectedDelivery?.id === delivery.id
                  return (
                    <li key={delivery.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectDelivery(delivery)}
                        className={cn(
                          'w-full rounded-[10px] border px-3 py-2.5 text-left transition-colors',
                          isActive
                            ? 'border-primary bg-primary-light/40'
                            : 'border-border hover:border-primary/30 hover:bg-background',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-mono text-sm font-semibold text-primary">{delivery.code}</p>
                            <p className="mt-0.5 text-xs text-text-secondary">
                              {driver?.name ?? 'Sin chofer'} · {delivery.stops.length} SH
                            </p>
                          </div>
                          <StatusBadge status={delivery.status} type="delivery" />
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </Card>

          {selectedDelivery ? (
            <Card title="Detalle del reparto">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xl font-bold text-text-primary">{selectedDelivery.code}</p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {formatDeliveryDateDisplay(selectedDelivery.date)}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {DELIVERY_ZONE_LABELS[selectedDelivery.zone]}
                    </p>
                  </div>
                  <StatusBadge status={selectedDelivery.status} type="delivery" />
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Chofer</p>
                    <DriverBadge
                      name={detailDriver?.name}
                      active={selectedDelivery.status === 'in_progress'}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Vehículo</p>
                    <p className="mt-1 text-text-primary">
                      {detailVehicle ? `${detailVehicle.name} (${detailVehicle.plate})` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Tipo</p>
                    <p className="mt-1 text-text-primary">
                      {selectedDelivery.channel === 'courier'
                        ? detailCourier
                          ? `Correo · ${detailCourier.name}`
                          : 'Entrega a correo'
                        : DELIVERY_CHANNEL_LABELS.last_mile}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">Progreso</p>
                    <p className="mt-1 text-text-primary">
                      {deliveredCount}/{selectedDelivery.stops.length} entregados ·{' '}
                      {DELIVERY_STATUS_LABELS[selectedDelivery.status]}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
                    Paquetes ({selectedDelivery.stops.length})
                  </p>
                  <ul className="max-h-56 space-y-1 overflow-auto rounded-[10px] border border-border bg-background p-2">
                    {selectedDelivery.stops.map((stop) => {
                      const pkg = packageById.get(stop.packageId)
                      return (
                        <li key={stop.packageId} className="flex items-center justify-between gap-2 text-xs">
                          <PackageShCodeButton pkg={pkg} packageId={stop.packageId} />
                          <StatusBadge status={stop.status} type="stop" />
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button className="flex-1" onClick={() => navigate(`/deliveries/${selectedDelivery.id}`)}>
                    <ExternalLink className="h-4 w-4" />
                    Ver reparto
                  </Button>
                  {canEditDelivery(selectedDelivery) ? (
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/deliveries/${selectedDelivery.id}/edit`)}
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : selectedDate ? (
            <Card>
              <div className="flex flex-col items-center py-6 text-center text-sm text-text-secondary">
                <Route className="mb-2 h-8 w-8 text-text-muted/50" />
                Elegí un reparto del día para ver el detalle.
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
