import { CheckCircle2, Navigation, Navigation2, PackageX, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BackLink } from '@/components/common/BackLink'
import { DestinationBadge } from '@/components/common/DestinationBadge'
import { DeliveryZoneBadge } from '@/components/common/DeliveryZoneBadge'
import { DriverBadge } from '@/components/common/DriverBadge'
import { DeliveryStopAdminActions } from '@/components/deliveries/DeliveryStopAdminActions'
import { FailureObservationFields } from '@/components/deliveries/FailureObservationFields'
import { DownloadDeliveryReportButton } from '@/components/deliveries/DownloadDeliveryReportButton'
import { PackagePaymentInfo, sumCashToCollect } from '@/components/common/PackagePaymentInfo'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { DriverPaymentConfirmModal } from '@/components/driver/DriverPaymentConfirmModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/PageLoader'
import { LiveBadge, LiveIndicator } from '@/components/ui/LiveIndicator'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DateField } from '@/components/ui/DateField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DELIVERY_CHANNEL_LABELS, PACKAGE_STATUS_LABELS } from '@/constants/labels'
import { DRIVER_DEFAULT_FAILURE_REASON_ID } from '@/constants/driver-observations'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useDeliveryDayGuard } from '@/hooks/useDeliveryDayGuard'
import { couriersService } from '@/services/couriers.service'
import { deliveriesService } from '@/services/deliveries.service'
import { driversService } from '@/services/drivers.service'
import { packagesService } from '@/services/packages.service'
import { settingsService } from '@/services/settings.service'
import { vehiclesService } from '@/services/vehicles.service'
import type { DeliveryStop, Package, PaymentStatus } from '@/types'
import { addDaysISODate, formatDate, formatDateTime, formatDeliveryDateDisplay, isDeliveryScheduledForToday } from '@/utils/date'
import { formatStopAddress, formatPackageAddress, hasAlternateDeliveryAddress } from '@/utils/delivery-address'
import { formatArs } from '@/utils/money'
import { buildGoogleMapsRouteUrl, buildGoogleMapsUrl, formatFullAddress } from '@/utils/maps'
import { canDownloadDeliveryReport, canEditDelivery } from '@/utils/delivery-report-export'
import { cn } from '@/utils/cn'
import {
  driverDeliveryPaymentOptions,
  needsPaymentConfirmOnDelivery,
} from '@/utils/payment-rules'

function defaultDeliveryPayment(status: PaymentStatus): PaymentStatus {
  if (status === 'cash' || status === 'pending') return 'paid'
  return status
}

export default function DeliveryDetailPage() {
  const { id = '' } = useParams()
  const [code, setCode] = useState('')
  const [cancel, setCancel] = useState(false)
  const [rescheduleStop, setRescheduleStop] = useState<DeliveryStop | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState(addDaysISODate(1))
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [addSearch, setAddSearch] = useState('')
  const [markDeliveredStop, setMarkDeliveredStop] = useState<DeliveryStop | null>(null)
  const [markFailedStop, setMarkFailedStop] = useState<DeliveryStop | null>(null)
  const [resetStopTarget, setResetStopTarget] = useState<DeliveryStop | null>(null)
  const [deliveredConfirmOpen, setDeliveredConfirmOpen] = useState(false)
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false)
  const [confirmPayment, setConfirmPayment] = useState<PaymentStatus>('paid')
  const [failureNotes, setFailureNotes] = useState('')
  const { guardDeliveryDayAction, deliveryDayGuardDialog, isGuardOpen } = useDeliveryDayGuard()
  const { data, reload, loading } = useAsyncData(async () => {
    const [delivery, packages, couriers, drivers, reasons, vehicles] = await Promise.all([
      deliveriesService.getById(id),
      packagesService.getAll(),
      couriersService.getAll(),
      driversService.getAll(),
      settingsService.getFailureReasons(),
      vehiclesService.getAll(),
    ])
    return { delivery, packages, couriers, drivers, reasons, vehicles }
  }, [id])

  const packageById = useMemo(
    () => new Map((data?.packages ?? []).map((item) => [item.id, item])),
    [data?.packages],
  )

  const availableToAdd = useMemo(() => {
    if (!data?.delivery) return []
    const stopIds = data.delivery.stops.map((stop) => stop.packageId)
    const query = addSearch.trim().toLowerCase()
    return packagesService.listAvailableForDelivery(data.delivery.id, stopIds).filter((item) => {
      if (!query) return true
      return (
        item.shCode.toLowerCase().includes(query) ||
        item.ownerName.toLowerCase().includes(query) ||
        item.city.toLowerCase().includes(query) ||
        formatFullAddress(item).toLowerCase().includes(query)
      )
    })
  }, [data, addSearch])

  if (loading) return <PageLoader label="Cargando reparto…" />
  if (!data?.delivery) {
    return (
      <div className="space-y-3">
        <BackLink to="/deliveries" label="Volver a repartos" />
        <p>Reparto no encontrado.</p>
      </div>
    )
  }

  const { delivery } = data
  const reasonById = new Map((data.reasons ?? []).map((item) => [item.id, item]))
  const driver = data.drivers.find((item) => item.id === delivery.driverId)
  const courier =
    delivery.channel === 'courier' && delivery.courierId
      ? data.couriers.find((item) => item.id === delivery.courierId)
      : undefined
  const courierAddress = courier ? formatFullAddress(courier) : ''
  const isCourier = delivery.channel === 'courier'
  const progress = deliveriesService.getProgress(delivery)
  const orderedStops = delivery.stops.slice().sort((a, b) => a.order - b.order)
  const nextStop = orderedStops.find((stop) => stop.status === 'pending') ?? null
  const nextPkg = nextStop ? packageById.get(nextStop.packageId) : undefined
  const isLive = delivery.status === 'in_progress'
  const deliveredCount = orderedStops.filter((stop) => stop.status === 'delivered').length
  const deliveryPkgs = orderedStops
    .map((stop) => packageById.get(stop.packageId))
    .filter((pkg): pkg is Package => Boolean(pkg))
  const cashToCollect = sumCashToCollect(deliveryPkgs)
  const vehicle = data.vehicles.find((item) => item.id === delivery.vehicleId)
  const failureReasonLabels = new Map((data.reasons ?? []).map((item) => [item.id, item.label]))
  const reportContext = {
    delivery,
    packagesById: packageById,
    driver,
    courier,
    vehicle,
    failureReasons: failureReasonLabels,
  }

  const allAddresses = orderedStops
    .map((stop) => {
      const pkg = packageById.get(stop.packageId)
      return pkg ? formatStopAddress(pkg, stop) : null
    })
    .filter((address): address is string => Boolean(address))

  const pendingAddresses = orderedStops
    .filter((stop) => stop.status === 'pending')
    .map((stop) => {
      const pkg = packageById.get(stop.packageId)
      return pkg ? formatStopAddress(pkg, stop) : null
    })
    .filter((address): address is string => Boolean(address))

  const routeAddresses = pendingAddresses.length > 0 ? pendingAddresses : allAddresses

  const openBestRoute = () => {
    if (isCourier) {
      if (!courierAddress) {
        toast.error('El correo no tiene dirección configurada')
        return
      }
      window.open(buildGoogleMapsUrl(courierAddress), '_blank', 'noopener,noreferrer')
      return
    }
    if (routeAddresses.length === 0) {
      toast.error('No hay direcciones para armar la ruta')
      return
    }
    window.open(
      buildGoogleMapsRouteUrl(routeAddresses),
      '_blank',
      'noopener,noreferrer',
    )
  }

  const setStatus = async (status: 'in_progress' | 'completed') => {
    try {
      await deliveriesService.setStatus(delivery.id, status)
      toast.success('Estado actualizado')
      reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el estado')
    }
  }

  const openReschedule = (stop: DeliveryStop) => {
    setRescheduleStop(stop)
    setRescheduleDate(addDaysISODate(1))
    setRescheduleNotes('')
  }

  const confirmReschedule = async () => {
    if (!rescheduleStop) return
    if (!rescheduleNotes.trim()) {
      toast.error('Seleccioná o escribí una observación')
      return
    }
    guardDeliveryDayAction(delivery.date, async () => {
      try {
        await deliveriesService.rescheduleStop(delivery.id, rescheduleStop.packageId, {
          failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
          failureNotes: rescheduleNotes.trim(),
          dateISO: rescheduleDate,
        })
        toast.success(`Reprogramado para ${formatDeliveryDateDisplay(rescheduleDate)}`)
        setRescheduleStop(null)
        reload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo reprogramar')
      }
    })
  }

  const rescheduleTomorrow = async (stop: DeliveryStop) => {
    guardDeliveryDayAction(delivery.date, async () => {
      try {
        await deliveriesService.rescheduleStop(delivery.id, stop.packageId, {
          failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
          failureNotes: 'Cliente pide entrega mañana',
          dateISO: addDaysISODate(1),
        })
        toast.success(`Reprogramado para ${formatDeliveryDateDisplay(addDaysISODate(1))}`)
        reload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo reprogramar')
      }
    })
  }

  const canEditStops =
    delivery.status === 'draft' ||
    delivery.status === 'prepared' ||
    delivery.status === 'in_progress'

  const paymentOptions = driverDeliveryPaymentOptions(delivery.channel)
  const markDeliveredPkg = markDeliveredStop
    ? packageById.get(markDeliveredStop.packageId)
    : undefined

  const openMarkDelivered = (stop: DeliveryStop) => {
    const pkg = packageById.get(stop.packageId)
    setMarkDeliveredStop(stop)
    if (pkg && needsPaymentConfirmOnDelivery(pkg.paymentStatus)) {
      setConfirmPayment(defaultDeliveryPayment(pkg.paymentStatus))
      setPaymentConfirmOpen(true)
      return
    }
    setDeliveredConfirmOpen(true)
  }

  const confirmMarkDelivered = async (paymentStatus?: PaymentStatus) => {
    if (!markDeliveredStop) return

    const restoreDeliveredModal = {
      payment: paymentConfirmOpen,
      delivered: deliveredConfirmOpen,
    }

    try {
      const confirmed = await guardDeliveryDayAction(
        delivery.date,
        async () => {
          try {
            await deliveriesService.markStop(delivery.id, markDeliveredStop.packageId, 'delivered', {
              paymentStatus,
            })
            toast.success(`Paquete marcado como entregado · ${formatDateTime(new Date().toISOString())}`)
            reload()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo marcar como entregado')
            throw error
          }
        },
        {
          whileGuard: {
            suspend: () => {
              setPaymentConfirmOpen(false)
              setDeliveredConfirmOpen(false)
            },
            restore: () => {
              if (restoreDeliveredModal.payment) setPaymentConfirmOpen(true)
              if (restoreDeliveredModal.delivered) setDeliveredConfirmOpen(true)
            },
          },
        },
      )
      if (!confirmed) return
      setMarkDeliveredStop(null)
    } catch (error) {
      if (restoreDeliveredModal.payment) setPaymentConfirmOpen(true)
      if (restoreDeliveredModal.delivered) setDeliveredConfirmOpen(true)
      toast.error(error instanceof Error ? error.message : 'No se pudo marcar como entregado')
    }
  }

  const openMarkFailed = (stop: DeliveryStop) => {
    setMarkFailedStop(stop)
    setFailureNotes('')
  }

  const confirmMarkFailed = async () => {
    if (!markFailedStop) return
    if (!failureNotes.trim()) {
      toast.error('Seleccioná o escribí una observación')
      return
    }
    try {
      const confirmed = await guardDeliveryDayAction(delivery.date, async () => {
        try {
          await deliveriesService.markStop(delivery.id, markFailedStop.packageId, 'not_delivered', {
            failureReasonId: DRIVER_DEFAULT_FAILURE_REASON_ID,
            failureNotes: failureNotes.trim(),
          })
          toast.success(`Paquete marcado como no entregado · ${formatDateTime(new Date().toISOString())}`)
          reload()
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
          throw error
        }
      })
      if (!confirmed) return
      setMarkFailedStop(null)
      setFailureNotes('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
    }
  }

  const confirmResetStop = async () => {
    if (!resetStopTarget) return
    const confirmed = await guardDeliveryDayAction(delivery.date, async () => {
      try {
        await deliveriesService.resetStopToPending(delivery.id, resetStopTarget.packageId)
        toast.success('Parada revertida a pendiente')
        reload()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo revertir')
        throw error
      }
    })
    if (!confirmed) return
    setResetStopTarget(null)
  }

  const canStartDelivery =
    delivery.status !== 'in_progress' &&
    delivery.status !== 'completed' &&
    delivery.status !== 'cancelled'
  const isDeliveryToday = isDeliveryScheduledForToday(delivery.date)

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <BackLink to="/deliveries" label="Volver a la tabla de repartos" />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {isLive ? <LiveIndicator size="md" title="Repartiendo en vivo" /> : null}
            <h1 className="text-2xl font-bold">{delivery.code}</h1>
            {isLive ? <LiveBadge /> : <StatusBadge status={delivery.status} type="delivery" />}
          </div>
          <p className="mt-2 text-sm font-semibold text-primary">
            Fecha del reparto: {formatDeliveryDateDisplay(delivery.date)}
          </p>

          <div
            className={cn(
              'mt-3 flex flex-col gap-2 rounded-[12px] border px-3 py-2.5 shadow-[var(--shadow-card)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:px-4',
              isLive
                ? 'border-primary/30 bg-primary-light/20 ring-1 ring-primary/15'
                : 'border-border bg-surface',
            )}
          >
            <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              {isLive ? 'Repartiendo ahora' : isCourier ? 'Chofer asignado' : 'Entrega a cargo de'}
            </p>
            <DriverBadge
              name={driver?.name}
              active={isLive}
              className="max-w-none shrink-0 text-sm"
            />
            {driver?.phone ? (
              <a
                href={`tel:${driver.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {driver.phone}
              </a>
            ) : null}
          </div>

          <p className="mt-3 text-sm font-medium text-primary">
            <DeliveryZoneBadge zone={delivery.zone} />
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {DELIVERY_CHANNEL_LABELS[delivery.channel]}
            {courier ? ` · ${courier.name} (${courier.branchName})` : null}
            {' · '}
            {progress.delivered + progress.notDelivered}/{progress.total} resueltas ({progress.percent}
            %)
            {cashToCollect > 0
              ? ` · Cobrar ${formatArs(cashToCollect)}`
              : ' · Sin cobro pendiente'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canDownloadDeliveryReport(delivery) ? (
            <DownloadDeliveryReportButton context={reportContext} />
          ) : null}
          <Button onClick={openBestRoute}>
            <Navigation className="h-4 w-4" />
            {isCourier ? 'Ir a la sucursal' : 'Ruta Maps'}
          </Button>
          {canEditDelivery(delivery) ? (
            <Link
              to={`/deliveries/${id}/edit`}
              className="inline-flex h-10 items-center rounded-[10px] border border-border bg-surface px-4 text-sm font-semibold shadow-sm hover:border-primary hover:bg-primary-light hover:text-primary-hover"
            >
              Editar
            </Link>
          ) : null}
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isLive ? <LiveIndicator title="Ruta en curso" /> : null}
              <h3 className="text-base font-semibold text-text-primary">
                {isCourier ? `Paquetes · Ruta del reparto (${orderedStops.length})` : `Paradas · Ruta del reparto (${orderedStops.length})`}
              </h3>
              {isLive ? (
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-hover">
                  En vivo
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {isCourier && courier
                ? `${courier.name} · ${courier.branchName}`
                : `Mercado Central → ${routeAddresses.length} parada${routeAddresses.length === 1 ? '' : 's'}${pendingAddresses.length > 0 ? ' pendientes' : ''} → Mercado Central`}
            </p>
            {isLive ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-success-light px-2.5 py-1 font-semibold text-success">
                  {deliveredCount} entregado{deliveredCount === 1 ? '' : 's'}
                </span>
                {nextStop ? (
                  <span className="rounded-full bg-warning px-2.5 py-1 font-semibold text-white">
                    Próximo: {packageById.get(nextStop.packageId)?.shCode ?? `#${nextStop.order}`}
                  </span>
                ) : (
                  <span className="rounded-full bg-success-light px-2.5 py-1 font-semibold text-success">
                    Ruta completada
                  </span>
                )}
              </div>
            ) : canEditStops ? (
              <p className="mt-2 text-xs text-text-muted">
                Marcá entregas o incidencias en cada paquete. No hace falta iniciar el reparto para
                registrar una entrega.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <div className="flex w-full items-center gap-3 sm:w-48">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary-light">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="shrink-0 text-sm font-semibold">{progress.percent}%</span>
            </div>
            <Button size="sm" variant="outline" onClick={openBestRoute}>
              <Navigation className="h-4 w-4" />
              {isCourier ? 'Sucursal en Maps' : 'Ruta Maps'}
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border rounded-[10px] border border-border">
          {orderedStops.map((stop) => {
            const pkg = packageById.get(stop.packageId)
            const address = isCourier ? courierAddress : pkg ? formatStopAddress(pkg, stop) : ''
            const defaultAddress = pkg ? formatPackageAddress(pkg) : ''
            const alternateAddress = pkg && hasAlternateDeliveryAddress(pkg, stop)
            const isNext = nextStop?.packageId === stop.packageId
            const isDelivered = stop.status === 'delivered'
            const isFailed = stop.status === 'not_delivered'
            return (
              <div
                key={stop.packageId}
                className={cn(
                  'flex flex-col gap-3 p-3 sm:p-4',
                  isNext && 'bg-warning-light/70 ring-2 ring-warning/20',
                  isDelivered && !isNext && 'bg-success-light/45',
                  isFailed && 'bg-danger-light/15',
                )}
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isDelivered && 'bg-success text-white',
                      isFailed && 'bg-danger text-white',
                      isNext && 'bg-warning text-white',
                      !isDelivered && !isFailed && !isNext && 'bg-secondary-light text-secondary',
                    )}
                  >
                    {isDelivered ? <CheckCircle2 className="h-4 w-4" /> : stop.order}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          'font-mono text-sm font-semibold tracking-wide',
                          isDelivered && 'text-success',
                          isNext && 'text-warning',
                        )}
                      >
                        {pkg?.shCode ?? stop.packageId}
                      </p>
                      {pkg && !isCourier ? (
                        <DestinationBadge destination={pkg.destinationType} />
                      ) : null}
                      {isNext ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                          <Navigation2 className="h-3 w-3" />
                          Próximo destino
                        </span>
                      ) : null}
                      {isDelivered ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success uppercase">
                          Entregado
                        </span>
                      ) : !isNext ? (
                        <StatusBadge status={stop.status} type="stop" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-text-primary">
                      {pkg?.ownerName ?? '—'}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-text-secondary" title={address || undefined}>
                      {isCourier && courier
                        ? `Entregar en ${courier.name}`
                        : address || 'Sin dirección'}
                    </p>
                    {alternateAddress && pkg ? (
                      <div className="mt-1 space-y-1">
                        <Badge tone="warning">Entrega alternativa</Badge>
                        <p className="text-xs text-text-muted line-through">{defaultAddress}</p>
                      </div>
                    ) : null}
                    {pkg ? <PackagePaymentInfo pkg={pkg} compact className="mt-1.5" /> : null}
                    {isDelivered && stop.attemptedAt ? (
                      <p className="mt-1.5 text-xs font-medium text-success">
                        Entregado: {formatDateTime(stop.attemptedAt)}
                      </p>
                    ) : null}
                    {isFailed && pkg ? (
                      <div className="mt-2 rounded-[10px] border border-danger/25 bg-danger-light/50 px-3 py-2 text-sm">
                        <p className="flex items-start gap-1.5 font-semibold text-danger">
                          <PackageX className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            {pkg.failureNotes
                              ? pkg.failureNotes
                              : reasonById.get(pkg.failureReasonId ?? '')?.label ?? 'Sin detalle registrado'}
                          </span>
                        </p>
                        {stop.attemptedAt ? (
                          <p className="mt-1 text-xs text-text-muted">
                            Registrado: {formatDateTime(stop.attemptedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <DeliveryStopAdminActions
                  stop={stop}
                  canEdit={canEditStops}
                  hasAddress={Boolean(address)}
                  onMaps={() =>
                    window.open(buildGoogleMapsUrl(address), '_blank', 'noopener,noreferrer')
                  }
                  onMarkDelivered={() => openMarkDelivered(stop)}
                  onMarkFailed={() => openMarkFailed(stop)}
                  onRescheduleTomorrow={() => void rescheduleTomorrow(stop)}
                  onReschedule={() => openReschedule(stop)}
                  onResetPending={() => setResetStopTarget(stop)}
                  onRemove={async () => {
                    await deliveriesService.removePackage(delivery.id, stop.packageId)
                    reload()
                  }}
                />
              </div>
            )
          })}
        </div>

        {nextStop ? (
          <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-warning/30 bg-warning-light px-3 py-2.5 text-sm text-warning">
            <Navigation2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {isCourier ? 'Próximo paquete en sucursal:' : 'Próximo destino del chofer:'}{' '}
              <strong className="text-text-primary">
                {nextPkg?.shCode ?? `parada ${nextStop.order}`}
              </strong>
              {!isCourier && nextPkg ? (
                <span className="mt-0.5 block text-xs font-normal text-text-secondary">
                  {formatFullAddress(nextPkg)}
                </span>
              ) : null}
            </span>
          </div>
        ) : orderedStops.length > 0 ? (
          <div className="mt-4 flex items-center gap-2 rounded-[10px] border border-success/20 bg-success-light px-3 py-2.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {isCourier
              ? 'Todos los paquetes fueron entregados en el correo'
              : 'Todas las paradas del recorrido fueron resueltas'}
          </div>
        ) : null}
      </Card>

      {canEditStops ? (
        <Card title={`Agregar paquete · ${formatDeliveryDateDisplay(delivery.date)}`}>
          <p className="mb-3 text-sm text-text-secondary">
            Solo paquetes disponibles (pendientes, reprogramados o no entregados).
          </p>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={code}
              placeholder="SH, titular o dirección"
              onChange={(event) => setCode(event.target.value)}
            />
            <Button
              className="shrink-0"
              onClick={async () => {
                const pkg = await packagesService.findByCode(code)
                if (!pkg) return toast.error('Paquete no encontrado')
                try {
                  await deliveriesService.addPackage(delivery.id, pkg.id)
                  setCode('')
                  toast.success(
                    `SH agregado al reparto del ${formatDeliveryDateDisplay(delivery.date)}`,
                  )
                  reload()
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'No se pudo agregar')
                }
              }}
            >
              Agregar
            </Button>
          </div>

          <Input
            className="mb-2"
            value={addSearch}
            placeholder="Buscar SH, titular o dirección…"
            onChange={(event) => setAddSearch(event.target.value)}
          />
          <div className="max-h-56 overflow-auto rounded-[10px] border border-border">
            {availableToAdd.slice(0, 25).map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-primary-light/50"
                onClick={async () => {
                  try {
                    await deliveriesService.addPackage(delivery.id, item.id)
                    toast.success(`${item.shCode} agregado`)
                    reload()
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : 'No se pudo agregar')
                  }
                }}
              >
                <span className="min-w-0">
                  <span className="font-mono font-semibold">{item.shCode}</span>
                  <span className="text-sm text-text-secondary"> — {item.ownerName}</span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary" title={formatFullAddress(item)}>
                    {formatFullAddress(item)}
                  </span>
                </span>
                <span className="shrink-0 pt-0.5 text-xs text-text-muted">
                  {PACKAGE_STATUS_LABELS[item.status]}
                </span>
              </button>
            ))}
            {availableToAdd.length === 0 ? (
              <p className="p-3 text-sm text-text-secondary">No hay paquetes disponibles.</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {canStartDelivery && !isDeliveryToday ? (
        <Alert tone="warning" title="Todavía no es el día del reparto">
          Este reparto es del {formatDate(delivery.date)}. Solo podés iniciarlo ese día.
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canStartDelivery ? (
          <Button disabled={!isDeliveryToday} onClick={() => void setStatus('in_progress')}>
            Iniciar
          </Button>
        ) : null}
        {delivery.status === 'in_progress' ? (
          <Button onClick={() => void setStatus('completed')}>Completar</Button>
        ) : null}
        {delivery.status !== 'cancelled' && delivery.status !== 'completed' ? (
          <Button variant="danger" onClick={() => setCancel(true)}>
            Cancelar reparto
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={cancel}
        title="Cancelar reparto"
        description="Se liberarán los paquetes no entregados."
        tone="danger"
        onCancel={() => setCancel(false)}
        onConfirm={async () => {
          try {
            await deliveriesService.cancel(delivery.id)
            toast.success('Reparto cancelado')
            setCancel(false)
            reload()
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo cancelar')
          }
        }}
      />

      <Modal
        open={Boolean(rescheduleStop) && !isGuardOpen}
        onClose={() => setRescheduleStop(null)}
        title="Reprogramar paquete"
        description="El SH sale de este reparto y queda pendiente para la fecha elegida."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRescheduleStop(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmReschedule()}>Confirmar</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <DateField label="Nueva fecha" value={rescheduleDate} onChange={setRescheduleDate} />
          <FailureObservationFields
            value={rescheduleNotes}
            onChange={setRescheduleNotes}
            placeholder="Ej: cliente pide entrega mañana a la mañana"
          />
        </div>
      </Modal>

      <DriverPaymentConfirmModal
        open={paymentConfirmOpen && !isGuardOpen}
        onClose={() => {
          setPaymentConfirmOpen(false)
          setMarkDeliveredStop(null)
        }}
        pkg={markDeliveredPkg ?? null}
        isCourier={isCourier}
        options={paymentOptions}
        selectedPayment={confirmPayment}
        onSelectPayment={setConfirmPayment}
        onConfirm={() => void confirmMarkDelivered(confirmPayment)}
      />

      <ConfirmDialog
        open={deliveredConfirmOpen && !isGuardOpen}
        title="Marcar como entregado"
        description={
          markDeliveredPkg
            ? `¿Confirmás la entrega de ${markDeliveredPkg.shCode}? Reparto del ${formatDeliveryDateDisplay(delivery.date)}. Se registrará con la fecha y hora actual.`
            : `¿Confirmás la entrega de este paquete? Reparto del ${formatDeliveryDateDisplay(delivery.date)}.`
        }
        tone="primary"
        onCancel={() => {
          setDeliveredConfirmOpen(false)
          setMarkDeliveredStop(null)
        }}
        onConfirm={() => void confirmMarkDelivered(markDeliveredPkg?.paymentStatus)}
      />

      <Modal
        open={Boolean(markFailedStop) && !isGuardOpen}
        onClose={() => setMarkFailedStop(null)}
        title="Marcar como no entregado"
        description={
          markFailedStop
            ? `${packageById.get(markFailedStop.packageId)?.shCode ?? 'Paquete'} · elegí una observación rápida o escribí qué pasó.`
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMarkFailedStop(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void confirmMarkFailed()}>
              Confirmar
            </Button>
          </div>
        }
      >
        <FailureObservationFields value={failureNotes} onChange={setFailureNotes} />
      </Modal>

      <ConfirmDialog
        open={Boolean(resetStopTarget) && !isGuardOpen}
        title="Volver a pendiente"
        description={
          resetStopTarget
            ? `¿Revertir ${packageById.get(resetStopTarget.packageId)?.shCode ?? 'este paquete'} a pendiente en el reparto?`
            : '¿Revertir esta parada a pendiente?'
        }
        onCancel={() => setResetStopTarget(null)}
        onConfirm={() => void confirmResetStop()}
      />

      {deliveryDayGuardDialog}
    </div>
  )
}
